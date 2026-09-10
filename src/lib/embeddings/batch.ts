import { EMBEDDING_BATCH_SIZE } from "./constants";
import type { Chunk } from "../rag/types";

export function batchChunks(chunks: Chunk[]): Chunk[][] {
  const batches: Chunk[][] = [];

  for (let index = 0; index < chunks.length; index += EMBEDDING_BATCH_SIZE) {
    batches.push(chunks.slice(index, index + EMBEDDING_BATCH_SIZE));
  }

  return batches;
}
