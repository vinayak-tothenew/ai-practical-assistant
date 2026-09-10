import "server-only";

import { embedQuery } from "../embeddings/embed-query";
import { AppError } from "../utils/errors";
import { getCollectionRecordCount, getOrCreateKnowledgeCollection } from "./collection";
import { CHROMA_DISTANCE_METRIC, DEFAULT_TOP_K } from "./constants";
import { distanceToSimilarity } from "./similarity";
import type { ChromaChunkMetadata, SearchResponse, SearchResult } from "./types";
import { searchResponseSchema } from "./types";

function parseMetadata(
  metadata: ChromaChunkMetadata | null | undefined,
): ChromaChunkMetadata {
  if (!metadata) {
    throw new AppError(
      "Search result is missing required metadata.",
      500,
      "VECTOR_STORE_METADATA_ERROR",
    );
  }

  return metadata;
}

export async function semanticSearch(
  query: string,
  topK: number = DEFAULT_TOP_K,
  documentId?: string,
  model?: string,
): Promise<SearchResponse> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    throw new AppError("Search query cannot be empty.", 400, "EMPTY_QUERY");
  }

  const recordCount = await getCollectionRecordCount();

  if (recordCount === 0) {
    throw new AppError(
      "No indexed chunks are available for search. Index a document first.",
      404,
      "SEARCH_NO_INDEX",
    );
  }

  const collection = await getOrCreateKnowledgeCollection();
  const queryEmbedding = await embedQuery(trimmedQuery, model);

  const results = await collection.query({
    queryEmbeddings: [queryEmbedding.embedding],
    nResults: topK,
    where: documentId ? { documentId } : undefined,
    include: ["distances", "metadatas", "documents"],
  });

  const ids = results.ids[0] ?? [];
  const distances = results.distances[0] ?? [];
  const metadatas = results.metadatas[0] ?? [];
  const documents = results.documents[0] ?? [];

  if (ids.length !== distances.length) {
    throw new AppError(
      "ChromaDB returned inconsistent search results.",
      500,
      "VECTOR_STORE_QUERY_ERROR",
    );
  }

  const searchResults: SearchResult[] = ids.map((chunkId, index) => {
    const metadata = parseMetadata(
      metadatas[index] as ChromaChunkMetadata | null | undefined,
    );

    if (metadata.embeddingModel !== queryEmbedding.model) {
      throw new AppError(
        `Indexed chunks use "${metadata.embeddingModel}" but the query was embedded with "${queryEmbedding.model}". Reset chroma-data and re-index with one model.`,
        400,
        "EMBEDDING_MODEL_MISMATCH",
      );
    }

    if (metadata.dimensions !== queryEmbedding.dimensions) {
      throw new AppError(
        `Indexed chunk dimensions (${metadata.dimensions}) do not match query dimensions (${queryEmbedding.dimensions}). Reset chroma-data and re-index.`,
        400,
        "EMBEDDING_DIMENSION_MISMATCH",
      );
    }

    const distance = distances[index];

    if (distance === null || distance === undefined) {
      throw new AppError(
        "ChromaDB returned a result without a distance score.",
        500,
        "VECTOR_STORE_QUERY_ERROR",
      );
    }

    const similarity = distanceToSimilarity(distance, CHROMA_DISTANCE_METRIC);

    return {
      chunkId,
      documentId: metadata.documentId,
      text: documents[index] ?? metadata.text,
      filename: metadata.filename,
      chunkIndex: metadata.chunkIndex,
      startChar: metadata.startChar,
      endChar: metadata.endChar,
      distance,
      similarity,
    };
  });

  searchResults.sort((left, right) => right.similarity - left.similarity);

  const response: SearchResponse = {
    query: trimmedQuery,
    results: searchResults,
    search: {
      model: queryEmbedding.model,
      topK,
      totalResults: searchResults.length,
      distanceMetric: "cosine",
      searchedAt: new Date().toISOString(),
    },
  };

  return searchResponseSchema.parse(response);
}
