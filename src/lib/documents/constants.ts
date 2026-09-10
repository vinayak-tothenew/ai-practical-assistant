import type { SupportedFileType } from "./types";

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_EXTENSIONS: readonly SupportedFileType[] = [
  "pdf",
  "docx",
  "txt",
];

export const ALLOWED_MIME_TYPES: Record<SupportedFileType, readonly string[]> = {
  pdf: ["application/pdf"],
  docx: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/octet-stream",
  ],
  txt: ["text/plain", "application/octet-stream"],
};

export const EXTENSION_MIME_MAP: Record<SupportedFileType, string> = {
  pdf: "application/pdf",
  docx:
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
};
