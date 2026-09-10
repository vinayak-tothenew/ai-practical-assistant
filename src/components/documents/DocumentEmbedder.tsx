"use client";

import { DEFAULT_EMBEDDING_MODEL } from "@/lib/embeddings/constants";
import { getApiErrorMessage } from "@/lib/api/parse-error";
import type { EmbeddedChunkedDocument } from "@/lib/embeddings/types";
import type { ChunkedDocument } from "@/lib/rag/types";
import { useState } from "react";

type DocumentEmbedderProps = {
  chunkedDocument: ChunkedDocument;
  onEmbedded: (embeddedDocument: EmbeddedChunkedDocument) => void;
};

export function DocumentEmbedder({
  chunkedDocument,
  onEmbedded,
}: DocumentEmbedderProps) {
  const [model, setModel] = useState(DEFAULT_EMBEDDING_MODEL);
  const [isEmbedding, setIsEmbedding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEmbed() {
    setIsEmbedding(true);
    setError(null);

    try {
      const response = await fetch("/api/documents/embed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chunkedDocument,
          model,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(
          getApiErrorMessage(payload, "Embedding failed. Please try again."),
        );
        return;
      }

      const embeddedDocument = payload as EmbeddedChunkedDocument;

      const serializedPayload = JSON.stringify(payload);
      if (
        serializedPayload.includes("AIza") ||
        serializedPayload.includes("GEMINI_API_KEY")
      ) {
        setError("Embedding response leaked sensitive configuration.");
        return;
      }

      onEmbedded(embeddedDocument);
    } catch {
      setError("Embedding failed. Please try again.");
    } finally {
      setIsEmbedding(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div>
        <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Embedding settings
        </h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Generate semantic vectors for each chunk using Google Gemini.
        </p>
      </div>

      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          Embedding model
        </span>
        <input
          type="text"
          value={model}
          onChange={(event) => setModel(event.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>

      <button
        type="button"
        onClick={() => void handleEmbed()}
        disabled={isEmbedding}
        className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {isEmbedding ? "Generating embeddings..." : "Generate embeddings"}
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
