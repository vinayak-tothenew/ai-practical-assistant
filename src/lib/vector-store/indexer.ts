import "server-only";

import type { EmbeddedChunkedDocument } from "../embeddings/types";
import { AppError } from "../utils/errors";
import { getCollectionName, getOrCreateKnowledgeCollection } from "./collection";
import { INDEX_BATCH_SIZE } from "./constants";
import type { ChromaChunkMetadata, IndexResponse } from "./types";
import { indexResponseSchema } from "./types";

function batchEmbeddedChunks<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = [];

  for (let index = 0; index < items.length; index += batchSize) {
    batches.push(items.slice(index, index + batchSize));
  }

  return batches;
}

export async function indexEmbeddedDocument(
  embeddedDocument: EmbeddedChunkedDocument,
): Promise<IndexResponse> {
  const chunks = embeddedDocument.embeddedChunks;

  if (chunks.length === 0) {
    throw new AppError(
      "Cannot index a document with no embedded chunks.",
      400,
      "EMPTY_INDEX_INPUT",
    );
  }

  for (const chunk of chunks) {
    if (!chunk.text.trim()) {
      throw new AppError(
        `Chunk ${chunk.index} is empty and cannot be indexed.`,
        400,
        "EMPTY_CHUNK",
      );
    }

    if (chunk.dimensions !== chunk.embedding.length) {
      throw new AppError(
        `Chunk ${chunk.index} has inconsistent dimensions metadata.`,
        500,
        "EMBEDDING_DIMENSION_MISMATCH",
      );
    }
  }

  const collection = await getOrCreateKnowledgeCollection();
  const indexedAt = new Date().toISOString();
  const batches = batchEmbeddedChunks(chunks, INDEX_BATCH_SIZE);

  for (const batch of batches) {
    await collection.upsert({
      ids: batch.map((chunk) => chunk.id),
      embeddings: batch.map((chunk) => chunk.embedding),
      documents: batch.map((chunk) => chunk.text),
      metadatas: batch.map(
        (chunk): ChromaChunkMetadata => ({
          documentId: chunk.documentId,
          chunkIndex: chunk.index,
          filename: chunk.metadata.filename,
          extension: chunk.metadata.extension,
          text: chunk.text,
          startChar: chunk.metadata.startChar,
          endChar: chunk.metadata.endChar,
          embeddingModel: chunk.embeddingModel,
          dimensions: chunk.dimensions,
          indexedAt,
        }),
      ),
    });
  }

  const response: IndexResponse = {
    documentId: embeddedDocument.documentId,
    indexedChunks: chunks.length,
    collection: getCollectionName(),
    distanceMetric: "cosine",
    indexedAt,
  };

  return indexResponseSchema.parse(response);
}
