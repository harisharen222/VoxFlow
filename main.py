"""
main.py
-------
FastAPI entrypoint for the Voice-First Personal Productivity Assistant.

Phase 1 scope:
- GET  /health       → simple liveness check
- POST /embed-test   → returns an embedding + its dimension for a piece of text
- On startup: initialize the Qdrant collection (idempotent)

No ingestion, search, or Vapi logic yet — those belong to later phases.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from qdrant_init import init_collection
from embedder import get_embedding
from routers.ingest import router as ingest_router
from routers.search import router as search_router
from routers.ask import router as ask_router
from routers.vapi_webhook import router as vapi_router
from routers.connectors import router as connectors_router
from routers.memory import router as memory_router
from memory.conversation_memory import ensure_conversation_collection
from memory.user_memory import ensure_user_memory_collection


# ---------- Lifespan: run startup tasks ----------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure every Qdrant collection exists before handling any requests.
    init_collection()                      # Phase 1: knowledge_base
    ensure_conversation_collection()       # Phase 7: conversation_memory
    ensure_user_memory_collection()        # Phase 7: user_memory
    yield
    # (No shutdown logic needed.)


app = FastAPI(
    title="Voice-First Personal Productivity Assistant",
    version="0.1.0",
    lifespan=lifespan,
)

# Allow the React dev server (and any deployed frontend) to call the API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite dev server
        "http://localhost:3000",   # CRA fallback
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Phase 2 ingestion routes: /ingest/pdf, /ingest/url, /ingest/text
app.include_router(ingest_router)

# Register Phase 3 search routes: /search, /search/multi
app.include_router(search_router)

# Register Phase 4 RAG route: /ask
app.include_router(ask_router)

# Register Phase 5 Vapi webhook: /vapi/webhook
app.include_router(vapi_router)

# Register Phase 6 connector routes: /connectors/status, /connectors/{gdrive,notion}/sync
app.include_router(connectors_router)

# Register Phase 7 memory routes: /memory/session/*, /memory/user/*
app.include_router(memory_router)


# ---------- Request/response models ----------
class EmbedRequest(BaseModel):
    text: str


# ---------- Routes ----------
@app.get("/health")
def health():
    """Liveness probe — returns a constant payload."""
    return {"status": "ok"}


@app.post("/embed-test")
def embed_test(payload: EmbedRequest):
    """
    Test endpoint: runs the input text through the embedding model and
    returns the resulting vector plus its dimension count.
    """
    vector = get_embedding(payload.text)
    return {
        "embedding": vector,
        "dimension": len(vector),
    }
