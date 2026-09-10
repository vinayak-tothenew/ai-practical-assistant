import { generateChatAnswer } from "@/lib/chat/generate-answer";
import { chatRequestSchema } from "@/lib/chat/types";
import { apiErrorSchema } from "@/lib/documents/types";
import { DEFAULT_TOP_K } from "@/lib/vector-store/constants";
import { AppError, isAppError } from "@/lib/utils/errors";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query, topK, documentId } = chatRequestSchema.parse(body);
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      throw new AppError("Chat query cannot be empty.", 400, "EMPTY_QUERY");
    }

    const chatResponse = await generateChatAnswer(
      trimmedQuery,
      topK ?? DEFAULT_TOP_K,
      documentId,
    );

    return NextResponse.json(chatResponse);
  } catch (error) {
    if (error instanceof ZodError) {
      const responseBody = apiErrorSchema.parse({
        error: {
          code: "INVALID_REQUEST",
          message: "Invalid chat request payload.",
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

    console.error("Unexpected chat error:", error);

    const responseBody = apiErrorSchema.parse({
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred while generating a chat answer.",
      },
    });

    return NextResponse.json(responseBody, { status: 500 });
  }
}
