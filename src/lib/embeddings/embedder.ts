import "server-only";

import type { Chunk, ChunkedDocument } from "../rag/types";
import { AppError } from "../utils/errors";
import { batchChunks } from "./batch";
import { getEmbeddingConfig } from "./config";
import { createEmbeddingProvider } from "./providers";
import type { EmbeddedChunk, EmbeddedChunkedDocument } from "./types";
import { embeddedChunkedDocumentSchema } from "./types";

function validateChunksForEmbedding(chunks: Chunk[]): Chunk[] {
  const validChunks: Chunk[] = [];

  for (const chunk of chunks) {
    if (!chunk.text.trim()) {
      throw new AppError(
        `Chunk ${chunk.index} is empty and cannot be embedded.`,
        400,
        "EMPTY_CHUNK",
      );
    }

    validChunks.push(chunk);
  }

  return validChunks;
}

export async function embedChunkedDocument(
  chunkedDocument: ChunkedDocument,
  model?: string,
): Promise<EmbeddedChunkedDocument> {
  const config = getEmbeddingConfig();
  const embeddingModel = model ?? config.defaultModel;
  const provider = createEmbeddingProvider(config);
  const chunks = validateChunksForEmbedding(chunkedDocument.chunks);
  const batches = batchChunks(chunks);
  const embeddedChunks: EmbeddedChunk[] = [];

  for (const batch of batches) {
    const texts = batch.map((chunk) => chunk.text);
    const result = await provider.embedTexts(
      texts,
      embeddingModel,
      "RETRIEVAL_DOCUMENT",
    );

    if (result.embeddings.length !== batch.length) {
      throw new AppError(
        "Embedding count does not match chunk count for a batch.",
        500,
        "EMBEDDING_COUNT_MISMATCH",
      );
    }

    for (let index = 0; index < batch.length; index += 1) {
      const chunk = batch[index];
      const embedding = result.embeddings[index];

      embeddedChunks.push({
        id: chunk.id,
        documentId: chunk.documentId,
        text: chunk.text,
        index: chunk.index,
        metadata: chunk.metadata,
        embedding,
        embeddingModel: result.model,
        dimensions: embedding.length,
      });
    }
  }

  embeddedChunks.sort((left, right) => left.index - right.index);

  const dimensions = embeddedChunks[0]?.dimensions ?? 0;

  if (
    embeddedChunks.length > 0 &&
    !embeddedChunks.every((chunk) => chunk.dimensions === dimensions)
  ) {
    throw new AppError(
      "Embedded chunks returned inconsistent dimensions.",
      500,
      "EMBEDDING_DIMENSION_MISMATCH",
    );
  }

  const response: EmbeddedChunkedDocument = {
    documentId: chunkedDocument.documentId,
    metadata: chunkedDocument.metadata,
    embeddedChunks,
    embedding: {
      model: embeddingModel,
      dimensions,
      totalEmbedded: embeddedChunks.length,
      embeddedAt: new Date().toISOString(),
    },
  };

  return embeddedChunkedDocumentSchema.parse(response);
}
