"use client";

import {
  DEFAULT_CHUNK_OVERLAP,
  DEFAULT_CHUNK_SIZE,
  MAX_CHUNK_SIZE,
  MIN_CHUNK_SIZE,
} from "@/lib/rag/constants";
import { getApiErrorMessage } from "@/lib/api/parse-error";
import type { IngestedDocument } from "@/lib/documents/types";
import type { ChunkedDocument } from "@/lib/rag/types";
import { useState } from "react";

type DocumentChunkerProps = {
  document: IngestedDocument;
  onChunked: (chunkedDocument: ChunkedDocument) => void;
};

export function DocumentChunker({
  document,
  onChunked,
}: DocumentChunkerProps) {
  const [chunkSize, setChunkSize] = useState(DEFAULT_CHUNK_SIZE);
  const [chunkOverlap, setChunkOverlap] = useState(DEFAULT_CHUNK_OVERLAP);
  const [isChunking, setIsChunking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChunk() {
    setIsChunking(true);
    setError(null);

    try {
      const response = await fetch("/api/documents/chunk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          document,
          chunkSize,
          chunkOverlap,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(
          getApiErrorMessage(payload, "Chunking failed. Please try again."),
        );
        return;
      }

      const chunkedDocument = payload as ChunkedDocument;
      onChunked(chunkedDocument);
    } catch {
      setError("Chunking failed. Please try again.");
    } finally {
      setIsChunking(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div>
        <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Chunk settings
        </h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Split the extracted text into overlapping chunks for future retrieval.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            Chunk size
          </span>
          <input
            type="number"
            min={MIN_CHUNK_SIZE}
            max={MAX_CHUNK_SIZE}
            value={chunkSize}
            onChange={(event) => setChunkSize(Number(event.target.value))}
            className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            Chunk overlap
          </span>
          <input
            type="number"
            min={0}
            max={chunkSize - 1}
            value={chunkOverlap}
            onChange={(event) => setChunkOverlap(Number(event.target.value))}
            className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
      </div>

      <button
        type="button"
        onClick={() => void handleChunk()}
        disabled={isChunking}
        className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {isChunking ? "Chunking document..." : "Chunk document"}
      </button>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
        >
          {error}
        </div>
      )}
    </div>
  );
}
