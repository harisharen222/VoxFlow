"""
memory/user_memory.py
---------------------
Long-term per-user facts, stored in Qdrant.

Facts are short English statements about a user — their name, role,
preferences, context ("works in finance", "prefers concise answers").
They are embedded and stored so that on any future call we can pull
the facts MOST RELEVANT to the current question and inject them into
the system prompt for personalization.

Fact extraction is LLM-powered: after each conversation turn, we ask
Claude Haiku to pick out anything worth remembering. The call is cheap
and fast, and runs AFTER we've already returned the response to the user.
"""

from typing import List
import json
import logging
import uuid
from datetime import datetime

import google.generativeai as genai
from qdrant_client.http import models as qmodels

from qdrant_init import get_qdrant_client
from embedder import get_embedding
from config import EMBEDDING_DIM, GEMINI_API_KEY, GEMINI_MODEL


logger = logging.getLogger("memory.user")
logger.setLevel(logging.INFO)


USER_MEMORY_COLLECTION = "user_memory"

# Gemini Flash handles extraction — cheap, fast, free-tier friendly.
# The main /ask answer uses the same model via llm.py.
genai.configure(api_key=GEMINI_API_KEY)
_EXTRACTOR_MODEL = GEMINI_MODEL


# ---------------------------------------------------------------
# Collection bootstrap
# ---------------------------------------------------------------
def ensure_user_memory_collection() -> None:
    """Create the `user_memory` collection if it does not exist."""
    client = get_qdrant_client()
    existing = {c.name for c in client.get_collections().collections}
    if USER_MEMORY_COLLECTION in existing:
        logger.info("Collection '%s' already exists.", USER_MEMORY_COLLECTION)
        return

    client.create_collection(
        collection_name=USER_MEMORY_COLLECTION,
        vectors_config=qmodels.VectorParams(
            size=EMBEDDING_DIM,
            distance=qmodels.Distance.COSINE,
        ),
    )
    logger.info("Created collection '%s'.", USER_MEMORY_COLLECTION)


# ---------------------------------------------------------------
# Write
# ---------------------------------------------------------------
def save_user_fact(
    user_id: str,
    fact: str,
    category: str = "other",
    source: str = "explicit",
    session_id: str = "",
    confidence: float = 1.0,
) -> None:
    """Embed a fact and upsert into user_memory with the full payload schema."""
    if not fact or not fact.strip():
        return

    client = get_qdrant_client()
    vector = get_embedding(fact)
    payload = {
        "user_id": user_id or "anonymous",
        "fact": fact.strip(),
        "category": category or "other",
        "source": source or "explicit",
        "session_id": session_id or "",
        "timestamp": datetime.utcnow().isoformat(),
        "confidence": float(confidence),
    }

    client.upsert(
        collection_name=USER_MEMORY_COLLECTION,
        points=[
            qmodels.PointStruct(
                id=str(uuid.uuid4()),
                vector=vector,
                payload=payload,
            )
        ],
    )


# ---------------------------------------------------------------
# Read
# ---------------------------------------------------------------
def _user_filter(user_id: str) -> qmodels.Filter:
    return qmodels.Filter(
        must=[
            qmodels.FieldCondition(
                key="user_id",
                match=qmodels.MatchValue(value=user_id),
            )
        ]
    )


def get_relevant_user_facts(user_id: str, query: str, limit: int = 5) -> List[str]:
    """
    Return up to `limit` user facts most relevant to the current query.
    The result is a plain list of strings, ready to drop into a prompt.
    """
    client = get_qdrant_client()
    query_vector = get_embedding(query)
    hits = client.search(
        collection_name=USER_MEMORY_COLLECTION,
        query_vector=query_vector,
        query_filter=_user_filter(user_id),
        limit=limit,
        with_payload=True,
    )
    return [
        (h.payload or {}).get("fact", "")
        for h in hits
        if (h.payload or {}).get("fact")
    ]


def get_all_user_facts(user_id: str) -> List[dict]:
    """Scroll all facts stored for a user (full payloads)."""
    client = get_qdrant_client()
    all_payloads: List[dict] = []
    next_offset = None

    while True:
        points, next_offset = client.scroll(
            collection_name=USER_MEMORY_COLLECTION,
            scroll_filter=_user_filter(user_id),
            limit=256,
            offset=next_offset,
            with_payload=True,
            with_vectors=False,
        )
        for p in points:
            if p.payload:
                all_payloads.append(p.payload)
        if next_offset is None:
            break

    return all_payloads


# ---------------------------------------------------------------
# Delete
# ---------------------------------------------------------------
def delete_user(user_id: str) -> None:
    """Remove every point belonging to a user."""
    client = get_qdrant_client()
    client.delete(
        collection_name=USER_MEMORY_COLLECTION,
        points_selector=qmodels.FilterSelector(filter=_user_filter(user_id)),
    )


# ---------------------------------------------------------------
# Automatic fact extraction (LLM-powered)
# ---------------------------------------------------------------
_EXTRACTOR_SYSTEM = (
    "You are a fact extractor. Given a conversation turn, extract any facts "
    "worth remembering about the user. Return ONLY a JSON array of objects "
    "like: [{\"fact\":\"...\",\"category\":\"identity|preference|context|other\","
    "\"confidence\":0.0-1.0}]. Return [] if nothing worth remembering. "
    "No preamble."
)


def extract_and_save_facts(
    user_id: str,
    session_id: str,
    user_message: str,
    assistant_message: str,
) -> List[dict]:
    """
    Ask Claude Haiku to identify facts worth remembering in the latest turn,
    then persist each one via save_user_fact(source="inferred").

    Failures are swallowed — this function never raises, so it can be safely
    scheduled as a background task that does not block the /ask response.
    """
    if not user_id or user_id == "anonymous":
        # Nothing to attribute to — skip extraction.
        return []

    user_prompt = (
        f"User said: {user_message}\n"
        f"Assistant said: {assistant_message}"
    )

    facts: List[dict] = []
    try:
        model = genai.GenerativeModel(_EXTRACTOR_MODEL, system_instruction=_EXTRACTOR_SYSTEM)
        response = model.generate_content(
            user_prompt,
            generation_config={"temperature": 0, "max_output_tokens": 512},
        )

        raw_text = getattr(response, "text", "") or ""
        if not raw_text:
            for cand in getattr(response, "candidates", []) or []:
                content = getattr(cand, "content", None)
                for part in getattr(content, "parts", []) or []:
                    t = getattr(part, "text", "")
                    if t:
                        raw_text += t

        cleaned = raw_text.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.strip("`")
            if cleaned.lower().startswith("json"):
                cleaned = cleaned[4:]
            cleaned = cleaned.strip()

        parsed = json.loads(cleaned) if cleaned else []
        if not isinstance(parsed, list):
            return []
        facts = [f for f in parsed if isinstance(f, dict) and f.get("fact")]
    except Exception as e:
        logger.warning("Fact extraction failed (non-fatal): %s", e)
        return []

    # Persist each extracted fact.
    for f in facts:
        try:
            save_user_fact(
                user_id=user_id,
                fact=f.get("fact", ""),
                category=f.get("category", "other"),
                source="inferred",
                session_id=session_id,
                confidence=float(f.get("confidence", 0.7)),
            )
        except Exception as e:
            logger.warning("Failed to persist extracted fact %r: %s", f, e)

    return facts


# ---------------------------------------------------------------
# Context builder for system-prompt injection
# ---------------------------------------------------------------
def build_user_context(user_id: str, query: str) -> str:
    """
    Assemble a short system-prompt addendum describing what we know about
    this user, filtered to the facts most relevant to the current query.
    Returns "" if no facts exist or no user is supplied.
    """
    if not user_id or user_id == "anonymous":
        return ""

    facts = get_relevant_user_facts(user_id, query, limit=5)
    if not facts:
        return ""

    bullet_lines = "\n".join(f"- {f}" for f in facts)
    return f"What you know about this user:\n{bullet_lines}"
