"use client";

import { ChunkList } from "@/components/documents/ChunkList";
import { DocumentChunker } from "@/components/documents/DocumentChunker";
import { DocumentEmbedder } from "@/components/documents/DocumentEmbedder";
import { DocumentIndexer } from "@/components/documents/DocumentIndexer";
import { DocumentMetadata } from "@/components/documents/DocumentMetadata";
import { DocumentUpload } from "@/components/documents/DocumentUpload";
import { EmbeddedChunkList } from "@/components/documents/EmbeddedChunkList";
import { ExtractedTextViewer } from "@/components/documents/ExtractedTextViewer";
import { SearchPanel } from "@/components/documents/SearchPanel";
import type { EmbeddedChunkedDocument } from "@/lib/embeddings/types";
import type { IngestedDocument } from "@/lib/documents/types";
import type { ChunkedDocument } from "@/lib/rag/types";
import type { IndexResponse } from "@/lib/vector-store/types";
import { useState } from "react";

export function PipelineWorkspace() {
  const [document, setDocument] = useState<IngestedDocument | null>(null);
  const [chunkedDocument, setChunkedDocument] = useState<ChunkedDocument | null>(
    null,
  );
  const [embeddedDocument, setEmbeddedDocument] =
    useState<EmbeddedChunkedDocument | null>(null);
  const [indexResponse, setIndexResponse] = useState<IndexResponse | null>(
    null,
  );

  function handleIngested(ingestedDocument: IngestedDocument) {
    setDocument(ingestedDocument);
    setChunkedDocument(null);
    setEmbeddedDocument(null);
    setIndexResponse(null);
  }

  function handleChunked(nextChunkedDocument: ChunkedDocument) {
    setChunkedDocument(nextChunkedDocument);
    setEmbeddedDocument(null);
    setIndexResponse(null);
  }

  function handleEmbedded(nextEmbeddedDocument: EmbeddedChunkedDocument) {
    setEmbeddedDocument(nextEmbeddedDocument);
    setIndexResponse(null);
  }

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-black">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Enterprise Knowledge Assistant
          </h1>
          <p className="max-w-2xl text-zinc-600 dark:text-zinc-400">
            Milestone 4: ingest, chunk, embed, index in ChromaDB, and retrieve
            relevant policy chunks with semantic search.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-2">
          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
              Upload document
            </h2>
            <DocumentUpload onIngested={handleIngested} />
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
              Ingestion result
            </h2>

            {document ? (
              <div className="flex flex-col gap-4">
                <div
                  className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950/30 dark:text-green-300"
                >
                  Successfully extracted text from {document.metadata.filename}
                </div>
                <DocumentMetadata
                  documentId={document.id}
                  metadata={document.metadata}
                />
                <ExtractedTextViewer text={document.extractedText} />
                <DocumentChunker
                  document={document}
                  onChunked={handleChunked}
                />
              </div>
            ) : (
              <div
                className="flex min-h-64 items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-white px-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400"
              >
                Upload a document to see extracted text and metadata here.
              </div>
            )}
          </section>
        </div>

        {chunkedDocument && (
          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
              Chunking result
            </h2>
            <ChunkList chunkedDocument={chunkedDocument} />
            <DocumentEmbedder
              chunkedDocument={chunkedDocument}
              onEmbedded={handleEmbedded}
            />
          </section>
        )}

        {embeddedDocument && (
          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
              Embedding result
            </h2>
            <EmbeddedChunkList embeddedDocument={embeddedDocument} />
            <DocumentIndexer
              embeddedDocument={embeddedDocument}
              onIndexed={setIndexResponse}
            />
          </section>
        )}

        {indexResponse && (
          <section className="flex flex-col gap-4">
            <div
              className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950/30 dark:text-green-300"
            >
              Indexed {indexResponse.indexedChunks} chunks into{" "}
              {indexResponse.collection} using {indexResponse.distanceMetric}{" "}
              distance.
            </div>
            <SearchPanel documentId={document?.id} />
          </section>
        )}
      </main>
    </div>
  );
}
