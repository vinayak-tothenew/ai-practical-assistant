import "server-only";

import path from "node:path";
import { AppError } from "../utils/errors";

export type VectorStoreConfig = {
  host: string;
  port: number;
  dataPath: string;
};

export function getVectorStoreConfig(): VectorStoreConfig {
  const host = process.env.CHROMA_HOST ?? "localhost";
  const port = Number.parseInt(process.env.CHROMA_PORT ?? "8000", 10);
  const dataPath = path.resolve(
    process.cwd(),
    process.env.CHROMA_DATA_PATH ?? "chroma-data",
  );

  if (Number.isNaN(port)) {
    throw new AppError(
      "CHROMA_PORT must be a valid number.",
      500,
      "VECTOR_STORE_CONFIG_ERROR",
    );
  }

  return { host, port, dataPath };
}
