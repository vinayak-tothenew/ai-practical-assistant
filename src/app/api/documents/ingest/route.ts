import { ingestDocument } from "@/lib/documents/ingest";
import { apiErrorSchema } from "@/lib/documents/types";
import { AppError, isAppError } from "@/lib/utils/errors";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw new AppError(
        'Missing file upload. Expected form field "file".',
        400,
        "MISSING_FILE",
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const document = await ingestDocument(
      buffer,
      file.name,
      file.type || "",
    );

    return NextResponse.json(document);
  } catch (error) {
    if (isAppError(error)) {
      const body = apiErrorSchema.parse({
        error: {
          code: error.code,
          message: error.message,
        },
      });

      return NextResponse.json(body, { status: error.statusCode });
    }

    console.error("Unexpected ingestion error:", error);

    const body = apiErrorSchema.parse({
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred while processing the document.",
      },
    });

    return NextResponse.json(body, { status: 500 });
  }
}
