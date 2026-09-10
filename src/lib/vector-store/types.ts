import { z } from "zod";
import { embeddedChunkedDocumentSchema } from "../embeddings/types";

export const indexRequestSchema = z.object({
  embeddedDocument: embeddedChunkedDocumentSchema,
});

export type IndexRequest = z.infer<typeof indexRequestSchema>;

export const indexResponseSchema = z.object({
  documentId: z.string().uuid(),
  indexedChunks: z.number().int().nonnegative(),
  collection: z.string().min(1),
  distanceMetric: z.literal("cosine"),
  indexedAt: z.string().datetime(),
});

export type IndexResponse = z.infer<typeof indexResponseSchema>;

export const searchRequestSchema = z.object({
  query: z.string().min(1),
  topK: z.number().int().min(1).max(20).optional(),
  documentId: z.string().uuid().optional(),
  model: z.string().min(1).optional(),
});

export type SearchRequest = z.infer<typeof searchRequestSchema>;

export const searchResultSchema = z.object({
  chunkId: z.string().uuid(),
  documentId: z.string().uuid(),
  text: z.string(),
  filename: z.string(),
  chunkIndex: z.number().int().nonnegative(),
  startChar: z.number().int().nonnegative(),
  endChar: z.number().int().nonnegative(),
  distance: z.number(),
  similarity: z.number(),
});

export type SearchResult = z.infer<typeof searchResultSchema>;

export const searchResponseSchema = z.object({
  query: z.string().min(1),
  results: z.array(searchResultSchema),
  search: z.object({
    model: z.string().min(1),
    topK: z.number().int().positive(),
    totalResults: z.number().int().nonnegative(),
    distanceMetric: z.literal("cosine"),
    searchedAt: z.string().datetime(),
  }),
});

export type SearchResponse = z.infer<typeof searchResponseSchema>;

export type ChromaChunkMetadata = {
  documentId: string;
  chunkIndex: number;
  filename: string;
  extension: string;
  text: string;
  startChar: number;
  endChar: number;
  embeddingModel: string;
  dimensions: number;
  indexedAt: string;
};
