import "server-only";

import { ChromaClient, ChromaConnectionError } from "chromadb";
import { AppError } from "../utils/errors";
import { getVectorStoreConfig } from "./config";

let chromaClient: ChromaClient | null = null;

export function getChromaClient(): ChromaClient {
  if (!chromaClient) {
    const config = getVectorStoreConfig();
    chromaClient = new ChromaClient({
      host: config.host,
      port: config.port,
    });
  }

  return chromaClient;
}

export async function ensureChromaConnection(): Promise<ChromaClient> {
  const client = getChromaClient();

  try {
    await client.heartbeat();
    return client;
  } catch (error) {
    if (error instanceof ChromaConnectionError) {
      throw new AppError(
        "Unable to connect to ChromaDB. On Windows x64 use: npm run chroma:docker. On macOS/Linux use: npm run chroma",
        503,
        "VECTOR_STORE_UNAVAILABLE",
      );
    }

    throw new AppError(
      "Failed to connect to ChromaDB.",
      500,
      "VECTOR_STORE_ERROR",
    );
  }
}
