import type { ChunkedDocument } from "@/lib/rag/types";

type ChunkListProps = {
  chunkedDocument: ChunkedDocument;
};

export function ChunkList({ chunkedDocument }: ChunkListProps) {
  const { chunks, chunking } = chunkedDocument;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900/50">
        <p className="font-medium text-zinc-900 dark:text-zinc-100">
          {chunking.totalChunks} chunk{chunking.totalChunks === 1 ? "" : "s"}{" "}
          generated
        </p>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Size: {chunking.chunkSize} characters · Overlap:{" "}
          {chunking.chunkOverlap} characters
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {chunks.map((chunk) => (
          <article
            key={chunk.id}
            className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
          >
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 px-4 py-3 text-sm dark:border-zinc-800">
              <div className="font-medium text-zinc-900 dark:text-zinc-100">
                Chunk {chunk.index}
              </div>
              <div className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                chars {chunk.metadata.startChar}–{chunk.metadata.endChar} ·{" "}
                {chunk.text.length} chars
              </div>
            </header>
            <pre className="overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-sm leading-6 text-zinc-900 dark:text-zinc-100">
              {chunk.text}
            </pre>
          </article>
        ))}
      </div>
    </div>
  );
}
