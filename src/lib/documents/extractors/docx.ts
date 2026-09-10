import mammoth from "mammoth";
import { AppError } from "../../utils/errors";

export async function extractDocxText(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });

    if (!result.value.trim()) {
      throw new AppError(
        "No text could be extracted from the DOCX file.",
        422,
        "EXTRACTION_EMPTY",
      );
    }

    return result.value.trim();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      "Failed to extract text from DOCX. The file may be corrupted.",
      422,
      "DOCX_EXTRACTION_FAILED",
    );
  }
}
