"""
connectors/notion_connector.py
------------------------------
Notion connector.

Authenticates via a Notion Integration Token (env var NOTION_TOKEN),
lists pages (by database or via workspace search), extracts plain text
from each page's blocks, and runs the content through the Phase 2
chunking + embedding pipeline into Qdrant.

Reuses (does NOT re-implement):
    - chunker.chunk_text     → sentence-aware chunking
    - embedder.get_embedding → 384-dim vectors
"""

import logging
import os
import uuid
from datetime import datetime
from typing import List, Optional

from notion_client import Client
from qdrant_client.http import models as qmodels

from config import QDRANT_COLLECTION
from qdrant_init import get_qdrant_client
from embedder import get_embedding          # Phase 2 reuse
from chunker import chunk_text              # Phase 2 reuse


logger = logging.getLogger("connectors.notion")
logger.setLevel(logging.INFO)


# Block types we know how to extract plain text from.
_TEXT_BLOCK_TYPES = {
    "paragraph",
    "heading_1",
    "heading_2",
    "heading_3",
    "bulleted_list_item",
    "numbered_list_item",
    "toggle",
    "quote",
    "callout",
    "code",
    "to_do",
}


# ---------------------------------------------------------------
# Auth
# ---------------------------------------------------------------
def get_notion_client() -> Client:
    """
    Build a Notion SDK client from the NOTION_TOKEN env var.

    Raises:
        RuntimeError: if NOTION_TOKEN is missing.
    """
    token = os.getenv("NOTION_TOKEN", "").strip()
    if not token:
        raise RuntimeError(
            "NOTION_TOKEN is not set. Create an internal integration in Notion "
            "and put its secret in this environment variable."
        )
    return Client(auth=token)


# ---------------------------------------------------------------
# Block-level text extraction
# ---------------------------------------------------------------
def extract_text_from_block(block: dict) -> str:
    """
    Extract plain text from a single Notion block. Returns "" for
    unsupported types so the caller can safely join results.
    """
    btype = block.get("type", "")
    if btype not in _TEXT_BLOCK_TYPES:
        return ""

    node = block.get(btype, {}) or {}
    rich_text = node.get("rich_text", []) or []
    parts = [rt.get("plain_text", "") for rt in rich_text if rt.get("plain_text")]
    text = "".join(parts)

    # Prepend a to-do marker for clarity.
    if btype == "to_do":
        checked = node.get("checked", False)
        marker = "[x]" if checked else "[ ]"
        text = f"{marker} {text}".strip()

    return text + "\n" if text else ""


# ---------------------------------------------------------------
# Page title
# ---------------------------------------------------------------
def get_page_title(page: dict) -> str:
    """
    Extract the title from a Notion page. Notion databases expose the title
    under different property keys ("title" or "Name") depending on schema.
    """
    props = page.get("properties", {}) or {}

    # Workspace pages use a top-level "title" property of type "title".
    for key in ("title", "Name", "name"):
        prop = props.get(key)
        if not prop:
            continue
        if prop.get("type") == "title":
            rich = prop.get("title", []) or []
            text = "".join(rt.get("plain_text", "") for rt in rich)
            if text.strip():
                return text.strip()

    # Fallback: scan all properties for one typed "title".
    for prop in props.values():
        if isinstance(prop, dict) and prop.get("type") == "title":
            rich = prop.get("title", []) or []
            text = "".join(rt.get("plain_text", "") for rt in rich)
            if text.strip():
                return text.strip()

    return "Untitled"


# ---------------------------------------------------------------
# Full-page text
# ---------------------------------------------------------------
def get_page_text(page_id: str) -> str:
    """
    Fetch every block on a page (paginated) and join their extracted text.

    Also tries to prepend the page title. On failure returns "" rather than
    raising, so a single bad page does not break a full sync.
    """
    try:
        notion = get_notion_client()

        # Fetch the page itself to grab its title (best effort).
        title = ""
        try:
            page = notion.pages.retrieve(page_id=page_id)
            title = get_page_title(page)
        except Exception as e:
            logger.debug("Could not retrieve page title for %s: %s", page_id, e)

        # Paginate through the page's child blocks.
        pieces: List[str] = []
        if title:
            pieces.append(title + "\n")

        start_cursor: Optional[str] = None
        while True:
            kwargs = {"block_id": page_id, "page_size": 100}
            if start_cursor:
                kwargs["start_cursor"] = start_cursor
            resp = notion.blocks.children.list(**kwargs)

            for block in resp.get("results", []) or []:
                pieces.append(extract_text_from_block(block))

            if resp.get("has_more"):
                start_cursor = resp.get("next_cursor")
            else:
                break

        return "".join(pieces).strip()
    except Exception as e:
        logger.exception("Failed to get text for Notion page %s: %s", page_id, e)
        return ""


# ---------------------------------------------------------------
# Listing
# ---------------------------------------------------------------
def list_notion_pages(database_id: Optional[str] = None) -> List[dict]:
    """
    List Notion pages. If database_id is given, queries that database;
    otherwise searches the workspace for all pages the integration can see.

    Returns: [{id, title, url, last_edited_time}]
    """
    notion = get_notion_client()
    results: List[dict] = []

    if database_id:
        # Paginated database query.
        start_cursor: Optional[str] = None
        while True:
            kwargs = {"database_id": database_id, "page_size": 100}
            if start_cursor:
                kwargs["start_cursor"] = start_cursor
            resp = notion.databases.query(**kwargs)

            for page in resp.get("results", []) or []:
                results.append(
                    {
                        "id": page.get("id"),
                        "title": get_page_title(page),
                        "url": page.get("url", ""),
                        "last_edited_time": page.get("last_edited_time", ""),
                    }
                )

            if resp.get("has_more"):
                start_cursor = resp.get("next_cursor")
            else:
                break
    else:
        # Paginated workspace search (filtered to pages only).
        start_cursor: Optional[str] = None
        while True:
            kwargs = {
                "filter": {"property": "object", "value": "page"},
                "page_size": 100,
            }
            if start_cursor:
                kwargs["start_cursor"] = start_cursor
            resp = notion.search(**kwargs)

            for page in resp.get("results", []) or []:
                results.append(
                    {
                        "id": page.get("id"),
                        "title": get_page_title(page),
                        "url": page.get("url", ""),
                        "last_edited_time": page.get("last_edited_time", ""),
                    }
                )

            if resp.get("has_more"):
                start_cursor = resp.get("next_cursor")
            else:
                break

    return results


# ---------------------------------------------------------------
# Upsert helper — reuses chunker + embedder, adds Notion metadata
# ---------------------------------------------------------------
def _store_notion_chunks(chunks: List[str], metadata: dict) -> int:
    """Embed chunks and upsert into Qdrant with Notion metadata attached."""
    if not chunks:
        return 0

    client = get_qdrant_client()
    ingested_at = datetime.utcnow().isoformat()

    points: List[qmodels.PointStruct] = []
    for idx, chunk in enumerate(chunks):
        vector = get_embedding(chunk)
        payload = {
            "text": chunk,
            "type": "notion",
            "source": "notion",
            "chunk_index": idx,
            "ingested_at": ingested_at,
            **metadata,  # page_id, page_title, page_url, last_edited_time
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
def sync_notion_workspace(database_id: Optional[str] = None) -> dict:
    """
    List → extract → chunk → embed → upsert, for every Notion page in scope.

    Args:
        database_id: Optional Notion database ID to scope the sync.

    Returns:
        { "synced": int, "failed": int, "pages": [<page_title>, ...] }
    """
    pages = list_notion_pages(database_id=database_id)

    synced = 0
    failed = 0
    synced_titles: List[str] = []

    for page in pages:
        page_id = page.get("id")
        title = page.get("title") or "Untitled"
        url = page.get("url", "")
        last_edited = page.get("last_edited_time", "")

        try:
            text = get_page_text(page_id)
            if not text or not text.strip():
                logger.info("Skipping empty Notion page: %s", title)
                failed += 1
                continue

            chunks = chunk_text(text)  # Phase 2 reuse
            if not chunks:
                failed += 1
                continue

            metadata = {
                "page_id": page_id,
                "page_title": title,
                "page_url": url,
                "last_edited_time": last_edited,
            }
            _store_notion_chunks(chunks, metadata)

            synced += 1
            synced_titles.append(title)
        except Exception as e:
            logger.exception("Failed to sync Notion page %s: %s", title, e)
            failed += 1

    return {"synced": synced, "failed": failed, "pages": synced_titles}
