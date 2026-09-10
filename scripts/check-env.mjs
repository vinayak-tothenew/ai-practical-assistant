import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const envLocalPath = path.join(root, ".env.local");
const envExamplePath = path.join(root, ".env.example");

const [major, minor] = process.versions.node.split(".").map(Number);

if (major < 20 || (major === 20 && minor < 9)) {
  console.error(
    `Node.js ${process.versions.node} is too old. Next.js 16 requires Node 20.9+.`,
  );
  process.exit(1);
}

if (major >= 24) {
  console.warn(
    `Warning: Node.js ${process.versions.node} can cause slow or stuck compiles with Next.js 16.`,
  );
  console.warn("Recommended: install Node 22 LTS from https://nodejs.org/");
}

let envContents = "";
try {
  envContents = await readFile(envLocalPath, "utf8");
} catch {
  console.warn(
    "Missing .env.local — copy .env.example to .env.local and set GEMINI_API_KEY for embeddings.",
  );
  try {
    await readFile(envExamplePath, "utf8");
    console.warn("  cp .env.example .env.local   (then edit GEMINI_API_KEY)");
  } catch {
    // .env.example missing is unexpected but non-fatal for dev startup.
  }
}

if (envContents) {
  const match = envContents.match(/^GEMINI_API_KEY=(.*)$/m);
  const value = match?.[1]?.trim();

  if (!value) {
    console.warn(
      "GEMINI_API_KEY is empty in .env.local — upload/chunk work; embeddings need a key.",
    );
  } else {
    console.log("Environment check passed (GEMINI_API_KEY configured).");
  }
}
