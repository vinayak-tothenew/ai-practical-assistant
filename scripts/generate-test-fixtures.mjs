import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { PDFDocument, StandardFonts } from "pdf-lib";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, "..", "test-fixtures");

const LATEX_TEXT = `LaTeX to PDF Quick Guide

To compile a LaTeX file into a PDF, use the pdflatex command:

  pdflatex sample.tex

This produces sample.pdf in the same directory.

For documents with bibliographies or cross-references, run pdflatex twice.

You can also use latexmk for automated builds:

  latexmk -pdf sample.tex

The latexmk tool reruns pdflatex until references stabilize.`;

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

async function createPdfFromText(filename, text) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = 12;
  const lineHeight = 18;
  const margin = 50;
  let y = page.getHeight() - margin;

  for (const line of text.split("\n")) {
    page.drawText(line, { x: margin, y, size: fontSize, font });
    y -= lineHeight;
  }

  const pdfBytes = await pdfDoc.save();
  await writeFile(path.join(fixturesDir, filename), pdfBytes);
}

async function createPdf() {
  await createPdfFromText("test-policy.pdf", POLICY_TEXT);
}

async function createSamplePdf() {
  await createPdfFromText("sample.pdf", LATEX_TEXT);
}

await mkdir(fixturesDir, { recursive: true });
await createTxt();
await createDocx();
await createPdf();
await createSamplePdf();

console.log("Test fixtures created in test-fixtures/");
