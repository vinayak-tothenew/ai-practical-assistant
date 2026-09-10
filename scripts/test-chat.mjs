import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, "..", "test-fixtures");
const baseUrl = process.env.TEST_BASE_URL ?? "http://localhost:3000";

async function loadEnvLocal() {
  try {
    const contents = await readFile(path.join(__dirname, "..", ".env.local"), "utf8");
    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separator = trimmed.indexOf("=");
      if (separator === -1) {
        continue;
      }

      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim();

      if (!process.env[key] && value) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env.local is optional for partial tests.
  }
}

await loadEnvLocal();

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = await response.json();
  return { status: response.status, body: payload, raw: JSON.stringify(payload) };
}

async function ingestFile(filename, mimeType) {
  const filePath = path.join(fixturesDir, filename);
  assert(existsSync(filePath), `Missing fixture: ${filePath}`);

  const buffer = await readFile(filePath);
  const formData = new FormData();
  formData.append("file", new Blob([buffer], { type: mimeType }), filename);

  const response = await fetch(`${baseUrl}/api/documents/ingest`, {
    method: "POST",
    body: formData,
  });

  const body = await response.json();
  assert(response.ok, `Ingest failed for ${filename}: ${JSON.stringify(body)}`);
  return body;
}

async function indexDocument(document) {
  const chunked = (
    await postJson(`${baseUrl}/api/documents/chunk`, {
      document,
      chunkSize: 200,
      chunkOverlap: 40,
    })
  ).body;

  const embedded = (
    await postJson(`${baseUrl}/api/documents/embed`, {
      chunkedDocument: chunked,
    })
  ).body;

  const indexed = (
    await postJson(`${baseUrl}/api/documents/index`, {
      embeddedDocument: embedded,
    })
  ).body;

  return { document, indexed };
}

async function ensureChromaAvailable() {
  const probe = await postJson(`${baseUrl}/api/search`, {
    query: "connectivity check",
    topK: 1,
  });

  if (probe.body.error?.code === "VECTOR_STORE_UNAVAILABLE") {
    console.log(
      "✗ ChromaDB is not running. Start it with npm run chroma:docker (Windows x64) or npm run chroma (macOS/Linux).",
    );
    process.exit(1);
  }
}

console.log("Checking ChromaDB connectivity...");
await ensureChromaAvailable();
console.log("✓ ChromaDB is reachable");

const emptyQuery = await postJson(`${baseUrl}/api/chat`, { query: "   " });
assert(emptyQuery.status === 400, "Expected empty query to return 400");
assert(
  emptyQuery.body.error?.code === "EMPTY_QUERY" ||
    emptyQuery.body.error?.code === "INVALID_REQUEST",
  `Expected validation error, got ${emptyQuery.body.error?.code}`,
);
console.log("✓ empty query rejected");

if (!process.env.GEMINI_API_KEY) {
  console.log(
    "\nSet GEMINI_API_KEY in .env.local for live index/chat retrieval tests.",
  );
  process.exit(0);
}

if (!existsSync(path.join(fixturesDir, "sample.pdf"))) {
  console.log(
    "✗ Missing test-fixtures/sample.pdf. Run: node scripts/generate-test-fixtures.mjs",
  );
  process.exit(1);
}

const { document, indexed } = await indexDocument(
  await ingestFile("sample.pdf", "application/pdf"),
);

assert(indexed.indexedChunks > 0, "Expected indexed chunks from sample.pdf");
console.log(`✓ indexed sample.pdf (${indexed.indexedChunks} chunks)`);

const relevant = await postJson(`${baseUrl}/api/chat`, {
  query: "How do I compile a .tex file into a PDF?",
  topK: 3,
  documentId: document.id,
});

assert(relevant.status === 200, `Relevant chat failed: ${JSON.stringify(relevant.body)}`);
assert(relevant.body.sources.length > 0, "Expected relevant sources for LaTeX query");
assert(
  relevant.body.sources.every((source) => source.filename === "sample.pdf"),
  "Expected sources from sample.pdf",
);
assert(
  relevant.body.answer.toLowerCase().includes("pdflatex") ||
    relevant.body.answer.toLowerCase().includes("latex"),
  "Expected Gemini answer to reference LaTeX compilation",
);
assert(
  !relevant.body.answer.toLowerCase().includes("annual leave"),
  "Relevant answer should not invent leave policy content",
);
console.log(`✓ relevant LaTeX query produced grounded Gemini answer (model: ${relevant.body.chat.model})`);

const irrelevant = await postJson(`${baseUrl}/api/chat`, {
  query: "What is the employee annual leave policy?",
  topK: 3,
  documentId: document.id,
});

assert(irrelevant.status === 200, `Irrelevant chat failed: ${JSON.stringify(irrelevant.body)}`);
assert(
  irrelevant.body.answer.toLowerCase().includes("couldn't find") ||
    irrelevant.body.answer.toLowerCase().includes("not found") ||
    irrelevant.body.answer.toLowerCase().includes("do not contain"),
  "Expected grounded not-found response for off-topic query",
);
assert(
  !irrelevant.body.answer.toLowerCase().includes("24 annual leave"),
  "Irrelevant answer must not fabricate leave policy details",
);
console.log("✓ irrelevant leave-policy query returned grounded not-found response");

const search = await postJson(`${baseUrl}/api/search`, {
  query: "How do I compile a .tex file into a PDF?",
  topK: 3,
  documentId: document.id,
});

assert(search.status === 200, "Expected search to succeed for source verification");
const searchIds = new Set(search.body.results.map((result) => result.chunkId));

for (const source of relevant.body.sources) {
  assert(searchIds.has(source.chunkId), `Source chunk ${source.chunkId} must exist in search results`);
  const match = search.body.results.find((result) => result.chunkId === source.chunkId);
  assert(match.filename === source.filename, "Source filename must match search metadata");
  assert(match.chunkIndex === source.chunkIndex, "Source chunkIndex must match search metadata");
  assert(
    Math.abs(match.similarity - source.similarity) < 0.0001,
    "Source similarity must match search metadata",
  );
}
console.log("✓ chat sources correspond to retrieved chunks");

assert(!relevant.raw.includes("GEMINI_API_KEY"), "Chat response must not leak env secrets");
if (process.env.GEMINI_API_KEY) {
  assert(
    !relevant.raw.includes(process.env.GEMINI_API_KEY),
    "Chat response must not leak API key material",
  );
}
console.log("✓ chat response does not leak secrets");

if (process.env.CHAT_TEST_FORCE_PROVIDER_ERROR === "1") {
  const forced = await postJson(`${baseUrl}/api/chat`, {
    query: "How do I compile a .tex file into a PDF?",
    topK: 1,
    documentId: document.id,
  });

  assert(forced.status === 502, "Expected forced provider error status 502");
  assert(
    forced.body.error?.code === "CHAT_PROVIDER_ERROR",
    `Expected CHAT_PROVIDER_ERROR, got ${forced.body.error?.code}`,
  );
  console.log("✓ Gemini provider failure returns controlled error");
} else {
  console.log(
    "ℹ Skipping forced provider failure test. Restart dev server with CHAT_TEST_FORCE_PROVIDER_ERROR=1 to run it.",
  );
}

console.log("\nAll chat tests passed.");
