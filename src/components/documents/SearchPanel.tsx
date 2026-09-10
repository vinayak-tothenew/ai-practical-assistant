"use client";

import { DEFAULT_TOP_K } from "@/lib/vector-store/constants";
import { getApiErrorMessage } from "@/lib/api/parse-error";
import type { SearchResponse } from "@/lib/vector-store/types";
import { useState } from "react";

type SearchPanelProps = {
  documentId?: string;
};

export function SearchPanel({ documentId }: SearchPanelProps) {
  const [query, setQuery] = useState("");
  const [topK, setTopK] = useState(DEFAULT_TOP_K);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(
    null,
  );

  async function handleSearch() {
    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          topK,
          documentId,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(getApiErrorMessage(payload, "Search failed. Please try again."));
        setSearchResponse(null);
        return;
      }

      setSearchResponse(payload as SearchResponse);
    } catch {
      setError("Search failed. Please try again.");
      setSearchResponse(null);
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div>
        <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Semantic search
        </h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Inspect raw retrieval results using embeddings and cosine similarity.
          Use Ask Knowledge Assistant below for Gemini-generated answers.
        </p>
      </div>

      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          Query
        </span>
        <textarea
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          rows={3}
          placeholder="How many vacation days do employees get?"
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>

      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          Top K
        </span>
        <input
          type="number"
          min={1}
          max={20}
          value={topK}
          onChange={(event) => setTopK(Number(event.target.value))}
          className="w-32 rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>

      <button
        type="button"
        onClick={() => void handleSearch()}
        disabled={isSearching || !query.trim()}
        className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {isSearching ? "Searching..." : "Search"}
      </button>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
        >
          {error}
        </div>
      )}

      {searchResponse && (
        <div className="flex flex-col gap-3">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900/50">
            Model: {searchResponse.search.model} · Metric:{" "}
            {searchResponse.search.distanceMetric} · Results:{" "}
            {searchResponse.search.totalResults}
          </div>

          {searchResponse.results.map((result, index) => (
            <article
              key={result.chunkId}
              className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
            >
              <header className="border-b border-zinc-200 px-4 py-3 text-sm dark:border-zinc-800">
                <div className="font-medium text-zinc-900 dark:text-zinc-100">
                  #{index + 1} · {result.filename} · Chunk {result.chunkIndex}
                </div>
                <div className="mt-1 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                  similarity {result.similarity.toFixed(4)} · distance{" "}
                  {result.distance.toFixed(4)}
                </div>
              </header>
              <pre className="overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-sm leading-6 text-zinc-900 dark:text-zinc-100">
                {result.text}
              </pre>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
