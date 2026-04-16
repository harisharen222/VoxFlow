# Knowledge Agent — Frontend

Single-page React app (Vite + Tailwind) that talks to the Phase 1–7 FastAPI backend.

## Setup

```bash
cd frontend
npm install
cp .env.example .env       # edit VITE_API_BASE_URL if backend not on :8000
npm run dev                # http://localhost:5173
```

## Pages

1. 🎙 **Ask** — chat interface backed by `POST /ask` with session + user memory.
2. 📥 **Ingest** — PDF upload, URL ingest, raw text ingest.
3. 🔌 **Connectors** — Google Drive + Notion sync with live status badges.
4. 🧠 **Memory** — inspect conversation turns and user facts; add/delete facts.
5. 🔍 **Search** — raw semantic search with scored result cards.

## Env

`VITE_API_BASE_URL` — backend base URL (default `http://localhost:8000`).

## Tech

- React 18 + Vite
- Tailwind CSS (custom dark tokens)
- axios (centralized in `src/hooks/useApi.js`)
- react-router-dom v6
- No component library — all components are hand-built in `src/components/`.
