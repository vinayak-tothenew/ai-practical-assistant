import { z } from "zod";
import { DEFAULT_TOP_K, MAX_TOP_K } from "../vector-store/constants";

export const chatRequestSchema = z.object({
  query: z.string().min(1),
  topK: z.number().int().min(1).max(MAX_TOP_K).optional(),
  documentId: z.string().uuid().optional(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

export const chatSourceSchema = z.object({
  chunkId: z.string().uuid(),
  documentId: z.string().uuid(),
  filename: z.string().min(1),
  chunkIndex: z.number().int().nonnegative(),
  similarity: z.number(),
  distance: z.number(),
});

export type ChatSource = z.infer<typeof chatSourceSchema>;

export const chatResponseSchema = z.object({
  answer: z.string(),
  sources: z.array(chatSourceSchema),
  chat: z.object({
    model: z.string().min(1),
    topK: z.number().int().positive(),
    minSimilarity: z.number(),
    retrievedChunks: z.number().int().nonnegative(),
    usedChunks: z.number().int().nonnegative(),
    answeredAt: z.string().datetime(),
  }),
});

export type ChatResponse = z.infer<typeof chatResponseSchema>;

export const DEFAULT_CHAT_TOP_K = DEFAULT_TOP_K;
