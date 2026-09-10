import type { EmbeddingConfig } from "../config";
import type { EmbeddingProvider } from "../provider";
import { createGeminiEmbeddingProvider } from "./gemini";

export function createEmbeddingProvider(
  config: EmbeddingConfig,
): EmbeddingProvider {
  return createGeminiEmbeddingProvider(config);
}
