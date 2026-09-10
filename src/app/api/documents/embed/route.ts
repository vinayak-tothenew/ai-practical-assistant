import { embedChunkedDocument } from "@/lib/embeddings/embedder";
import { embedRequestSchema } from "@/lib/embeddings/types";
import { apiErrorSchema } from "@/lib/documents/types";
import { isAppError } from "@/lib/utils/errors";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { chunkedDocument, model } = embedRequestSchema.parse(body);
    const embeddedDocument = await embedChunkedDocument(chunkedDocument, model);

    return NextResponse.json(embeddedDocument);
  } catch (error) {
    if (error instanceof ZodError) {
      const responseBody = apiErrorSchema.parse({
        error: {
          code: "INVALID_REQUEST",
          message: "Invalid embed request payload.",
        },
      });

      return NextResponse.json(responseBody, { status: 400 });
    }

    if (isAppError(error)) {
      const responseBody = apiErrorSchema.parse({
        error: {
          code: error.code,
          message: error.message,
        },
      });

      return NextResponse.json(responseBody, { status: error.statusCode });
    }

    console.error("Unexpected embedding error:", error);

    const responseBody = apiErrorSchema.parse({
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred while generating embeddings.",
      },
    });

    return NextResponse.json(responseBody, { status: 500 });
  }
}
