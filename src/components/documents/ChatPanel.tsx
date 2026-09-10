"use client";

import { getApiErrorMessage } from "@/lib/api/parse-error";
import { DEFAULT_TOP_K } from "@/lib/vector-store/constants";
import type { ChatResponse } from "@/lib/chat/types";
import { useState } from "react";

type ChatPanelProps = {
  documentId?: string;
};

export function ChatPanel({ documentId }: ChatPanelProps) {
  const [query, setQuery] = useState("");
  const [topK, setTopK] = useState(DEFAULT_TOP_K);
  const [isAsking, setIsAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatResponse, setChatResponse] = useState<ChatResponse | null>(null);

  async function handleAsk() {
    setIsAsking(true);
    setError(null);

    try {
      const response = await fetch("/api/chat", {
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
        setError(
          getApiErrorMessage(payload, "Chat request failed. Please try again."),
        );
        setChatResponse(null);
        return;
      }

      setChatResponse(payload as ChatResponse);
    } catch {
      setError("Chat request failed. Please try again.");
      setChatResponse(null);
    } finally {
      setIsAsking(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div>
        <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Ask Knowledge Assistant
        </h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Gemini generates a polished answer grounded in retrieved chunks.
          Use Semantic Search above to inspect raw retrieval results.
        </p>
      </div>

      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          Question
        </span>
        <textarea
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          rows={3}
          placeholder="How do I compile a .tex file into a PDF?"
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
        onClick={() => void handleAsk()}
        disabled={isAsking || !query.trim()}
        className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {isAsking ? "Generating answer..." : "Ask"}
      </button>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
        >
          {error}
        </div>
      )}

      {chatResponse && (
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
            <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Answer
            </h4>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-800 dark:text-zinc-200">
              {chatResponse.answer}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Sources
            </h4>
            {chatResponse.sources.length === 0 ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                No sources met the relevance threshold for this question.
              </p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                {chatResponse.sources.map((source) => (
                  <li
                    key={source.chunkId}
                    className="rounded-md border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950"
                  >
                    <span className="font-medium">{source.filename}</span>
                    <span className="text-zinc-500 dark:text-zinc-400">
                      {" "}
                      — Chunk {source.chunkIndex} (similarity{" "}
                      {source.similarity.toFixed(4)})
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
