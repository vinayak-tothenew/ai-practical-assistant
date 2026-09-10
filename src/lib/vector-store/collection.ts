import "server-only";

import type { Collection } from "chromadb";
import { AppError } from "../utils/errors";
import { ensureChromaConnection } from "./client";
import { CHROMA_DISTANCE_METRIC, COLLECTION_NAME } from "./constants";

function getConfiguredSpace(collection: Collection): string | null | undefined {
  return collection.configuration?.hnsw?.space;
}

function assertCosineCollection(collection: Collection): void {
  const space = getConfiguredSpace(collection);

  if (space !== CHROMA_DISTANCE_METRIC) {
    throw new AppError(
      `Collection "${COLLECTION_NAME}" is configured with distance metric "${space ?? "unknown"}", but cosine is required. Delete chroma-data/ and restart Chroma to recreate the collection.`,
      500,
      "VECTOR_STORE_METRIC_MISMATCH",
    );
  }
}

export async function getOrCreateKnowledgeCollection(): Promise<Collection> {
  const client = await ensureChromaConnection();

  const collection = await client.getOrCreateCollection({
    name: COLLECTION_NAME,
    configuration: {
      hnsw: {
        space: CHROMA_DISTANCE_METRIC,
      },
    },
    metadata: {
      distanceMetric: CHROMA_DISTANCE_METRIC,
      purpose: "enterprise-knowledge-assistant",
    },
  });

  assertCosineCollection(collection);

  return collection;
}

export async function getCollectionRecordCount(): Promise<number> {
  const collection = await getOrCreateKnowledgeCollection();
  return collection.count();
}
