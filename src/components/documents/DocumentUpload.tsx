"use client";

import { MAX_FILE_SIZE_BYTES } from "@/lib/documents/constants";
import { getApiErrorMessage } from "@/lib/api/parse-error";
import type { IngestedDocument } from "@/lib/documents/types";
import { validateClientFile } from "@/lib/documents/client-validation";
import { useCallback, useRef, useState } from "react";

type DocumentUploadProps = {
  onIngested: (document: IngestedDocument) => void;
};

function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb} MB`;
}

export function DocumentUpload({ onIngested }: DocumentUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = useCallback(
    async (file: File) => {
      const clientError = validateClientFile(file);
      if (clientError) {
        setError(clientError);
        return;
      }

      setIsUploading(true);
      setError(null);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/documents/ingest", {
          method: "POST",
          body: formData,
        });

        const payload = await response.json();

        if (!response.ok) {
          setError(
            getApiErrorMessage(payload, "Upload failed. Please try again."),
          );
          return;
        }

        const document = payload as IngestedDocument;
        onIngested(document);
      } catch {
        setError("Upload failed. Please try again.");
      } finally {
        setIsUploading(false);
      }
    },
    [onIngested],
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (!file) {
        return;
      }
      void uploadFile(file);
    },
    [uploadFile],
  );

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      handleFiles(event.dataTransfer.files);
    },
    [handleFiles],
  );

  return (
    <div className="flex flex-col gap-4">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDrop={onDrop}
        className={[
          "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors",
          isDragging
            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
            : "border-zinc-300 bg-white hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:border-zinc-500",
          isUploading ? "pointer-events-none opacity-60" : "",
        ].join(" ")}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          className="hidden"
          disabled={isUploading}
          onChange={(event) => handleFiles(event.target.files)}
        />

        <p className="text-base font-medium text-zinc-900 dark:text-zinc-100">
          {isUploading ? "Processing document..." : "Drop a document here"}
        </p>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          or click to browse
        </p>
        <p className="mt-4 text-xs text-zinc-400 dark:text-zinc-500">
          PDF, DOCX, or TXT up to {formatBytes(MAX_FILE_SIZE_BYTES)}
        </p>
      </div>

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
