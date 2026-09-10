import "server-only";

import { AppError } from "../utils/errors";
import { DEFAULT_EMBEDDING_MODEL } from "./constants";

export type EmbeddingConfig = {
  apiKey: string;
  defaultModel: string;
};

export function getEmbeddingConfig(): EmbeddingConfig {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new AppError(
      "Embedding service is not configured. Set GEMINI_API_KEY in .env.local.",
      500,
      "EMBEDDING_CONFIG_ERROR",
    );
  }

  return {
    apiKey,
    defaultModel: DEFAULT_EMBEDDING_MODEL,
  };
}
