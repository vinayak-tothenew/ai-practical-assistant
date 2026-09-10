import "server-only";

import { semanticSearch } from "../vector-store/search";
import { DEFAULT_TOP_K } from "../vector-store/constants";
import type { SearchResult } from "../vector-store/types";
import { NOT_FOUND_ANSWER } from "./constants";
import { getChatConfig } from "./config";
import { createChatProvider } from "./providers";
import {
  buildRagUserMessage,
  buildRagUserPrompt,
  RAG_SYSTEM_PROMPT,
} from "./prompt";
import { filterRelevantResults } from "./relevance";
import type { ChatResponse, ChatSource } from "./types";
import { chatResponseSchema } from "./types";

function toChatSources(chunks: SearchResult[]): ChatSource[] {
  return chunks.map((chunk) => ({
    chunkId: chunk.chunkId,
    documentId: chunk.documentId,
    filename: chunk.filename,
    chunkIndex: chunk.chunkIndex,
    similarity: chunk.similarity,
    distance: chunk.distance,
  }));
}

export async function generateChatAnswer(
  query: string,
  topK: number = DEFAULT_TOP_K,
  documentId?: string,
): Promise<ChatResponse> {
  const config = getChatConfig();
  const searchResponse = await semanticSearch(query, topK, documentId);
  const relevantChunks = filterRelevantResults(
    searchResponse.results,
    config.minSimilarity,
  );

  if (relevantChunks.length === 0) {
    const response: ChatResponse = {
      answer: NOT_FOUND_ANSWER,
      sources: [],
      chat: {
        model: config.model,
        topK,
        minSimilarity: config.minSimilarity,
        retrievedChunks: searchResponse.results.length,
        usedChunks: 0,
        answeredAt: new Date().toISOString(),
      },
    };

    return chatResponseSchema.parse(response);
  }

  const provider = createChatProvider(config);
  const ragMessage = buildRagUserMessage(query, relevantChunks);
  const completion = await provider.complete({
    system: RAG_SYSTEM_PROMPT,
    model: config.model,
    messages: [
      {
        role: "user",
        content: buildRagUserPrompt(ragMessage),
      },
    ],
  });

  const response: ChatResponse = {
    answer: completion.answer,
    sources: toChatSources(relevantChunks),
    chat: {
      model: completion.model,
      topK,
      minSimilarity: config.minSimilarity,
      retrievedChunks: searchResponse.results.length,
      usedChunks: relevantChunks.length,
      answeredAt: new Date().toISOString(),
    },
  };

  return chatResponseSchema.parse(response);
}
