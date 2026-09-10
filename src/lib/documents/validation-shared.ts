import {
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
} from "./constants";
import type { SupportedFileType } from "./types";

function getExtension(filename: string): string {
  const parts = filename.split(".");
  if (parts.length < 2) {
    return "";
  }
  return parts.at(-1)!.toLowerCase();
}

export function parseSupportedExtension(
  filename: string,
): SupportedFileType | null {
  const extension = getExtension(filename);
  if (!ALLOWED_EXTENSIONS.includes(extension as SupportedFileType)) {
    return null;
  }
  return extension as SupportedFileType;
}

export function isMimeAllowed(
  extension: SupportedFileType,
  mimeType: string,
): boolean {
  const normalizedMime = mimeType.toLowerCase();
  return ALLOWED_MIME_TYPES[extension].some(
    (allowed) => allowed === normalizedMime,
  );
}

export function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb} MB`;
}

export { MAX_FILE_SIZE_BYTES };
