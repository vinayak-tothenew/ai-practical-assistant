import { z } from "zod";
import { chunkSchema, chunkedDocumentSchema } from "../rag/types";

export const embeddedChunkSchema = chunkSchema.extend({
  embedding: z.array(z.number()),
  embeddingModel: z.string().min(1),
  dimensions: z.number().int().positive(),
});

export type EmbeddedChunk = z.infer<typeof embeddedChunkSchema>;

export const embedRequestSchema = z.object({
  chunkedDocument: chunkedDocumentSchema,
  model: z.string().min(1).optional(),
});

export type EmbedRequest = z.infer<typeof embedRequestSchema>;

export const embeddedChunkedDocumentSchema = z.object({
  documentId: z.string().uuid(),
  metadata: chunkedDocumentSchema.shape.metadata,
  embeddedChunks: z.array(embeddedChunkSchema),
  embedding: z.object({
    model: z.string().min(1),
    dimensions: z.number().int().positive(),
    totalEmbedded: z.number().int().nonnegative(),
    embeddedAt: z.string().datetime(),
  }),
});

export type EmbeddedChunkedDocument = z.infer<
  typeof embeddedChunkedDocumentSchema
>;
