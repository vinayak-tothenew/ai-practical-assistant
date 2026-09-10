import type { SearchResult } from "../vector-store/types";

export function formatRetrievedChunksForPrompt(
  chunks: SearchResult[],
): string {
  if (chunks.length === 0) {
    return "No retrieved context was supplied.";
  }

  return chunks
    .map((chunk, index) => {
      return [
        `[Source ${index + 1}]`,
        `chunkId: ${chunk.chunkId}`,
        `documentId: ${chunk.documentId}`,
        `filename: ${chunk.filename}`,
        `chunkIndex: ${chunk.chunkIndex}`,
        `similarity: ${chunk.similarity.toFixed(4)}`,
        `text:`,
        chunk.text,
      ].join("\n");
    })
    .join("\n\n---\n\n");
}
