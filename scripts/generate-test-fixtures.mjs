import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { PDFDocument, StandardFonts } from "pdf-lib";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, "..", "test-fixtures");

const POLICY_TEXT = `Employee Leave Policy

Employees receive 24 annual leave days per calendar year.

Employees receive 12 sick leave days per year.

Employees may carry forward up to 5 unused annual leave days.

Leave longer than 3 consecutive working days requires manager approval.`;

async function createTxt() {
  await writeFile(path.join(fixturesDir, "test-policy.txt"), POLICY_TEXT, "utf8");
}

async function createDocx() {
  const paragraphs = POLICY_TEXT.split("\n\n").map(
    (block) =>
      new Paragraph({
        children: [new TextRun(block)],
        spacing: { after: 200 },
      }),
  );

  const doc = new Document({
    sections: [{ children: paragraphs }],
  });

  const buffer = await Packer.toBuffer(doc);
  await writeFile(path.join(fixturesDir, "test-policy.docx"), buffer);
}

async function createPdf() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = 12;
  const lineHeight = 18;
  const margin = 50;
  let y = page.getHeight() - margin;

  for (const line of POLICY_TEXT.split("\n")) {
    page.drawText(line, { x: margin, y, size: fontSize, font });
    y -= lineHeight;
  }

  const pdfBytes = await pdfDoc.save();
  await writeFile(path.join(fixturesDir, "test-policy.pdf"), pdfBytes);
}

await mkdir(fixturesDir, { recursive: true });
await createTxt();
await createDocx();
await createPdf();

console.log("Test fixtures created in test-fixtures/");
