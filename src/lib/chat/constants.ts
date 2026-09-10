/**
 * Default Gemini generation model for RAG answers (separate from gemini-embedding-001).
 * Verified against @google/genai on Google AI Studio free tier — older 2.x/2.5 models
 * may return 404 for new API keys; override with GEMINI_CHAT_MODEL if needed.
 */
export const DEFAULT_GEMINI_CHAT_MODEL = "gemini-3.5-flash";

/**
 * Tunable starting point for cosine similarity filtering (similarity = 1 - distance).
 * Embedding scale varies by corpus, chunk size, and query phrasing — adjust via
 * RAG_MIN_SIMILARITY in .env.local rather than treating this as universal.
 */
export const DEFAULT_RAG_MIN_SIMILARITY = 0.45;

export const MAX_CHAT_ATTEMPTS = 3;
export const INITIAL_CHAT_RETRY_DELAY_MS = 1000;

export const NOT_FOUND_ANSWER =
  "I couldn't find this information in the provided documents.";
