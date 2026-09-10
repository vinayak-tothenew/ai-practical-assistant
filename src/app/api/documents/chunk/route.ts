import { chunkDocument } from "@/lib/rag/chunker";
import { apiErrorSchema } from "@/lib/documents/types";
import { chunkRequestSchema } from "@/lib/rag/types";
import { isAppError } from "@/lib/utils/errors";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { document, chunkSize, chunkOverlap } = chunkRequestSchema.parse(body);

    const chunkedDocument = chunkDocument(document, {
      chunkSize,
      chunkOverlap,
    });

    return NextResponse.json(chunkedDocument);
  } catch (error) {
    if (error instanceof ZodError) {
      const body = apiErrorSchema.parse({
        error: {
          code: "INVALID_REQUEST",
          message: "Invalid chunk request payload.",
        },
      });

      return NextResponse.json(body, { status: 400 });
    }

    if (isAppError(error)) {
      const body = apiErrorSchema.parse({
        error: {
          code: error.code,
          message: error.message,
        },
      });

      return NextResponse.json(body, { status: error.statusCode });
    }

    console.error("Unexpected chunking error:", error);

    const body = apiErrorSchema.parse({
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred while chunking the document.",
      },
    });

    return NextResponse.json(body, { status: 500 });
  }
}
