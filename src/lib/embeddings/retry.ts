import { AppError } from "../utils/errors";
import { INITIAL_RETRY_DELAY_MS, MAX_EMBEDDING_ATTEMPTS } from "./constants";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function getRetryDelayMs(attempt: number, retryAfterHeader?: string | null): number {
  if (retryAfterHeader) {
    const retryAfterSeconds = Number.parseInt(retryAfterHeader, 10);
    if (!Number.isNaN(retryAfterSeconds) && retryAfterSeconds > 0) {
      return retryAfterSeconds * 1000;
    }
  }

  return INITIAL_RETRY_DELAY_MS * 2 ** (attempt - 1);
}

export async function withEmbeddingRetry<T>(
  operation: () => Promise<T>,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_EMBEDDING_ATTEMPTS; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (error instanceof AppError) {
        if (!isRetryableStatus(error.statusCode) || attempt === MAX_EMBEDDING_ATTEMPTS) {
          throw error;
        }

        await sleep(getRetryDelayMs(attempt, error.retryAfter));
        continue;
      }

      if (attempt === MAX_EMBEDDING_ATTEMPTS) {
        throw error;
      }

      await sleep(getRetryDelayMs(attempt));
    }
  }

  throw lastError;
}
