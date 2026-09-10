import type { SupportedFileType } from "../types";
import { extractDocxText } from "./docx";
import { extractPdfText } from "./pdf";
import { extractTxtText } from "./txt";

export async function extractTextByType(
  buffer: Buffer,
  fileType: SupportedFileType,
): Promise<string> {
  switch (fileType) {
    case "pdf":
      return extractPdfText(buffer);
    case "docx":
      return extractDocxText(buffer);
    case "txt":
      return extractTxtText(buffer);
    default: {
      const exhaustiveCheck: never = fileType;
      throw new Error(`Unsupported file type: ${exhaustiveCheck}`);
    }
  }
}
