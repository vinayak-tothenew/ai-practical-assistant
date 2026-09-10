import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const envPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  ".env.local",
);

try {
  const contents = await readFile(envPath, "utf8");
  const match = contents.match(/^GEMINI_API_KEY=(.+)$/m);
  const value = match?.[1]?.trim();

  if (!value || value === "your_actual_key") {
    console.error(
      "GEMINI_API_KEY is missing or still set to the placeholder in .env.local",
    );
    process.exit(1);
  }

  console.log("GEMINI_API_KEY is configured in .env.local");
} catch {
  console.error(
    "Missing .env.local. Create it in the project root with GEMINI_API_KEY=...",
  );
  process.exit(1);
}
