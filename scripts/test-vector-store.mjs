import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ChromaClient } from "chromadb";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, "..", "test-fixtures");
const baseUrl = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const integrationCollection =
  process.env.CHROMA_COLLECTION ?? "enterprise-knowledge-integration-test";

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

async function getJson(url) {
  const response = await fetch(url);
  const payload = await response.json();
  return { status: response.status, body: payload };
}

function getChromaClient() {
  const host = process.env.CHROMA_HOST ?? "localhost";
  const port = Number.parseInt(process.env.CHROMA_PORT ?? "8000", 10);

  return new ChromaClient({ host, port });
}

async function resetIntegrationCollection(collectionName) {
  const client = getChromaClient();

  try {
    await client.deleteCollection({ name: collectionName });
  } catch {
    // Collection may not exist yet — that is the desired empty state.
  }
}

async function ingest(filename) {
  const buffer = await readFile(path.join(fixturesDir, filename));
  const formData = new FormData();
  formData.append(
    "file",
    new Blob([buffer], { type: "text/plain" }),
    filename,
  );

  const response = await fetch(`${baseUrl}/api/documents/ingest`, {
    method: "POST",
    body: formData,
  });

  const body = await response.json();
  assert(response.ok, `Ingest failed: ${JSON.stringify(body)}`);
  return body;
}

async function ensureChromaAvailable() {
  const emptySearch = await postJson(`${baseUrl}/api/search`, {
    query: "test connectivity",
    topK: 1,
  });

  if (emptySearch.body.error?.code === "VECTOR_STORE_UNAVAILABLE") {
    console.log(
      "✗ ChromaDB is not running. Start it with npm run chroma:docker (Windows x64) or npm run chroma (macOS/Linux).",
    );
    process.exit(1);
  }
}

async function ensureServerUsesIntegrationCollection() {
  const status = await getJson(`${baseUrl}/api/search/status`);

  assert(
    status.status === 200,
    `Expected /api/search/status to succeed, got ${status.status}`,
  );

  if (status.body.collection !== integrationCollection) {
    throw new Error(
      `Dev server collection mismatch. Expected "${integrationCollection}" but server is using "${status.body.collection}". ` +
        `Restart the dev server with CHROMA_COLLECTION=${integrationCollection} so integration tests do not touch enterprise-knowledge.`,
    );
  }

  return status.body;
}

console.log("Checking ChromaDB connectivity...");
await ensureChromaAvailable();
console.log("✓ ChromaDB is reachable");

console.log(`Resetting isolated test collection "${integrationCollection}"...`);
await resetIntegrationCollection(integrationCollection);
console.log("✓ integration test collection reset");

const status = await ensureServerUsesIntegrationCollection();
assert(
  status.recordCount === 0,
  `Expected recordCount 0 after reset, got ${status.recordCount}`,
);
console.log("✓ dev server points at empty integration test collection");

const emptySearch = await postJson(`${baseUrl}/api/search`, {
  query: "annual leave entitlement",
  topK: 3,
});
assert(emptySearch.status === 404, "Expected empty index search to return 404");
assert(
  emptySearch.body.error?.code === "SEARCH_NO_INDEX",
  `Expected SEARCH_NO_INDEX, got ${emptySearch.body.error?.code}`,
);
console.log("✓ empty index returns SEARCH_NO_INDEX");

const emptyQuery = await postJson(`${baseUrl}/api/search`, { query: "   " });
assert(emptyQuery.status === 400, "Expected empty query to return 400");
assert(emptyQuery.body.error?.code === "EMPTY_QUERY");
console.log("✓ empty query rejected");

if (!process.env.GEMINI_API_KEY) {
  console.log(
    "\nSet GEMINI_API_KEY in .env.local for live Gemini index/search tests.",
  );
  process.exit(0);
}

const document = await ingest("test-policy.txt");
const chunked = (
  await postJson(`${baseUrl}/api/documents/chunk`, {
    document,
    chunkSize: 150,
    chunkOverlap: 30,
  })
).body;

const embedded = (
  await postJson(`${baseUrl}/api/documents/embed`, {
    chunkedDocument: chunked,
  })
).body;

assert(embedded.embeddedChunks?.length > 0, "Expected embedded chunks");
console.log(`✓ embedded ${embedded.embeddedChunks.length} chunks`);

const indexed = (
  await postJson(`${baseUrl}/api/documents/index`, {
    embeddedDocument: embedded,
  })
).body;

assert(indexed.distanceMetric === "cosine", "Expected cosine distance metric");
assert(indexed.indexedChunks === embedded.embeddedChunks.length);
assert(
  indexed.collection === integrationCollection,
  `Expected indexing into ${integrationCollection}, got ${indexed.collection}`,
);
console.log(`✓ indexed ${indexed.indexedChunks} chunks into ${indexed.collection}`);

const semanticResponse = await postJson(`${baseUrl}/api/search`, {
  query: "How many vacation days do employees get?",
  topK: 3,
});
const semantic = semanticResponse.body;

assert(semantic.results.length > 0, "Expected semantic search results");
assert(
  semantic.search.distanceMetric === "cosine",
  "Expected cosine in search response",
);

const top = semantic.results[0];
assert(top.similarity >= top.similarity - 1, "Similarity should be numeric");
assert(
  Math.abs(top.similarity - (1 - top.distance)) < 0.0001,
  "Similarity should equal 1 - cosine distance",
);
assert(
  top.text.toLowerCase().includes("24") ||
    top.text.toLowerCase().includes("annual leave"),
  "Top result should reference annual leave content",
);
console.log(
  `✓ semantic search top result similarity=${top.similarity.toFixed(4)} distance=${top.distance.toFixed(4)}`,
);

const entitlement = (
  await postJson(`${baseUrl}/api/search`, {
    query: "What is my annual leave entitlement?",
    topK: 3,
  })
).body;

assert(entitlement.results.length > 0, "Expected entitlement query results");
console.log("✓ semantically different query still returns results");

const filtered = (
  await postJson(`${baseUrl}/api/search`, {
    query: "annual leave",
    topK: 3,
    documentId: document.id,
  })
).body;

assert(
  filtered.results.every((result) => result.documentId === document.id),
  "documentId filter should restrict results",
);
console.log("✓ documentId filtering works");

const ordering = semantic.results;
for (let index = 1; index < ordering.length; index += 1) {
  assert(
    ordering[index - 1].similarity >= ordering[index].similarity,
    "Results should be ordered by descending similarity",
  );
}
console.log("✓ top-k results are similarity-ordered");

assert(!semanticResponse.raw.includes("AIza"), "Search response must not leak API key");
assert(!semanticResponse.raw.includes("GEMINI_API_KEY"), "Search response must not leak env secrets");
console.log("\nAll vector-store tests passed.");
