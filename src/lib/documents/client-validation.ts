import {
  formatBytes,
  isMimeAllowed,
  MAX_FILE_SIZE_BYTES,
  parseSupportedExtension,
} from "./validation-shared";

export function validateClientFile(file: File): string | null {
  if (file.size === 0) {
    return "File is empty.";
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `File exceeds the ${formatBytes(MAX_FILE_SIZE_BYTES)} limit.`;
  }

  const extension = parseSupportedExtension(file.name);
  if (!extension) {
    return "Only PDF, DOCX, and TXT files are supported.";
  }

  if (file.type && !isMimeAllowed(extension, file.type)) {
    return `Unsupported MIME type "${file.type}" for .${extension} files.`;
  }

  return null;
}
