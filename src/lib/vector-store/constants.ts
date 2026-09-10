export const COLLECTION_NAME = "enterprise-knowledge";
export const INTEGRATION_TEST_COLLECTION_NAME =
  "enterprise-knowledge-integration-test";
export const DEFAULT_TOP_K = 3;
export const MAX_TOP_K = 20;
export const INDEX_BATCH_SIZE = 50;
export const CHROMA_DISTANCE_METRIC = "cosine";

/**
 * Re-indexing limitation (Milestone 4):
 * Upserting by chunk.id updates existing chunk vectors, but if a document is
 * re-chunked into fewer chunks, stale chunk IDs from the previous version may
 * remain in ChromaDB. Full document replacement will be addressed in a later
 * milestone.
 *
 * Embedding model migration:
 * Do not mix vectors from different embedding providers/models/dimensions in
 * the same Chroma collection. After switching models (e.g. OpenAI -> Gemini),
 * delete ./chroma-data and recreate the collection before re-indexing.
 */
