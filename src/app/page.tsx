import dynamic from "next/dynamic";

const PipelineWorkspace = dynamic(
  () =>
    import("@/components/documents/PipelineWorkspace").then(
      (module) => module.PipelineWorkspace,
    ),
  {
    loading: () => (
      <main className="mx-auto flex min-h-full max-w-6xl items-center justify-center px-6 py-10">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Loading workspace...
        </p>
      </main>
    ),
  },
);

export default function Home() {
  return <PipelineWorkspace />;
}
