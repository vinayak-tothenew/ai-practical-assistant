import "server-only";

import { GoogleGenAI } from "@google/genai";
import { AppError } from "../../utils/errors";
import type { EmbeddingConfig } from "../config";
import type {
  EmbeddingProvider,
  EmbeddingProviderResult,
  EmbeddingTaskType,
} from "../provider";
import { withEmbeddingRetry } from "../retry";

type GeminiApiError = {
  status?: number;
  message?: string;
  headers?: {
    get?: (name: string) => string | null;
  };
};

function mapGeminiError(error: unknown): AppError {
  const apiError = error as GeminiApiError;
  const status = apiError.status;
  const retryAfter = apiError.headers?.get?.("retry-after") ?? null;

  if (status === 401 || status === 403) {
    return new AppError(
      "Embedding authentication failed. Check GEMINI_API_KEY.",
      401,
      "EMBEDDING_AUTH_ERROR",
    );
  }

  if (status === 400) {
    return new AppError(
      "Embedding request was rejected by Gemini.",
      400,
      "EMBEDDING_REQUEST_ERROR",
    );
  }

  if (status === 429) {
    return new AppError(
      "Embedding rate limit exceeded. Please try again shortly.",
      429,
      "EMBEDDING_RATE_LIMIT",
      retryAfter,
    );
  }

  if (status && status >= 500) {
    return new AppError(
      "Gemini embedding provider returned a server error.",
      status,
      "EMBEDDING_PROVIDER_ERROR",
      retryAfter,
    );
  }

  return new AppError(
    "Failed to generate embeddings with Gemini.",
    500,
    "EMBEDDING_FAILED",
  );
}

function extractEmbeddings(
  response: Awaited<ReturnType<GoogleGenAI["models"]["embedContent"]>>,
): number[][] {
  const embeddings = response.embeddings ?? [];

  if (embeddings.length === 0) {
    throw new AppError(
      "Gemini returned no embedding vectors.",
      500,
      "EMBEDDING_EMPTY_VECTOR",
    );
  }

  return embeddings.map((item, index) => {
    const values = item.values;

    if (!values || values.length === 0) {
      throw new AppError(
        `Gemini returned an empty vector at index ${index}.`,
        500,
        "EMBEDDING_EMPTY_VECTOR",
      );
    }

    return values;
  });
}

export function createGeminiEmbeddingProvider(
  config: EmbeddingConfig,
): EmbeddingProvider {
  const client = new GoogleGenAI({ apiKey: config.apiKey });

  return {
    async embedTexts(
      texts: string[],
      model: string,
      taskType: EmbeddingTaskType = "RETRIEVAL_DOCUMENT",
    ): Promise<EmbeddingProviderResult> {
      if (texts.length === 0) {
        return { embeddings: [], model };
      }

      try {
        const response = await withEmbeddingRetry(() =>
          client.models.embedContent({
            model,
            contents: texts,
            config: {
              taskType,
            },
          }),
        );

        const embeddings = extractEmbeddings(response);

        if (embeddings.length !== texts.length) {
          throw new AppError(
            "Gemini returned a different number of vectors than requested.",
            500,
            "EMBEDDING_COUNT_MISMATCH",
          );
        }

        const dimensions = embeddings[0]?.length ?? 0;
        const consistentDimensions = embeddings.every(
          (embedding) => embedding.length === dimensions,
        );

        if (!consistentDimensions) {
          throw new AppError(
            "Gemini returned vectors with inconsistent dimensions.",
            500,
            "EMBEDDING_DIMENSION_MISMATCH",
          );
        }

        return {
          embeddings,
          model,
        };
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }

        throw mapGeminiError(error);
      }
    },
  };
}
