import { apiErrorSchema } from "@/lib/documents/types";
import { indexEmbeddedDocument } from "@/lib/vector-store/indexer";
import { indexRequestSchema } from "@/lib/vector-store/types";
import { isAppError } from "@/lib/utils/errors";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { embeddedDocument } = indexRequestSchema.parse(body);
    const indexResponse = await indexEmbeddedDocument(embeddedDocument);

    return NextResponse.json(indexResponse);
  } catch (error) {
    if (error instanceof ZodError) {
      const responseBody = apiErrorSchema.parse({
        error: {
          code: "INVALID_REQUEST",
          message: "Invalid index request payload.",
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

    console.error("Unexpected indexing error:", error);

    const responseBody = apiErrorSchema.parse({
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred while indexing the document.",
      },
    });

    return NextResponse.json(responseBody, { status: 500 });
  }
}
