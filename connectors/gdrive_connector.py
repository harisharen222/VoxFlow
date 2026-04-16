"""
connectors/gdrive_connector.py
------------------------------
Google Drive connector.

Authenticates via a Service Account (JSON blob in env var
GOOGLE_SERVICE_ACCOUNT_JSON), lists files, extracts their plain text,
and feeds that text through the Phase 2 chunking + embedding pipeline
so the knowledge base gets populated automatically.

Reuses (does NOT re-implement):
    - chunker.chunk_text     → sentence-aware chunking
    - embedder.get_embedding → 384-dim vectors
    - qdrant_init.get_qdrant_client + config.QDRANT_COLLECTION

Each Qdrant point gets a payload with Drive-specific metadata so
retrieval results can attribute back to the original file.
"""

from typing import List, Optional
import io
import json
import logging
import os
import uuid
from datetime import datetime

import fitz  # PyMuPDF — same library Phase 2 uses for PDFs
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
from qdrant_client.http import models as qmodels

from config import QDRANT_COLLECTION
from qdrant_init import get_qdrant_client
from embedder import get_embedding          # Phase 2 reuse
from chunker import chunk_text              # Phase 2 reuse


logger = logging.getLogger("connectors.gdrive")
logger.setLevel(logging.INFO)


# Scopes: read-only access to Drive contents.
_SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]

# Default MIME types we know how to extract.
_DEFAULT_MIME_TYPES = [
    "application/vnd.google-apps.document",       # Google Docs
    "application/vnd.google-apps.presentation",   # Google Slides
    "application/pdf",
    "text/plain",
]


# ---------------------------------------------------------------
# Auth
# ---------------------------------------------------------------
def get_drive_service():
    """
    Build a Google Drive v3 API client from the service-account JSON
    stored in the GOOGLE_SERVICE_ACCOUNT_JSON environment variable.

    Raises:
        RuntimeError: if the env var is missing or malformed.
    """
    raw = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON", "").strip()
    if not raw:
        raise RuntimeError(
            "GOOGLE_SERVICE_ACCOUNT_JSON is not set. "
            "Provide the full service-account JSON in this environment variable."
        )

    try:
        info = json.loads(raw)
    except json.JSONDecodeError as e:
        raise RuntimeError(f"GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON: {e}")

    credentials = service_account.Credentials.from_service_account_info(
        info, scopes=_SCOPES
    )
    return build("drive", "v3", credentials=credentials, cache_discovery=False)


# ---------------------------------------------------------------
# Listing
# ---------------------------------------------------------------
def list_drive_files(
    folder_id: Optional[str] = None,
    mime_types: Optional[List[str]] = None,
) -> List[dict]:
    """
    List Drive files matching the given MIME types, optionally scoped to a folder.

    Args:
        folder_id: If provided, limits listing to direct children of that folder.
        mime_types: List of MIME types to include. Defaults to docs/slides/pdf/text.

    Returns:
        A list of dicts shaped: {id, name, mimeType, modifiedTime}.
    """
    service = get_drive_service()
    mime_types = mime_types or _DEFAULT_MIME_TYPES

    # Build the Drive search query.
    mime_clause = " or ".join(f"mimeType='{m}'" for m in mime_types)
    clauses = [f"({mime_clause})", "trashed = false"]
    if folder_id:
        clauses.append(f"'{folder_id}' in parents")
    q = " and ".join(clauses)

    files: List[dict] = []
    page_token: Optional[str] = None

    # Paginate through all results.
    while True:
        response = service.files().list(
            q=q,
            spaces="drive",
            fields="nextPageToken, files(id, name, mimeType, modifiedTime)",
            pageToken=page_token,
            pageSize=100,
        ).execute()

        files.extend(response.get("files", []))
        page_token = response.get("nextPageToken")
        if not page_token:
            break

    return files


# ---------------------------------------------------------------
# Extraction
# ---------------------------------------------------------------
def extract_text_from_drive_file(file_id: str, mime_type: str) -> str:
    """
    Extract plain text from a Drive file, handling each supported MIME type.
    Returns an empty string on any failure (never raises) so sync can continue.
    """
    try:
        service = get_drive_service()

        # Google Docs / Slides → export as text/plain.
        if mime_type in (
            "application/vnd.google-apps.document",
            "application/vnd.google-apps.presentation",
        ):
            data = service.files().export(
                fileId=file_id, mimeType="text/plain"
            ).execute()
            if isinstance(data, bytes):
                return data.decode("utf-8", errors="replace")
            return str(data or "")

        # Plain text → download bytes and decode.
        if mime_type == "text/plain":
            buffer = io.BytesIO()
            request = service.files().get_media(fileId=file_id)
            downloader = MediaIoBaseDownload(buffer, request)
            done = False
            while not done:
                _, done = downloader.next_chunk()
            return buffer.getvalue().decode("utf-8", errors="replace")

        # PDF → download bytes, parse with PyMuPDF (same approach as Phase 2).
        if mime_type == "application/pdf":
            buffer = io.BytesIO()
            request = service.files().get_media(fileId=file_id)
            downloader = MediaIoBaseDownload(buffer, request)
            done = False
            while not done:
                _, done = downloader.next_chunk()
            pdf_bytes = buffer.getvalue()

            parts: List[str] = []
            with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
                for page in doc:
                    parts.append(page.get_text())
            return "\n".join(parts)

        # Any other MIME type — we don't know how to extract.
        logger.warning("Unsupported MIME type for file %s: %s", file_id, mime_type)
        return ""

    except Exception as e:
        logger.exception("Failed to extract text from Drive file %s: %s", file_id, e)
        return ""


# ---------------------------------------------------------------
# Upsert helper — reuses chunker + embedder, adds Drive metadata
# ---------------------------------------------------------------
def _store_drive_chunks(chunks: List[str], metadata: dict) -> int:
    """
    Embed each chunk and upsert into Qdrant with Drive-specific metadata.
    Chunking/embedding are imported from Phase 2; only storage is local.
    """
    if not chunks:
        return 0

    client = get_qdrant_client()
    ingested_at = datetime.utcnow().isoformat()

    points: List[qmodels.PointStruct] = []
    for idx, chunk in enumerate(chunks):
        vector = get_embedding(chunk)
        payload = {
            "text": chunk,
            "type": "gdrive",
            "source": "gdrive",
            "chunk_index": idx,
            "ingested_at": ingested_at,
            **metadata,  # file_name, file_id, mime_type, modified_time
        }
        points.append(
            qmodels.PointStruct(
                id=str(uuid.uuid4()),
                vector=vector,
                payload=payload,
            )
        )

    client.upsert(collection_name=QDRANT_COLLECTION, points=points)
    return len(points)


# ---------------------------------------------------------------
# Orchestration
# ---------------------------------------------------------------
def sync_drive_folder(folder_id: Optional[str] = None) -> dict:
    """
    List → extract → chunk → embed → upsert, for every Drive file in scope.

    Args:
        folder_id: Optional Drive folder ID. When omitted, lists everything
                   the service account has access to (limited to supported MIME types).

    Returns:
        { "synced": int, "failed": int, "files": [<file_name>, ...] }
    """
    files = list_drive_files(folder_id=folder_id)

    synced = 0
    failed = 0
    synced_names: List[str] = []

    for f in files:
        file_id = f.get("id")
        name = f.get("name", "")
        mime = f.get("mimeType", "")
        modified = f.get("modifiedTime", "")

        try:
            text = extract_text_from_drive_file(file_id, mime)
            if not text or not text.strip():
                logger.info("Skipping empty/unextractable file: %s (%s)", name, mime)
                failed += 1
                continue

            chunks = chunk_text(text)  # Phase 2 reuse
            if not chunks:
                failed += 1
                continue

            metadata = {
                "file_name": name,
                "file_id": file_id,
                "mime_type": mime,
                "modified_time": modified,
            }
            _store_drive_chunks(chunks, metadata)

            synced += 1
            synced_names.append(name)
        except Exception as e:
            logger.exception("Failed to sync Drive file %s: %s", name, e)
            failed += 1

    return {"synced": synced, "failed": failed, "files": synced_names}
