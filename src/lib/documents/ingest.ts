import "server-only";

import { randomUUID } from "node:crypto";
import { EXTENSION_MIME_MAP } from "./constants";
import { extractTextByType } from "./extractors";
import type { IngestedDocument } from "./types";
import { ingestedDocumentSchema } from "./types";
import { validateServerDocument } from "./validators";

export async function ingestDocument(
  buffer: Buffer,
  filename: string,
  mimeType: string,
): Promise<IngestedDocument> {
  const extension = validateServerDocument(buffer, filename, mimeType);
  const extractedText = await extractTextByType(buffer, extension);

  const document: IngestedDocument = {
    id: randomUUID(),
    metadata: {
      filename,
      mimeType: mimeType || EXTENSION_MIME_MAP[extension],
      extension,
      sizeBytes: buffer.length,
      ingestedAt: new Date().toISOString(),
    },
    extractedText,
  };

  return ingestedDocumentSchema.parse(document);
}
