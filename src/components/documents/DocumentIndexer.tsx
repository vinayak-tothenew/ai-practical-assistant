"use client";

import { getApiErrorMessage } from "@/lib/api/parse-error";
import type { IndexResponse } from "@/lib/vector-store/types";
import type { EmbeddedChunkedDocument } from "@/lib/embeddings/types";
import { useState } from "react";

type DocumentIndexerProps = {
  embeddedDocument: EmbeddedChunkedDocument;
  onIndexed: (indexResponse: IndexResponse) => void;
};

export function DocumentIndexer({
  embeddedDocument,
  onIndexed,
}: DocumentIndexerProps) {
  const [isIndexing, setIsIndexing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleIndex() {
    setIsIndexing(true);
    setError(null);

    try {
      const response = await fetch("/api/documents/index", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          embeddedDocument,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(
          getApiErrorMessage(payload, "Indexing failed. Please try again."),
        );
        return;
      }

      const indexResponse = payload as IndexResponse;
      onIndexed(indexResponse);
    } catch {
      setError("Indexing failed. Please try again.");
    } finally {
      setIsIndexing(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div>
        <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Vector store indexing
        </h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Upsert embedded chunks into ChromaDB using cosine distance. Re-chunking
          into fewer chunks may leave stale chunk IDs until a later milestone.
        </p>
      </div>

      <button
        type="button"
        onClick={() => void handleIndex()}
        disabled={isIndexing}
        className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {isIndexing ? "Indexing in ChromaDB..." : "Index in ChromaDB"}
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
