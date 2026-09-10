import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, "..", "test-fixtures");
const baseUrl = process.env.TEST_BASE_URL ?? "http://localhost:3000";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertNoSecrets(raw) {
  assert(!raw.includes("AIza"), "API response should not include API key material");
  assert(!raw.includes("GEMINI_API_KEY"), "API response should not include env var names with secrets");
}

async function ingest(filename) {
  const buffer = await readFile(path.join(fixturesDir, filename));
  const formData = new FormData();
  const mimeType = filename.endsWith(".txt") ? "text/plain" : "application/pdf";
  formData.append("file", new Blob([buffer], { type: mimeType }), filename);

  const response = await fetch(`${baseUrl}/api/documents/ingest`, {
    method: "POST",
    body: formData,
  });

  const body = await response.json();
  assert(response.ok, `Ingest failed: ${JSON.stringify(body)}`);
  return body;
}

async function chunk(document) {
  const response = await fetch(`${baseUrl}/api/documents/chunk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ document, chunkSize: 150, chunkOverlap: 30 }),
  });

  const body = await response.json();
  assert(response.ok, `Chunk failed: ${JSON.stringify(body)}`);
  return body;
}

async function embed(chunkedDocument) {
  const response = await fetch(`${baseUrl}/api/documents/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chunkedDocument }),
  });

  const body = await response.json();
  return { status: response.status, body, raw: JSON.stringify(body) };
}

console.log("Ingesting and chunking test-policy.txt...");
const document = await ingest("test-policy.txt");
const chunkedDocument = await chunk(document);

console.log(`Chunks to embed: ${chunkedDocument.chunks.length}`);

const result = await embed(chunkedDocument);
assertNoSecrets(result.raw);

if (result.status !== 200) {
  assert(
    result.body.error?.code === "EMBEDDING_CONFIG_ERROR",
    `Expected live embed to succeed or return EMBEDDING_CONFIG_ERROR, got ${JSON.stringify(result.body)}`,
  );
  console.log(
    "✗ Live embed blocked: set GEMINI_API_KEY in .env.local and restart npm run dev",
  );
  process.exit(1);
}

const success = result;
assertNoSecrets(success.raw);

const { embeddedChunks, embedding } = success.body;
assert(
  embeddedChunks.length === chunkedDocument.chunks.length,
  "Every chunk should receive exactly one embedding",
);
assert(embedding.totalEmbedded === embeddedChunks.length, "totalEmbedded mismatch");
assert(
  embedding.model === "gemini-embedding-001",
  `Expected gemini-embedding-001, got ${embedding.model}`,
);

for (const [index, embeddedChunk] of embeddedChunks.entries()) {
  const sourceChunk = chunkedDocument.chunks[index];
  assert(embeddedChunk.id === sourceChunk.id, `chunk id mismatch at ${index}`);
  assert(
    embeddedChunk.documentId === sourceChunk.documentId,
    `documentId mismatch at ${index}`,
  );
  assert(embeddedChunk.embedding.length > 0, `empty embedding at ${index}`);
  assert(
    embeddedChunk.dimensions === embeddedChunk.embedding.length,
    `dimensions must equal embedding.length at ${index}`,
  );
  assert(
    embeddedChunk.embeddingModel === "gemini-embedding-001",
    `unexpected embedding model at ${index}`,
  );
}

assert(
  embedding.dimensions === embeddedChunks[0].dimensions,
  "Top-level dimensions should match returned vectors",
);

console.log(`✓ generated ${embeddedChunks.length} Gemini embeddings`);
console.log(
  `✓ model=${embedding.model}, dimensions=${embedding.dimensions}`,
);
console.log(
  `✓ sample vector preview: [${embeddedChunks[0].embedding
    .slice(0, 5)
    .map((value) => value.toFixed(3))
    .join(", ")}, ...]`,
);

console.log("\nAll Gemini embedding tests passed.");
