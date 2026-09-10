import { z } from "zod";
import { documentMetadataSchema, ingestedDocumentSchema } from "../documents/types";

export const chunkMetadataSchema = z.object({
  filename: z.string().min(1),
  extension: z.enum(["pdf", "docx", "txt"]),
  startChar: z.number().int().nonnegative(),
  endChar: z.number().int().nonnegative(),
});

export type ChunkMetadata = z.infer<typeof chunkMetadataSchema>;

export const chunkSchema = z.object({
  id: z.string().uuid(),
  documentId: z.string().uuid(),
  text: z.string().min(1),
  index: z.number().int().nonnegative(),
  metadata: chunkMetadataSchema,
});

export type Chunk = z.infer<typeof chunkSchema>;

export const chunkConfigSchema = z.object({
  chunkSize: z.number().int().min(100).max(4000).optional(),
  chunkOverlap: z.number().int().nonnegative().optional(),
});

export type ChunkConfig = z.infer<typeof chunkConfigSchema>;

export const chunkRequestSchema = z.object({
  document: ingestedDocumentSchema,
  chunkSize: z.number().int().min(100).max(4000).optional(),
  chunkOverlap: z.number().int().nonnegative().optional(),
});

export type ChunkRequest = z.infer<typeof chunkRequestSchema>;

export const chunkedDocumentSchema = z.object({
  documentId: z.string().uuid(),
  metadata: documentMetadataSchema,
  chunks: z.array(chunkSchema),
  chunking: z.object({
    chunkSize: z.number().int().positive(),
    chunkOverlap: z.number().int().nonnegative(),
    totalChunks: z.number().int().nonnegative(),
  }),
});

export type ChunkedDocument = z.infer<typeof chunkedDocumentSchema>;
