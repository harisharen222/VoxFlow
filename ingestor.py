"""
ingestor.py
-----------
Ingestion pipeline for three content sources:
    - PDF files (via PyMuPDF)
    - Web pages (via httpx + BeautifulSoup)
    - Raw manual text

Each source is extracted → chunked → embedded → upserted into Qdrant with
metadata (source, type, chunk_index, ingested_at).
"""

from typing import List
import io
import uuid
from datetime import datetime

import fitz  # PyMuPDF
import httpx
from bs4 import BeautifulSoup
from qdrant_client.http import models as qmodels

from config import QDRANT_COLLECTION
from qdrant_init import get_qdrant_client
from embedder import get_embedding
from chunker import chunk_text


# ---------------------------------------------------------------
# Shared helper
# ---------------------------------------------------------------
def _store_chunks(chunks: List[str], source: str, source_type: str) -> int:
    """
    Embed each chunk and upsert all resulting points into Qdrant in a single call.

    Payload schema per point:
        { text, source, type, chunk_index, ingested_at }

    Returns the number of chunks stored.
    """
    if not chunks:
        return 0

    client = get_qdrant_client()
    timestamp = datetime.utcnow().isoformat()

    points: List[qmodels.PointStruct] = []
    for idx, chunk in enumerate(chunks):
        vector = get_embedding(chunk)
        points.append(
            qmodels.PointStruct(
                id=str(uuid.uuid4()),  # unique point ID
                vector=vector,
                payload={
                    "text": chunk,
                    "source": source,
                    "type": source_type,
                    "chunk_index": idx,
                    "ingested_at": timestamp,
                },
            )
        )

    # Single batch upsert — more efficient than per-point calls.
    client.upsert(collection_name=QDRANT_COLLECTION, points=points)
    return len(points)


# ---------------------------------------------------------------
# 1. PDF ingestion
# ---------------------------------------------------------------
def ingest_pdf(file_bytes: bytes, source_name: str) -> int:
    """
    Extract text from a PDF (in-memory bytes), chunk it, embed each chunk,
    and store the results in Qdrant.

    Args:
        file_bytes: Raw PDF file contents.
        source_name: Human-readable identifier (e.g., original filename).

    Returns:
        Number of chunks stored.
    """
    # Open the PDF from an in-memory buffer — no disk writes needed.
    text_parts: List[str] = []
    with fitz.open(stream=file_bytes, filetype="pdf") as doc:
        for page in doc:
            text_parts.append(page.get_text())

    full_text = "\n".join(text_parts)

    # Sentence-aware chunking.
    chunks = chunk_text(full_text)

    return _store_chunks(chunks, source=source_name, source_type="pdf")


# ---------------------------------------------------------------
# 2. URL / web page ingestion
# ---------------------------------------------------------------
def ingest_url(url: str) -> int:
    """
    Fetch a web page, strip boilerplate (scripts/nav/footer), extract the
    readable text, then chunk → embed → store.

    Args:
        url: Fully-qualified HTTP(S) URL.

    Returns:
        Number of chunks stored.
    """
    # Use httpx (sync client is fine inside an async FastAPI endpoint for now;
    # FastAPI will run sync endpoints in a threadpool).
    with httpx.Client(
        follow_redirects=True,
        timeout=30.0,
        headers={"User-Agent": "Mozilla/5.0 (VoiceAssistant/Phase2)"},
    ) as client:
        response = client.get(url)
        response.raise_for_status()
        html = response.text

    # Parse and strip non-content tags.
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "nav", "footer", "header", "aside", "noscript"]):
        tag.decompose()

    # Collect only paragraphs + headings for cleaner content.
    content_nodes = soup.find_all(["h1", "h2", "h3", "h4", "h5", "h6", "p", "li"])
    text = "\n".join(node.get_text(strip=True) for node in content_nodes if node.get_text(strip=True))

    # Fallback: if the page lacks standard content tags, take the whole body text.
    if not text.strip():
        text = soup.get_text(separator="\n", strip=True)

    chunks = chunk_text(text)

    return _store_chunks(chunks, source=url, source_type="web")


# ---------------------------------------------------------------
# 3. Manual text ingestion
# ---------------------------------------------------------------
def ingest_text(text: str, source_name: str) -> int:
    """
    Ingest a raw string of text directly — no extraction step needed.

    Args:
        text: The raw text content.
        source_name: Human-readable identifier (e.g., "my-note").

    Returns:
        Number of chunks stored.
    """
    chunks = chunk_text(text)
    return _store_chunks(chunks, source=source_name, source_type="manual")
