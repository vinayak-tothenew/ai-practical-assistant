# Enterprise Knowledge Assistant

A Next.js RAG pipeline for ingesting enterprise documents, chunking text, generating embeddings, and searching with ChromaDB.

```
Document → Extract → Chunk → Embed → ChromaDB → Semantic Search → Gemini Answer
```

## Requirements

| Tool | Version | Required for |
|------|---------|--------------|
| **Node.js** | 20.9+ (22 LTS recommended) | Dev server, API routes |
| **npm** | 9+ | Package management |
| **GEMINI_API_KEY** | — | Embeddings (M3+) and chat answers (M5) |
| **Docker Desktop** | — | ChromaDB on Windows x64 (Milestone 4) |

> **Windows note:** Node 24 can cause slow or stuck compiles with Next.js 16. Use **Node 22 LTS** if `npm run dev` hangs on "Compiling /".

## Quick start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
GEMINI_API_KEY=your_key_here
```

Get a Gemini key from [Google AI Studio](https://aistudio.google.com/apikey).

Optional tuning:

```env
GEMINI_CHAT_MODEL=gemini-3.5-flash
# Tunable starting point — not universal; adjust for your corpus
RAG_MIN_SIMILARITY=0.45
```

### 3. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The `dev` script automatically:
- Checks Node version and environment
- Stops stale Next.js processes and port 3000 conflicts
- Uses portable Node 22 on Node 24+ (auto-downloaded to `.tools/`)
- Starts Next.js with webpack (more stable than Turbopack on Windows)

If the server misbehaves, run `npm run stop` first, then `npm run dev` again.

### 4. (Optional) Start ChromaDB for semantic search

**Windows x64** — Chroma CLI is not supported; use Docker:

```bash
# Install Docker Desktop first: https://www.docker.com/products/docker-desktop/
npm run chroma:docker
```

**macOS / Linux:**

```bash
npm run chroma
```

Chroma runs at `http://localhost:8000` by default.

## Milestones

| # | Feature | API | Needs |
|---|---------|-----|-------|
| 1 | Document ingestion (PDF, DOCX, TXT) | `POST /api/documents/ingest` | Dev server |
| 2 | Text chunking | `POST /api/documents/chunk` | Dev server |
| 3 | Gemini embeddings | `POST /api/documents/embed` | `GEMINI_API_KEY` |
| 4 | ChromaDB index + search | `POST /api/documents/index`, `POST /api/search` | ChromaDB running |
| 5 | Gemini RAG answers | `POST /api/chat` | `GEMINI_API_KEY`, indexed chunks |

## Scripts

```bash
npm run dev          # Start dev server (with env check + cleanup)
npm run stop         # Stop stale Next.js processes for this project
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint
npm run check-env    # Verify Node version and .env.local
npm run chroma:docker # Start ChromaDB via Docker
```

## Test scripts

```bash
node scripts/test-ingestion.mjs
node scripts/test-chunking.mjs
node scripts/test-embeddings.mjs    # requires GEMINI_API_KEY
node scripts/test-vector-store.mjs  # requires ChromaDB + isolated test collection
node scripts/test-chat.mjs          # requires ChromaDB + GEMINI_API_KEY
```

For `test-vector-store.mjs` and `test-chat.mjs`, start the dev server with an isolated Chroma collection so tests do not depend on prior indexed data:

```bash
# PowerShell
$env:CHROMA_COLLECTION="enterprise-knowledge-integration-test"; npm run dev

# bash
CHROMA_COLLECTION=enterprise-knowledge-integration-test npm run dev
```

Generate `test-fixtures/sample.pdf` (LaTeX content) if missing:

```bash
node scripts/generate-test-fixtures.mjs
```

## Troubleshooting

### Dev server hangs on "Compiling /"

1. Run `npm run stop` to kill stale Next.js processes
2. Clear cache: `Remove-Item -Recurse -Force .next` (PowerShell)
3. Run `npm run dev` again

On Node 24+, portable Node 22 is used automatically. Do not run `npm run build` and `npm run dev` at the same time.

### Port 3000 already in use

```powershell
# Windows
Get-NetTCPConnection -LocalPort 3000 | Select-Object OwningProcess
taskkill /PID <pid> /F
```

Or just run `npm run dev` — it cleans the port automatically.

### ChromaDB connection failed

- Windows: install Docker Desktop, then `npm run chroma:docker`
- Verify: `curl http://localhost:8000/api/v2/heartbeat`

### Embeddings fail

- Ensure `GEMINI_API_KEY` is set in `.env.local`
- Run `npm run check-env`
