import { randomUUID } from "node:crypto";
import type { IngestedDocument } from "../documents/types";
import { AppError } from "../utils/errors";
import {
  CHUNK_SEPARATORS,
  DEFAULT_CHUNK_OVERLAP,
  DEFAULT_CHUNK_SIZE,
  MAX_CHUNK_SIZE,
  MIN_CHUNK_SIZE,
} from "./constants";
import type { Chunk, ChunkConfig, ChunkedDocument } from "./types";
import { chunkedDocumentSchema } from "./types";

type TextRange = {
  startChar: number;
  endChar: number;
};

function validateChunkConfig(chunkSize: number, chunkOverlap: number): void {
  if (chunkSize < MIN_CHUNK_SIZE || chunkSize > MAX_CHUNK_SIZE) {
    throw new AppError(
      `Chunk size must be between ${MIN_CHUNK_SIZE} and ${MAX_CHUNK_SIZE} characters.`,
      400,
      "INVALID_CHUNK_SIZE",
    );
  }

  if (chunkOverlap < 0) {
    throw new AppError(
      "Chunk overlap must be zero or greater.",
      400,
      "INVALID_CHUNK_OVERLAP",
    );
  }

  if (chunkOverlap >= chunkSize) {
    throw new AppError(
      "Chunk overlap must be smaller than chunk size.",
      400,
      "INVALID_CHUNK_OVERLAP",
    );
  }
}

function splitTextRecursive(
  text: string,
  separators: readonly string[],
  chunkSize: number,
): string[] {
  const [separator, ...remainingSeparators] = separators;

  if (!separator) {
    return Array.from(text);
  }

  const parts = text.split(separator);
  const splits: string[] = [];

  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    const piece =
      index < parts.length - 1 ? `${part}${separator}` : part;

    if (!piece) {
      continue;
    }

    if (piece.length <= chunkSize) {
      splits.push(piece);
      continue;
    }

    if (remainingSeparators.length === 0) {
      splits.push(piece);
      continue;
    }

    splits.push(...splitTextRecursive(piece, remainingSeparators, chunkSize));
  }

  return splits;
}

function mergeSplits(splits: string[], chunkSize: number): string[] {
  const merged: string[] = [];
  let current = "";
  let currentLength = 0;

  for (const split of splits) {
    if (!split) {
      continue;
    }

    if (split.length > chunkSize) {
      if (current) {
        merged.push(current);
        current = "";
        currentLength = 0;
      }
      merged.push(split);
      continue;
    }

    if (currentLength + split.length > chunkSize && current) {
      merged.push(current);
      current = split;
      currentLength = split.length;
      continue;
    }

    current += split;
    currentLength += split.length;
  }

  if (current) {
    merged.push(current);
  }

  return merged;
}

function locateChunkInText(
  text: string,
  chunk: string,
  searchFrom: number,
): number {
  const startChar = text.indexOf(chunk, searchFrom);

  if (startChar === -1) {
    throw new AppError(
      "Failed to map a chunk back to the original extracted text.",
      500,
      "CHUNK_MAPPING_FAILED",
    );
  }

  return startChar;
}

function findSemanticBreak(
  text: string,
  startChar: number,
  targetEnd: number,
): number {
  const minimumBreak = startChar + Math.floor((targetEnd - startChar) * 0.5);

  for (const separator of CHUNK_SEPARATORS) {
    if (!separator) {
      continue;
    }

    const breakIndex = text.lastIndexOf(separator, targetEnd);
    if (breakIndex >= minimumBreak) {
      return breakIndex + separator.length;
    }
  }

  return targetEnd;
}

function buildNonOverlappingRanges(
  text: string,
  chunkSize: number,
): TextRange[] {
  const splits = splitTextRecursive(text, CHUNK_SEPARATORS, chunkSize);
  const merged = mergeSplits(splits, chunkSize);
  const ranges: TextRange[] = [];
  let searchFrom = 0;

  for (const chunk of merged) {
    const startChar = locateChunkInText(text, chunk, searchFrom);
    const endChar = startChar + chunk.length;
    ranges.push({ startChar, endChar });
    searchFrom = startChar + 1;
  }

  return ranges;
}

function applyOverlap(
  text: string,
  ranges: TextRange[],
  chunkSize: number,
  chunkOverlap: number,
): TextRange[] {
  if (ranges.length === 0) {
    return [];
  }

  const overlappedRanges: TextRange[] = [ranges[0]];

  for (let index = 1; index < ranges.length; index += 1) {
    const previous = overlappedRanges[overlappedRanges.length - 1];
    const startChar = Math.max(0, previous.endChar - chunkOverlap);
    const targetEnd = Math.min(startChar + chunkSize, text.length);
    const endChar =
      targetEnd < text.length
        ? findSemanticBreak(text, startChar, targetEnd)
        : text.length;

    overlappedRanges.push({ startChar, endChar });
  }

  return overlappedRanges;
}

export function chunkText(
  text: string,
  config: ChunkConfig = {},
): Array<{ text: string; startChar: number; endChar: number }> {
  const chunkSize = config.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const chunkOverlap = config.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP;

  validateChunkConfig(chunkSize, chunkOverlap);

  if (!text.trim()) {
    throw new AppError(
      "Cannot chunk empty extracted text.",
      400,
      "EMPTY_TEXT",
    );
  }

  const nonOverlappingRanges = buildNonOverlappingRanges(text, chunkSize);
  const finalRanges = applyOverlap(
    text,
    nonOverlappingRanges,
    chunkSize,
    chunkOverlap,
  );

  return finalRanges.map((range) => ({
    text: text.slice(range.startChar, range.endChar),
    startChar: range.startChar,
    endChar: range.endChar,
  }));
}

export function chunkDocument(
  document: IngestedDocument,
  config: ChunkConfig = {},
): ChunkedDocument {
  const chunkSize = config.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const chunkOverlap = config.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP;

  validateChunkConfig(chunkSize, chunkOverlap);

  const textChunks = chunkText(document.extractedText, {
    chunkSize,
    chunkOverlap,
  });

  const chunks: Chunk[] = textChunks.map((chunk, index) => ({
    id: randomUUID(),
    documentId: document.id,
    text: chunk.text,
    index,
    metadata: {
      filename: document.metadata.filename,
      extension: document.metadata.extension,
      startChar: chunk.startChar,
      endChar: chunk.endChar,
    },
  }));

  const chunkedDocument: ChunkedDocument = {
    documentId: document.id,
    metadata: document.metadata,
    chunks,
    chunking: {
      chunkSize,
      chunkOverlap,
      totalChunks: chunks.length,
    },
  };

  return chunkedDocumentSchema.parse(chunkedDocument);
}
