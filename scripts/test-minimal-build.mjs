import { spawn } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveNodeBinary } from "./ensure-node.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");

const backups = new Map();

async function backup(relPath, contents) {
  backups.set(relPath, contents);
}

async function restoreAll() {
  for (const [relPath, contents] of backups) {
    await writeFile(path.join(root, relPath), contents, "utf8");
  }
}

async function runBuild(label) {
  const nodeBinary = await resolveNodeBinary();
  console.log(`\n=== ${label} ===`);

  return new Promise((resolve) => {
    const child = spawn(nodeBinary, [nextBin, "build", "--webpack"], {
      cwd: root,
      stdio: "inherit",
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
    });

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      console.log(`TIMEOUT after 90s for: ${label}`);
      resolve(false);
    }, 180_000);

    child.on("exit", (code) => {
      clearTimeout(timer);
      resolve(code === 0);
    });
  });
}

const pagePath = "src/app/page.tsx";
const cssPath = "src/app/globals.css";
const configPath = "next.config.ts";

const originalPage = await readFile(path.join(root, pagePath), "utf8");
const originalCss = await readFile(path.join(root, cssPath), "utf8");
const originalConfig = await readFile(path.join(root, configPath), "utf8");

backup(pagePath, originalPage);
backup(cssPath, originalCss);
backup(configPath, originalConfig);

try {
  await writeFile(
    path.join(root, pagePath),
    `export default function Home() {\n  return <main>OK</main>;\n}\n`,
    "utf8",
  );
  await writeFile(
    path.join(root, cssPath),
    `body { margin: 0; font-family: sans-serif; }\n`,
    "utf8",
  );
  await writeFile(
    path.join(root, configPath),
    `import type { NextConfig } from "next";\nconst nextConfig: NextConfig = { compress: false };\nexport default nextConfig;\n`,
    "utf8",
  );

  const minimalOk = await runBuild("minimal (no tailwind, no chroma config)");
  console.log(`Minimal build: ${minimalOk ? "PASS" : "FAIL"}`);

  await writeFile(
    path.join(root, pagePath),
    `export default function Home() {\n  return <main className="p-10 text-lg">OK</main>;\n}\n`,
    "utf8",
  );
  await writeFile(path.join(root, cssPath), originalCss, "utf8");
  await writeFile(path.join(root, configPath), originalConfig, "utf8");

  const tailwindOk = await runBuild("tailwind + minimal page");
  console.log(`Tailwind build: ${tailwindOk ? "PASS" : "FAIL"}`);

  await writeFile(path.join(root, pagePath), originalPage, "utf8");

  const fullOk = await runBuild("full app (current sources)");
  console.log(`Full build: ${fullOk ? "PASS" : "FAIL"}`);
} finally {
  await restoreAll();
  console.log("\nRestored original source files.");
}
