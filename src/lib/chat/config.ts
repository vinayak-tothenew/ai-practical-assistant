import "server-only";

import { AppError } from "../utils/errors";
import {
  DEFAULT_GEMINI_CHAT_MODEL,
  DEFAULT_RAG_MIN_SIMILARITY,
} from "./constants";

export type ChatConfig = {
  apiKey: string;
  model: string;
  minSimilarity: number;
};

function parseMinSimilarity(value: string | undefined): number {
  if (!value?.trim()) {
    return DEFAULT_RAG_MIN_SIMILARITY;
  }

  const parsed = Number.parseFloat(value);

  if (Number.isNaN(parsed) || parsed < 0 || parsed > 1) {
    throw new AppError(
      "RAG_MIN_SIMILARITY must be a number between 0 and 1.",
      500,
      "CHAT_CONFIG_ERROR",
    );
  }

  return parsed;
}

export function getChatConfig(): ChatConfig {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey?.trim()) {
    throw new AppError(
      "Chat service is not configured. Set GEMINI_API_KEY in .env.local.",
      500,
      "CHAT_CONFIG_ERROR",
    );
  }

  return {
    apiKey,
    model: process.env.GEMINI_CHAT_MODEL?.trim() || DEFAULT_GEMINI_CHAT_MODEL,
    minSimilarity: parseMinSimilarity(process.env.RAG_MIN_SIMILARITY),
  };
}
