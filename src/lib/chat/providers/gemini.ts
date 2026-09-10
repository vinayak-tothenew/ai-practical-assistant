import "server-only";

import { GoogleGenAI } from "@google/genai";
import { AppError } from "../../utils/errors";
import type { ChatConfig } from "../config";
import type {
  ChatCompletionInput,
  ChatCompletionResult,
  ChatProvider,
} from "../provider";
import { withChatRetry } from "../retry";

type GeminiApiError = {
  status?: number;
  message?: string;
  headers?: {
    get?: (name: string) => string | null;
  };
};

function mapGeminiChatError(error: unknown): AppError {
  if (
    process.env.CHAT_TEST_FORCE_PROVIDER_ERROR === "1" &&
    process.env.NODE_ENV !== "production"
  ) {
    return new AppError(
      "Forced chat provider failure for testing.",
      502,
      "CHAT_PROVIDER_ERROR",
    );
  }

  const apiError = error as GeminiApiError;
  const status = apiError.status;
  const retryAfter = apiError.headers?.get?.("retry-after") ?? null;

  if (status === 401 || status === 403) {
    return new AppError(
      "Chat authentication failed. Check GEMINI_API_KEY.",
      401,
      "CHAT_AUTH_ERROR",
    );
  }

  if (status === 400) {
    return new AppError(
      "Chat request was rejected by Gemini.",
      400,
      "CHAT_REQUEST_ERROR",
    );
  }

  if (status === 429) {
    return new AppError(
      "Chat rate limit exceeded. Please try again shortly.",
      429,
      "CHAT_RATE_LIMIT",
      retryAfter,
    );
  }

  if (status && status >= 500) {
    return new AppError(
      "Gemini chat service is temporarily unavailable.",
      502,
      "CHAT_PROVIDER_ERROR",
      retryAfter,
    );
  }

  return new AppError(
    "Chat generation failed.",
    500,
    "CHAT_FAILED",
  );
}

function extractAnswerText(
  response: Awaited<ReturnType<GoogleGenAI["models"]["generateContent"]>>,
): string {
  const answer = response.text?.trim();

  if (!answer) {
    throw new AppError(
      "Gemini returned an empty response.",
      502,
      "CHAT_PROVIDER_ERROR",
    );
  }

  return answer;
}

export function createGeminiChatProvider(config: ChatConfig): ChatProvider {
  const client = new GoogleGenAI({ apiKey: config.apiKey });

  return {
    async complete(input: ChatCompletionInput): Promise<ChatCompletionResult> {
      return withChatRetry(async () => {
        try {
          const userContent = input.messages
            .filter((message) => message.role === "user")
            .map((message) => message.content)
            .join("\n\n");

          const response = await client.models.generateContent({
            model: input.model,
            contents: userContent,
            config: {
              systemInstruction: input.system,
              maxOutputTokens: 1024,
            },
          });

          return {
            answer: extractAnswerText(response),
            model: response.modelVersion ?? input.model,
          };
        } catch (error) {
          if (error instanceof AppError) {
            throw error;
          }

          throw mapGeminiChatError(error);
        }
      });
    },
  };
}
