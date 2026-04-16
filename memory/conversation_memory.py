"""
memory/conversation_memory.py
-----------------------------
Per-session conversation memory, stored in Qdrant.

Each point in the "conversation_memory" collection represents a single
message (user or assistant). Turns come in pairs sharing the same
`turn_index` — one point with role="user", one with role="assistant".

Storing turns as vectors lets us pull back BOTH the most recent N turns
(by scroll + turn_index sort) and the most SEMANTICALLY relevant past
turns (by vector search), and merge the two signals into the context
Claude sees.
"""

from typing import List
import logging
import uuid
from datetime import datetime

from qdrant_client.http import models as qmodels

from qdrant_init import get_qdrant_client
from embedder import get_embedding
from config import EMBEDDING_DIM


logger = logging.getLogger("memory.conversation")
logger.setLevel(logging.INFO)


CONVERSATION_COLLECTION = "conversation_memory"


# ---------------------------------------------------------------
# Collection bootstrap
# ---------------------------------------------------------------
def ensure_conversation_collection() -> None:
    """
    Create the `conversation_memory` collection if it does not exist.
    Idempotent — safe to call on every app startup.
    """
    client = get_qdrant_client()
    existing = {c.name for c in client.get_collections().collections}
    if CONVERSATION_COLLECTION in existing:
        logger.info("Collection '%s' already exists.", CONVERSATION_COLLECTION)
        return

    client.create_collection(
        collection_name=CONVERSATION_COLLECTION,
        vectors_config=qmodels.VectorParams(
            size=EMBEDDING_DIM,
            distance=qmodels.Distance.COSINE,
        ),
    )
    logger.info("Created collection '%s'.", CONVERSATION_COLLECTION)


# ---------------------------------------------------------------
# Write
# ---------------------------------------------------------------
def save_turn(
    session_id: str,
    user_id: str,
    user_message: str,
    assistant_message: str,
    turn_index: int,
) -> None:
    """
    Persist one conversation turn as TWO points (user + assistant).
    Both points share session_id, user_id, and turn_index.

    Both points are vectorized against the USER's message so a semantic
    search for a later question can retrieve the whole exchange
    (the assistant's answer is attached by turn_index).
    """
    client = get_qdrant_client()
    query_vector = get_embedding(user_message)
    timestamp = datetime.utcnow().isoformat()

    base_payload = {
        "session_id": session_id,
        "user_id": user_id or "anonymous",
        "turn_index": turn_index,
        "timestamp": timestamp,
        "query_text": user_message,
    }

    user_point = qmodels.PointStruct(
        id=str(uuid.uuid4()),
        vector=query_vector,
        payload={**base_payload, "role": "user", "content": user_message},
    )
    assistant_point = qmodels.PointStruct(
        id=str(uuid.uuid4()),
        vector=query_vector,
        payload={**base_payload, "role": "assistant", "content": assistant_message},
    )

    client.upsert(
        collection_name=CONVERSATION_COLLECTION,
        points=[user_point, assistant_point],
    )


# ---------------------------------------------------------------
# Read: recent turns (scroll by session_id, sort by turn_index)
# ---------------------------------------------------------------
def _session_filter(session_id: str) -> qmodels.Filter:
    return qmodels.Filter(
        must=[
            qmodels.FieldCondition(
                key="session_id",
                match=qmodels.MatchValue(value=session_id),
            )
        ]
    )


def get_recent_turns(session_id: str, limit: int = 6) -> List[dict]:
    """
    Return the most recent messages for this session, oldest-first.

    Implementation: scroll every point for the session (Qdrant's scroll does
    not support sorting), sort by turn_index asc (user before assistant when
    tied), then slice the last `limit` messages.
    """
    client = get_qdrant_client()
    collected: List[dict] = []
    next_offset = None

    while True:
        points, next_offset = client.scroll(
            collection_name=CONVERSATION_COLLECTION,
            scroll_filter=_session_filter(session_id),
            limit=256,
            offset=next_offset,
            with_payload=True,
            with_vectors=False,
        )
        for p in points:
            payload = p.payload or {}
            collected.append(
                {
                    "role": payload.get("role", "user"),
                    "content": payload.get("content", ""),
                    "turn_index": payload.get("turn_index", 0),
                    "timestamp": payload.get("timestamp", ""),
                }
            )
        if next_offset is None:
            break

    # Sort by (turn_index, role) — role sort keeps "assistant" after "user"
    # because 'a' < 'u' alphabetically; invert with a small key mapping.
    role_order = {"user": 0, "assistant": 1}
    collected.sort(key=lambda r: (r["turn_index"], role_order.get(r["role"], 2)))

    # Return only the last `limit` entries as {role, content}.
    trimmed = collected[-limit:] if limit and len(collected) > limit else collected
    return [{"role": r["role"], "content": r["content"]} for r in trimmed]


# ---------------------------------------------------------------
# Read: semantically relevant turns
# ---------------------------------------------------------------
def get_relevant_turns(session_id: str, query: str, limit: int = 3) -> List[dict]:
    """
    Return up to `limit` past turns from this session that are semantically
    close to `query`. Useful for long conversations where the answer to a
    follow-up depends on something said many turns ago.
    """
    client = get_qdrant_client()
    query_vector = get_embedding(query)
    hits = client.search(
        collection_name=CONVERSATION_COLLECTION,
        query_vector=query_vector,
        query_filter=_session_filter(session_id),
        limit=max(limit * 2, limit),  # fetch a bit extra to allow dedupe upstream
        with_payload=True,
    )

    results: List[dict] = []
    for h in hits:
        payload = h.payload or {}
        results.append(
            {
                "role": payload.get("role", "user"),
                "content": payload.get("content", ""),
                "turn_index": payload.get("turn_index", 0),
            }
        )
    return results[:limit]


# ---------------------------------------------------------------
# Combined context
# ---------------------------------------------------------------
def build_conversation_context(session_id: str, query: str) -> List[dict]:
    """
    Build the conversation window to inject into Claude's messages array.

    Strategy:
      1. Pull the 6 most recent messages.
      2. Pull the 3 most semantically relevant messages for the current query.
      3. Merge, deduplicate by (role, content), sort by turn_index ascending.

    Returns a list of {"role", "content"} dicts.
    """
    recent = get_recent_turns(session_id, limit=6)
    relevant = get_relevant_turns(session_id, query, limit=3)

    # Merge + dedupe. We re-enrich with turn_index by scrolling once more
    # only for the ones coming from `recent` / `relevant` — but since our
    # read paths already strip turn_index for `recent`, we approximate order
    # by keeping the original sequence where possible.
    seen: set[tuple[str, str]] = set()
    merged: List[dict] = []

    # Relevant hits carry turn_index; bring them in first so we can sort.
    for item in relevant:
        key = (item["role"], item["content"])
        if key in seen or not item["content"]:
            continue
        seen.add(key)
        merged.append({"role": item["role"], "content": item["content"], "turn_index": item.get("turn_index", 0)})

    # Append recent messages with a best-effort turn_index derived from order.
    # Their relative order within `recent` IS their chronological order.
    base_idx = 10**9  # large sentinel so recent items sort AFTER relevant ones
    for i, item in enumerate(recent):
        key = (item["role"], item["content"])
        if key in seen or not item["content"]:
            continue
        seen.add(key)
        merged.append(
            {
                "role": item["role"],
                "content": item["content"],
                "turn_index": base_idx + i,
            }
        )

    merged.sort(key=lambda r: r["turn_index"])
    return [{"role": r["role"], "content": r["content"]} for r in merged]


# ---------------------------------------------------------------
# Turn counting
# ---------------------------------------------------------------
def get_turn_count(session_id: str) -> int:
    """
    Return the number of TURNS (user+assistant pairs) in this session.

    Each turn writes two points, so we halve the point count. Used by the
    caller to determine the next turn_index.
    """
    client = get_qdrant_client()
    result = client.count(
        collection_name=CONVERSATION_COLLECTION,
        count_filter=_session_filter(session_id),
        exact=True,
    )
    total_points = result.count if hasattr(result, "count") else int(result)
    return total_points // 2


# ---------------------------------------------------------------
# Delete
# ---------------------------------------------------------------
def delete_session(session_id: str) -> None:
    """Remove every point belonging to a session."""
    client = get_qdrant_client()
    client.delete(
        collection_name=CONVERSATION_COLLECTION,
        points_selector=qmodels.FilterSelector(filter=_session_filter(session_id)),
    )
