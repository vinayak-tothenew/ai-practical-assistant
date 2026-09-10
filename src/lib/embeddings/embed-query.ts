import "server-only";

import { getEmbeddingConfig } from "./config";
import { createEmbeddingProvider } from "./providers";

export type QueryEmbedding = {
  embedding: number[];
  model: string;
  dimensions: number;
};

export async function embedQuery(
  text: string,
  model?: string,
): Promise<QueryEmbedding> {
  const config = getEmbeddingConfig();
  const embeddingModel = model ?? config.defaultModel;
  const provider = createEmbeddingProvider(config);
  const result = await provider.embedTexts(
    [text],
    embeddingModel,
    "RETRIEVAL_QUERY",
  );
  const embedding = result.embeddings[0];

  return {
    embedding,
    model: result.model,
    dimensions: embedding.length,
  };
}
