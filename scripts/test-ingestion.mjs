import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");
const fixturesDir = path.join(rootDir, "test-fixtures");
const baseUrl = process.env.TEST_BASE_URL ?? "http://localhost:3000";

const EXPECTED_SNIPPETS = [
  "Employee Leave Policy",
  "24 annual leave days",
  "12 sick leave days",
  "carry forward up to 5",
  "manager approval",
];

async function upload(filename, buffer, mimeType) {
  const formData = new FormData();
  const blob = new Blob([buffer], { type: mimeType });
  formData.append("file", blob, filename);

  const response = await fetch(`${baseUrl}/api/documents/ingest`, {
    method: "POST",
    body: formData,
  });

  const body = await response.json();
  return { status: response.status, body };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function testHappyPath() {
  console.log("\n=== Happy path tests ===");

  for (const [filename, mimeType] of [
    ["test-policy.txt", "text/plain"],
    ["test-policy.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    ["test-policy.pdf", "application/pdf"],
  ]) {
    const buffer = await readFile(path.join(fixturesDir, filename));
    const { status, body } = await upload(filename, buffer, mimeType);

    assert(status === 200, `${filename}: expected 200, got ${status}`);
    assert(body.id, `${filename}: missing document id`);
    assert(body.metadata?.filename === filename, `${filename}: wrong filename`);
    assert(body.extractedText, `${filename}: missing extracted text`);

    for (const snippet of EXPECTED_SNIPPETS) {
      assert(
        body.extractedText.includes(snippet),
        `${filename}: missing snippet "${snippet}"`,
      );
    }

    console.log(`✓ ${filename}`);
  }
}

async function testFailureCases() {
  console.log("\n=== Failure case tests ===");

  const tinyJpeg = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46,
  ]);
  await writeFile(path.join(fixturesDir, "test-image.jpg"), tinyJpeg);

  const zipBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);
  await writeFile(path.join(fixturesDir, "test-archive.zip"), zipBuffer);

  const emptyTxt = Buffer.from("");
  await writeFile(path.join(fixturesDir, "empty.txt"), emptyTxt);

  const pdfBuffer = await readFile(path.join(fixturesDir, "test-policy.pdf"));
  await writeFile(path.join(fixturesDir, "renamed-as-txt.txt"), pdfBuffer);

  const corruptedPdf = Buffer.from("%PDF-1.4\ncorrupted content");
  await writeFile(path.join(fixturesDir, "corrupted.pdf"), corruptedPdf);

  const oversized = Buffer.alloc(11 * 1024 * 1024, 0x41);
  await writeFile(path.join(fixturesDir, "oversized.txt"), oversized);

  const cases = [
    {
      name: "unsupported .jpg",
      file: "test-image.jpg",
      mime: "image/jpeg",
      expectedStatus: 400,
      expectedCode: "UNSUPPORTED_EXTENSION",
    },
    {
      name: "unsupported .zip",
      file: "test-archive.zip",
      mime: "application/zip",
      expectedStatus: 400,
      expectedCode: "UNSUPPORTED_EXTENSION",
    },
    {
      name: "oversized file",
      file: "oversized.txt",
      mime: "text/plain",
      expectedStatus: 413,
      expectedCode: "FILE_TOO_LARGE",
    },
    {
      name: "renamed file extension",
      file: "renamed-as-txt.txt",
      mime: "text/plain",
      expectedStatus: 400,
      expectedCode: "EXTENSION_MISMATCH",
    },
    {
      name: "empty text file",
      file: "empty.txt",
      mime: "text/plain",
      expectedStatus: 400,
      expectedCode: "EMPTY_FILE",
    },
    {
      name: "corrupted PDF",
      file: "corrupted.pdf",
      mime: "application/pdf",
      expectedStatus: 422,
      expectedCode: "PDF_EXTRACTION_FAILED",
    },
  ];

  for (const testCase of cases) {
    const buffer = await readFile(path.join(fixturesDir, testCase.file));
    const { status, body } = await upload(testCase.file, buffer, testCase.mime);

    assert(
      status === testCase.expectedStatus,
      `${testCase.name}: expected ${testCase.expectedStatus}, got ${status}`,
    );
    assert(
      body.error?.code === testCase.expectedCode,
      `${testCase.name}: expected code ${testCase.expectedCode}, got ${body.error?.code}`,
    );

    console.log(`✓ ${testCase.name} (${testCase.expectedCode})`);
  }
}

await mkdir(fixturesDir, { recursive: true });
await testHappyPath();
await testFailureCases();
console.log("\nAll ingestion tests passed.");
