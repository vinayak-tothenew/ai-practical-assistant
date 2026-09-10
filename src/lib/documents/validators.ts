import "server-only";

import { AppError } from "../utils/errors";
import type { SupportedFileType } from "./types";
import {
  formatBytes,
  isMimeAllowed,
  MAX_FILE_SIZE_BYTES,
  parseSupportedExtension,
} from "./validation-shared";

export { parseSupportedExtension } from "./validation-shared";

export function detectContentType(buffer: Buffer): SupportedFileType | null {
  if (buffer.length === 0) {
    return null;
  }

  const header = buffer.subarray(0, 5).toString("ascii");
  if (header.startsWith("%PDF")) {
    return "pdf";
  }

  if (
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    buffer[2] === 0x03 &&
    buffer[3] === 0x04
  ) {
    return "docx";
  }

  if (buffer.includes(0)) {
    return null;
  }

  try {
    const text = buffer.toString("utf8");
    if (text.includes("\uFFFD")) {
      return null;
    }
    return "txt";
  } catch {
    return null;
  }
}

export function validateServerDocument(
  buffer: Buffer,
  filename: string,
  mimeType: string,
): SupportedFileType {
  if (buffer.length === 0) {
    throw new AppError("File is empty.", 400, "EMPTY_FILE");
  }

  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    throw new AppError(
      `File exceeds the ${formatBytes(MAX_FILE_SIZE_BYTES)} limit.`,
      413,
      "FILE_TOO_LARGE",
    );
  }

  const extension = parseSupportedExtension(filename);
  if (!extension) {
    throw new AppError(
      "Only PDF, DOCX, and TXT files are supported.",
      400,
      "UNSUPPORTED_EXTENSION",
    );
  }

  if (mimeType && !isMimeAllowed(extension, mimeType)) {
    throw new AppError(
      `Unsupported MIME type "${mimeType}" for .${extension} files.`,
      400,
      "UNSUPPORTED_MIME_TYPE",
    );
  }

  const detectedType = detectContentType(buffer);
  if (!detectedType) {
    throw new AppError(
      "Unable to determine a supported document format from file contents.",
      400,
      "UNSUPPORTED_CONTENT",
    );
  }

  if (detectedType !== extension) {
    throw new AppError(
      `File extension ".${extension}" does not match the actual file content (detected .${detectedType}).`,
      400,
      "EXTENSION_MISMATCH",
    );
  }

  return extension;
}
