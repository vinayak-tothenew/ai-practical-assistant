import { extractText, getDocumentProxy } from "unpdf";
import { AppError } from "../../utils/errors";

export async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(pdf, { mergePages: true });

    if (!text.trim()) {
      throw new AppError(
        "No text could be extracted from the PDF.",
        422,
        "EXTRACTION_EMPTY",
      );
    }

    return text.trim();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      "Failed to extract text from PDF. The file may be corrupted or password-protected.",
      422,
      "PDF_EXTRACTION_FAILED",
    );
  }
}
