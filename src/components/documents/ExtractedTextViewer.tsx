type ExtractedTextViewerProps = {
  text: string;
};

export function ExtractedTextViewer({ text }: ExtractedTextViewerProps) {
  return (
    <div className="flex min-h-64 flex-col rounded-lg border border-zinc-200 dark:border-zinc-800">
      <div className="border-b border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
        Extracted text
      </div>
      <pre
        className="flex-1 overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-sm leading-6 text-zinc-900 dark:text-zinc-100"
      >
        {text}
      </pre>
    </div>
  );
}
