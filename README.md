<div align="center">

# VoxFlow

### Voice-First AI Knowledge & Workflow Agent

**Speak. Get answers. Get things done.**

[![Python](https://img.shields.io/badge/Python-3.9%2B-blue?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Gemini](https://img.shields.io/badge/Gemini-2.5%20Flash-4285F4?logo=google&logoColor=white)](https://aistudio.google.com)
[![Qdrant](https://img.shields.io/badge/Qdrant-Vector%20DB-FF4081)](https://qdrant.tech)
[![Vapi](https://img.shields.io/badge/Vapi-Voice%20AI-7C3AED)](https://vapi.ai)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![Hackathon](https://img.shields.io/badge/HackBLR-2026-orange)](https://hackbangalore.com)

</div>

---

## What is VoxFlow?

VoxFlow is a **voice-first AI agent** that lets you interact with your organisation's knowledge base using natural speech. Instead of switching between apps, searching multiple tools, or typing long queries — you just talk.

> *"Summarise the Q4 strategy doc"*  
> *"Create a task for Priya: review the design mockup"*  
> *"What did we discuss in yesterday's meeting?"*

VoxFlow hears you, retrieves the right information from your documents, executes actions, and responds in seconds — all via voice.

---

## The Problem

Modern knowledge workers lose **2–3 hours daily** to:

- **Tool fragmentation** — docs in Notion, files in Drive, tasks in Jira, none connected
- **Slow information retrieval** — searching manually across multiple platforms
- **Inaccessibility** — keyboard-only interfaces exclude hands-busy or voice-preferred users
- **No memory** — AI assistants forget context between sessions

---

## The Solution

VoxFlow connects to your existing tools and creates a unified, voice-powered layer on top:

| User Need | VoxFlow Response |
|---|---|
| Find information | RAG pipeline searches all ingested docs + Drive + Notion |
| Create a task | Understands intent from speech, executes the action |
| Schedule a meeting | Extracts details, confirms with user |
| Recall past context | Long-term memory stores facts and conversation history |
| Summarise anything | Sends doc through Gemini 2.5 Flash, returns concise summary |

---

## Architecture

```
User Voice
    │
    ▼
 Vapi (STT → LLM → TTS)
    │ assistant-request / tool-calls
    ▼
FastAPI Backend  ←──── .env (keys + config)
    │
    ├── /vapi/webhook     ← receives all Vapi events
    ├── /ask              ← text-based RAG endpoint
    ├── /search           ← semantic search
    ├── /ingest/*         ← PDF / URL / text ingestion
    ├── /connectors/*     ← Google Drive + Notion sync
    └── /memory/*         ← conversation + user memory
    │
    ├── RAG Pipeline
    │     ├── Query Rewriting  (Gemini)
    │     ├── Semantic Search  (Qdrant)
    │     └── Answer Gen       (Gemini 2.5 Flash)
    │
    └── Memory Layer
          ├── Conversation Memory  (Qdrant)
          └── User Facts           (Qdrant + Gemini extraction)
```

---

## Features

- **Voice Interaction** — full duplex conversation via Vapi, no keyboard required
- **Smart Knowledge Search** — multi-query RAG retrieval over all ingested content
- **Document Ingestion** — PDF upload, URL scraping, raw text paste
- **Google Drive Sync** — ingest entire Drive folders automatically
- **Notion Sync** — pull pages and databases into the knowledge base
- **Conversation Memory** — recalls what was discussed in prior turns
- **User Memory** — learns and remembers facts about each user across sessions
- **Voice-Optimised Responses** — answers formatted for speech (no markdown noise)
- **React Frontend** — clean dashboard to manage knowledge, memory, and connectors

---

## Tech Stack

| Layer | Technology |
|---|---|
| Voice Platform | [Vapi](https://vapi.ai) — STT, LLM routing, TTS |
| Backend | [FastAPI](https://fastapi.tiangolo.com) + [Uvicorn](https://www.uvicorn.org) |
| LLM | [Google Gemini 2.5 Flash](https://aistudio.google.com) |
| Vector DB | [Qdrant Cloud](https://cloud.qdrant.io) |
| Embeddings | `sentence-transformers/all-MiniLM-L6-v2` (384-dim) |
| Connectors | Google Drive API, Notion API |
| Tunnel | [ngrok](https://ngrok.com) (dev) |
| Frontend | React 18 + Vite + Tailwind CSS |

---

## Project Structure

```
voxflow/
│
├── main.py                  # FastAPI app entry point
├── config.py                # Centralised environment config
├── rag.py                   # RAG orchestration (rewrite → retrieve → generate)
├── llm.py                   # Gemini calls: query rewriting, answer generation
├── retriever.py             # Qdrant semantic search + multi-query fusion
├── embedder.py              # Sentence-transformer embedding wrapper
├── chunker.py               # Sentence-aware text chunking
├── ingestor.py              # PDF, URL, and text ingestion pipeline
├── qdrant_init.py           # Collection setup + client factory
├── vapi_config.py           # Vapi assistant config + tool definitions
├── voice_formatter.py       # Format LLM output for voice (TTS-safe)
│
├── routers/
│   ├── ask.py               # POST /ask — text-based Q&A
│   ├── search.py            # POST /search — direct semantic search
│   ├── ingest.py            # POST /ingest/{pdf,url,text}
│   ├── vapi_webhook.py      # POST /vapi/webhook — all Vapi events
│   ├── connectors.py        # GET/POST /connectors/* — Drive & Notion
│   └── memory.py            # GET/POST/DELETE /memory/* — sessions & facts
│
├── connectors/
│   ├── gdrive_connector.py  # Google Drive sync
│   └── notion_connector.py  # Notion workspace sync
│
├── memory/
│   ├── conversation_memory.py  # Per-session turn storage + retrieval
│   └── user_memory.py          # Long-term user fact extraction + storage
│
├── frontend/                # React + Vite dashboard
│   ├── src/
│   │   ├── pages/           # AskPage, SearchPage, IngestPage, ...
│   │   ├── components/      # VoiceOrb, ChatBubble, Sidebar, ...
│   │   ├── hooks/           # useApi
│   │   └── context/         # SessionContext, ToastContext
│   └── package.json
│
├── .env.example             # Template for all required env vars
├── .gitignore
├── requirements.txt
└── README.md
```

---

## Quick Start

### Prerequisites

- Python 3.9+
- Node.js 18+
- [ngrok](https://ngrok.com/download) (free account)
- [Qdrant Cloud](https://cloud.qdrant.io) cluster (free tier)
- [Vapi](https://dashboard.vapi.ai) account
- [Google Gemini API key](https://aistudio.google.com/apikey) (free)

### 1. Clone the repository

```bash
git clone https://github.com/your-username/voxflow.git
cd voxflow
```

### 2. Set up Python environment

```bash
python3 -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in:

| Variable | Where to get it |
|---|---|
| `GEMINI_API_KEY` | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| `VAPI_API_KEY` | [dashboard.vapi.ai](https://dashboard.vapi.ai) → Keys |
| `QDRANT_HOST` | [cloud.qdrant.io](https://cloud.qdrant.io) → Cluster URL |
| `QDRANT_API_KEY` | Qdrant Cloud → Cluster → API Keys |
| `NOTION_TOKEN` | [notion.so/my-integrations](https://www.notion.so/my-integrations) |
| `PUBLIC_URL` | From ngrok (see Step 5) |

### 4. Start the backend

```bash
uvicorn main:app --reload
```

Verify it's running:
```bash
curl http://localhost:8000/health
# → {"status":"ok"}
```

### 5. Expose via ngrok

In a new terminal:
```bash
ngrok http 8000
```

Copy the `Forwarding` HTTPS URL (e.g. `https://abc123.ngrok-free.app`) and paste it into your `.env`:

```env
PUBLIC_URL=https://abc123.ngrok-free.app
```

The backend auto-reloads and picks up the change.

### 6. Configure Vapi

1. Go to [dashboard.vapi.ai](https://dashboard.vapi.ai) → Assistants
2. Set your assistant's **Server URL** to:
   ```
   https://abc123.ngrok-free.app/vapi/webhook
   ```
3. Save, then start a test call.

### 7. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Liveness check |
| `POST` | `/ask` | Voice/text Q&A via RAG |
| `POST` | `/search` | Direct semantic search |
| `POST` | `/ingest/pdf` | Upload and ingest a PDF |
| `POST` | `/ingest/url` | Scrape and ingest a URL |
| `POST` | `/ingest/text` | Ingest raw text with a source name |
| `POST` | `/vapi/webhook` | Vapi event receiver (all event types) |
| `GET` | `/connectors/status` | Check Drive + Notion configuration |
| `POST` | `/connectors/gdrive/sync` | Sync Google Drive files |
| `POST` | `/connectors/notion/sync` | Sync Notion pages |
| `GET` | `/memory/session/{id}` | Load conversation history |
| `DELETE` | `/memory/session/{id}` | Clear a session |
| `GET` | `/memory/user/{id}` | Load user facts |
| `POST` | `/memory/user/{id}/facts` | Add a user fact manually |

Full interactive docs: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## Testing

### Verify backend

```bash
# Health
curl http://localhost:8000/health

# Text Q&A
curl -X POST http://localhost:8000/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "What documents have been uploaded?", "session_id": "test", "user_id": "demo"}'
```

### Simulate a Vapi webhook

```bash
# Tool call (RAG query)
curl -X POST https://your-ngrok-url.ngrok-free.app/vapi/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "type": "tool-calls",
      "call": {"id": "test-call-001"},
      "toolCallList": [{
        "id": "tc-001",
        "function": {
          "name": "knowledge_query",
          "arguments": {"query": "Summarise the Q4 strategy document"}
        }
      }]
    }
  }'

# Assistant request
curl -X POST https://your-ngrok-url.ngrok-free.app/vapi/webhook \
  -H "Content-Type: application/json" \
  -d '{"message": {"type": "assistant-request"}}'
```

### Ingest a document

```bash
# From URL
curl -X POST http://localhost:8000/ingest/url \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/article"}'

# PDF upload
curl -X POST http://localhost:8000/ingest/pdf \
  -F "file=@/path/to/document.pdf"
```

---

## Demo Script

Use this script when presenting to judges or running a live demo.

**Setup**: Ingest one document first (e.g. a product spec PDF or a Notion page).

---

**Voice Demo (via Vapi call):**

> *"What is this product about?"*  
→ Agent retrieves from ingested doc, summarises in 2–3 spoken sentences.

> *"Who are the main users?"*  
→ Multi-turn follow-up — agent uses conversation context from the previous turn.

> *"What did I just ask you?"*  
→ Memory recall — agent references the conversation history stored in Qdrant.

> *"Create a task: review the product spec by Friday"*  
→ Agent acknowledges the task creation request.

---

**Frontend Demo:**

1. Open [localhost:5173](http://localhost:5173)
2. Show the **Ask** tab → type a question, watch the RAG response with citations
3. Show **Connectors** → both Google Drive and Notion show "Configured"
4. Show **Memory** → load a session ID to replay conversation history
5. Show **Ingest** → drag-drop a PDF and watch it get processed

---

## Screenshots

| Ask (Voice Interface) | Connectors | Search |
|---|---|---|
| *(screenshot)* | *(screenshot)* | *(screenshot)* |

---

## Known Limitations

- `PUBLIC_URL` must be manually updated each time ngrok restarts (use a paid ngrok plan or deploy to get a stable URL)
- Vapi free tier limits call duration and concurrent calls
- Google Drive connector requires a Service Account with Drive read access

---

## Roadmap

- [ ] Persistent ngrok domain support
- [ ] Slack and Teams connector
- [ ] Action execution (real task creation in Jira / Linear)
- [ ] Meeting scheduling via Google Calendar API
- [ ] Multi-language voice support (Deepgram + 11Labs multilingual)
- [ ] Streaming RAG responses for lower latency
- [ ] Docker Compose for one-command startup

---

## Contributing

Pull requests are welcome. For major changes please open an issue first to discuss what you would like to change.

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'Add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">
Built with ❤️ for HackBLR 2026
</div>
