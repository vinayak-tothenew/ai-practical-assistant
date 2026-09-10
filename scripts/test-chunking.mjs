import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, "..", "test-fixtures");
const baseUrl = process.env.TEST_BASE_URL ?? "http://localhost:3000";

async function ingest(filename) {
  const buffer = await readFile(path.join(fixturesDir, filename));
  const formData = new FormData();
  const mimeType =
    filename.endsWith(".pdf")
      ? "application/pdf"
      : filename.endsWith(".docx")
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : "text/plain";

  formData.append(
    "file",
    new Blob([buffer], { type: mimeType }),
    filename,
  );

  const response = await fetch(`${baseUrl}/api/documents/ingest`, {
    method: "POST",
    body: formData,
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(`Ingest failed: ${JSON.stringify(body)}`);
  }

  return body;
}

async function chunk(document, chunkSize, chunkOverlap) {
  const response = await fetch(`${baseUrl}/api/documents/chunk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ document, chunkSize, chunkOverlap }),
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(`Chunk failed: ${JSON.stringify(body)}`);
  }

  return body;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function verifyChunks(chunkedDocument, originalText) {
  const { chunks, chunking } = chunkedDocument;

  assert(chunks.length > 0, "Expected at least one chunk");
  assert(
    chunking.totalChunks === chunks.length,
    "totalChunks should match chunks array length",
  );

  for (const [index, chunk] of chunks.entries()) {
    assert(chunk.documentId === chunkedDocument.documentId, "documentId mismatch");
    assert(chunk.index === index, `chunk index mismatch at ${index}`);
    assert(chunk.id, `missing chunk id at ${index}`);
    assert(chunk.text.length > 0, `empty chunk text at ${index}`);
    assert(
      chunk.text === originalText.slice(chunk.metadata.startChar, chunk.metadata.endChar),
      `chunk text mismatch at index ${index}`,
    );
    assert(
      chunk.metadata.endChar > chunk.metadata.startChar,
      `invalid char range at index ${index}`,
    );
    assert(
      chunk.metadata.filename === chunkedDocument.metadata.filename,
      "filename metadata missing",
    );
  }

  if (chunks.length > 1) {
    const first = chunks[0];
    const second = chunks[1];
    const overlapStart = second.metadata.startChar;
    const overlapEnd = first.metadata.endChar;
    assert(
      overlapStart < overlapEnd,
      "Expected overlapping character ranges between consecutive chunks",
    );

    const shared = originalText.slice(overlapStart, overlapEnd);
    assert(shared.length > 0, "Expected shared overlap text between chunks");
    assert(
      second.text.startsWith(shared) || first.text.endsWith(shared),
      "Overlap text should appear at a chunk boundary",
    );
  }
}

const scenarios = [
  { chunkSize: 800, chunkOverlap: 120, label: "default 800/120" },
  { chunkSize: 300, chunkOverlap: 50, label: "small 300/50" },
  { chunkSize: 1500, chunkOverlap: 200, label: "large 1500/200" },
];

console.log("Ingesting test-policy.txt...");
const document = await ingest("test-policy.txt");
const originalText = document.extractedText;

console.log(`Extracted text length: ${originalText.length} characters\n`);

for (const scenario of scenarios) {
  const chunkedDocument = await chunk(
    document,
    scenario.chunkSize,
    scenario.chunkOverlap,
  );

  verifyChunks(chunkedDocument, originalText);

  console.log(`✓ ${scenario.label}`);
  console.log(`  chunks: ${chunkedDocument.chunks.length}`);
  for (const chunk of chunkedDocument.chunks) {
    console.log(
      `  [${chunk.index}] chars ${chunk.metadata.startChar}-${chunk.metadata.endChar} (${chunk.text.length} chars)`,
    );
    console.log(`      preview: ${chunk.text.slice(0, 80).replace(/\n/g, " ")}...`);
  }
  console.log("");
}

const invalid = await fetch(`${baseUrl}/api/documents/chunk`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    document,
    chunkSize: 200,
    chunkOverlap: 200,
  }),
});

assert(invalid.status === 400, "Expected overlap >= size to fail");
console.log("✓ overlap >= chunk size rejected");

const longParagraph = [
  "Employee Leave Policy",
  "",
  "Employees receive 24 annual leave days per calendar year.",
  "Employees receive 12 sick leave days per year.",
  "Employees may carry forward up to 5 unused annual leave days.",
  "Leave longer than 3 consecutive working days requires manager approval.",
  "",
  "Remote Work Policy",
  "",
  "Employees may work remotely up to three days per week with manager approval.",
  "Core collaboration hours are 10:00 to 16:00 in the employee local timezone.",
  "Employees must maintain reliable internet access and a secure workspace.",
  "",
  "Expense Policy",
  "",
  "Pre-approved business travel expenses are reimbursable within thirty days.",
  "Meal reimbursements require itemized receipts and manager sign-off.",
  "Software subscriptions must be approved by IT before purchase.",
].join("\n");

const longDocument = {
  ...document,
  id: "00000000-0000-4000-8000-000000000099",
  extractedText: longParagraph,
};

console.log(`\nLong text length: ${longParagraph.length} characters`);

const longChunked = await chunk(longDocument, 300, 50);
verifyChunks(longChunked, longParagraph);
console.log(`✓ long document 300/50 -> ${longChunked.chunks.length} chunks`);
for (const chunk of longChunked.chunks) {
  console.log(
    `  [${chunk.index}] chars ${chunk.metadata.startChar}-${chunk.metadata.endChar} (${chunk.text.length} chars)`,
  );
}

const longChunkedLarge = await chunk(longDocument, 1500, 200);
verifyChunks(longChunkedLarge, longParagraph);
console.log(
  `✓ long document 1500/200 -> ${longChunkedLarge.chunks.length} chunks`,
);

console.log("\nAll chunking tests passed.");
