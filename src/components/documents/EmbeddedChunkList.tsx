import type { EmbeddedChunkedDocument } from "@/lib/embeddings/types";

type EmbeddedChunkListProps = {
  embeddedDocument: EmbeddedChunkedDocument;
};

function formatEmbeddingPreview(embedding: number[]): string {
  const preview = embedding
    .slice(0, 5)
    .map((value) => value.toFixed(3))
    .join(", ");

  return `[${preview}, ...]`;
}

export function EmbeddedChunkList({
  embeddedDocument,
}: EmbeddedChunkListProps) {
  const { embeddedChunks, embedding } = embeddedDocument;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900/50">
        <p className="font-medium text-zinc-900 dark:text-zinc-100">
          {embedding.totalEmbedded} embedding
          {embedding.totalEmbedded === 1 ? "" : "s"} generated
        </p>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Model: {embedding.model} · Dimensions: {embedding.dimensions}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {embeddedChunks.map((chunk) => (
          <article
            key={chunk.id}
            className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
          >
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 px-4 py-3 text-sm dark:border-zinc-800">
              <div className="font-medium text-zinc-900 dark:text-zinc-100">
                Chunk {chunk.index}
              </div>
              <div className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                {chunk.dimensions} dimensions · {chunk.embeddingModel}
              </div>
            </header>

            <div className="space-y-3 p-4">
              <pre className="overflow-auto whitespace-pre-wrap break-words font-mono text-sm leading-6 text-zinc-900 dark:text-zinc-100">
                {chunk.text}
              </pre>

              <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-300">
                {formatEmbeddingPreview(chunk.embedding)}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
