import type { DocumentMetadata } from "@/lib/documents/types";

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString();
}

type DocumentMetadataProps = {
  documentId: string;
  metadata: DocumentMetadata;
};

export function DocumentMetadata({
  documentId,
  metadata,
}: DocumentMetadataProps) {
  return (
    <dl className="grid gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
        <dt className="font-medium text-zinc-500 dark:text-zinc-400">
          Document ID
        </dt>
        <dd className="font-mono text-xs text-zinc-900 dark:text-zinc-100">
          {documentId}
        </dd>
      </div>
      <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
        <dt className="font-medium text-zinc-500 dark:text-zinc-400">
          Filename
        </dt>
        <dd className="text-zinc-900 dark:text-zinc-100">{metadata.filename}</dd>
      </div>
      <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
        <dt className="font-medium text-zinc-500 dark:text-zinc-400">Type</dt>
        <dd className="uppercase text-zinc-900 dark:text-zinc-100">
          {metadata.extension}
        </dd>
      </div>
      <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
        <dt className="font-medium text-zinc-500 dark:text-zinc-400">
          MIME type
        </dt>
        <dd className="text-zinc-900 dark:text-zinc-100">{metadata.mimeType}</dd>
      </div>
      <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
        <dt className="font-medium text-zinc-500 dark:text-zinc-400">Size</dt>
        <dd className="text-zinc-900 dark:text-zinc-100">
          {formatBytes(metadata.sizeBytes)}
        </dd>
      </div>
      <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
        <dt className="font-medium text-zinc-500 dark:text-zinc-400">
          Ingested at
        </dt>
        <dd className="text-zinc-900 dark:text-zinc-100">
          {formatTimestamp(metadata.ingestedAt)}
        </dd>
      </div>
    </dl>
  );
}
