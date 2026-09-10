import { z } from "zod";

export const supportedFileTypeSchema = z.enum(["pdf", "docx", "txt"]);

export type SupportedFileType = z.infer<typeof supportedFileTypeSchema>;

export const documentMetadataSchema = z.object({
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  extension: supportedFileTypeSchema,
  sizeBytes: z.number().int().nonnegative(),
  ingestedAt: z.string().datetime(),
});

export type DocumentMetadata = z.infer<typeof documentMetadataSchema>;

export const ingestedDocumentSchema = z.object({
  id: z.string().uuid(),
  metadata: documentMetadataSchema,
  extractedText: z.string(),
});

export type IngestedDocument = z.infer<typeof ingestedDocumentSchema>;

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export type ApiError = z.infer<typeof apiErrorSchema>;
