import { apiErrorSchema } from "@/lib/documents/types";
import { semanticSearch } from "@/lib/vector-store/search";
import { searchRequestSchema } from "@/lib/vector-store/types";
import { isAppError } from "@/lib/utils/errors";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query, topK, documentId, model } = searchRequestSchema.parse(body);
    const searchResponse = await semanticSearch(query, topK, documentId, model);

    return NextResponse.json(searchResponse);
  } catch (error) {
    if (error instanceof ZodError) {
      const responseBody = apiErrorSchema.parse({
        error: {
          code: "INVALID_REQUEST",
          message: "Invalid search request payload.",
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

    console.error("Unexpected search error:", error);

    const responseBody = apiErrorSchema.parse({
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred while searching.",
      },
    });

    return NextResponse.json(responseBody, { status: 500 });
  }
}
