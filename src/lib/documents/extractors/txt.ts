import { AppError } from "../../utils/errors";

export async function extractTxtText(buffer: Buffer): Promise<string> {
  try {
    const text = buffer.toString("utf8");

    if (!text.trim()) {
      throw new AppError(
        "Text file is empty or contains only whitespace.",
        422,
        "EXTRACTION_EMPTY",
      );
    }

    return text.trim();
  } catch {
    throw new AppError(
      "Failed to decode text file as UTF-8.",
      422,
      "TXT_EXTRACTION_FAILED",
    );
  }
}
