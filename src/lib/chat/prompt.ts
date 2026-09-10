import type { SearchResult } from "../vector-store/types";
import { formatRetrievedChunksForPrompt } from "./context";

export const RAG_SYSTEM_PROMPT = `You are an enterprise knowledge assistant.

Answer the user's question using ONLY the retrieved document context provided below.

Rules:
- Do not invent facts, policies, or steps that are not supported by the context.
- If the context does not contain enough information, say clearly that the information was not found in the provided documents.
- Write a clear, polished, concise natural-language answer — not raw chunk dumps.
- When you use information from a source, cite it inline using [Source N] markers that match the numbered sources in the context.
- Do not mention embeddings, vector databases, or internal retrieval mechanics.`;

export type RagUserMessage = {
  query: string;
  context: string;
};

export function buildRagUserMessage(
  query: string,
  chunks: SearchResult[],
): RagUserMessage {
  const context = formatRetrievedChunksForPrompt(chunks);

  return {
    query,
    context,
  };
}

export function buildRagUserPrompt(message: RagUserMessage): string {
  return `User question:
${message.query}

Retrieved document context:
${message.context}

Write a helpful answer grounded only in the retrieved context. Cite sources with [Source N] when appropriate.`;
}
