"""
qdrant_init.py
--------------
Responsible for connecting to the Qdrant instance (local or cloud) and
ensuring all required collections exist with the correct vector configuration.

Called once on FastAPI startup.
"""

from qdrant_client import QdrantClient
from qdrant_client.http import models as qmodels

from config import (
    QDRANT_HOST,
    QDRANT_PORT,
    QDRANT_API_KEY,
    QDRANT_COLLECTION,
    EMBEDDING_DIM,
)

# Collection names
COLLECTIONS = [
    QDRANT_COLLECTION,          # "knowledge_base"
    "conversation_memory",
    "user_memory",
]


def get_qdrant_client() -> QdrantClient:
    """
    Return a Qdrant client.
    - If QDRANT_API_KEY is set → connects to Qdrant Cloud via HTTPS
    - Otherwise → connects to local instance via host/port
    """
    if QDRANT_API_KEY:
        return QdrantClient(
            url=f"https://{QDRANT_HOST}:{QDRANT_PORT}",
            api_key=QDRANT_API_KEY,
        )
    else:
        return QdrantClient(
            host=QDRANT_HOST,
            port=QDRANT_PORT,
        )


def _ensure_collection(client: QdrantClient, name: str) -> None:
    """
    Create a single collection if it does not already exist.

    - Vector size: 384 (all-MiniLM-L6-v2 output dimension)
    - Distance metric: Cosine
    """
    existing = {c.name for c in client.get_collections().collections}

    if name in existing:
        print(f"[qdrant] Collection '{name}' already exists — skipping.")
        return

    client.create_collection(
        collection_name=name,
        vectors_config=qmodels.VectorParams(
            size=EMBEDDING_DIM,
            distance=qmodels.Distance.COSINE,
        ),
    )
    print(f"[qdrant] Created collection '{name}' (dim={EMBEDDING_DIM}, cosine).")


def init_collection() -> None:
    """
    Initialize all required Qdrant collections on startup.
    Creates knowledge_base, conversation_memory, and user_memory
    if they do not already exist.
    """
    client = get_qdrant_client()

    for collection_name in COLLECTIONS:
        _ensure_collection(client, collection_name)