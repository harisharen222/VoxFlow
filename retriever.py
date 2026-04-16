from qdrant_client.http import models as qmodels
from typing import Optional, List, Dict
from config import QDRANT_COLLECTION
from qdrant_init import get_qdrant_client
from embedder import get_embedding


_ALLOWED_TYPES = {"pdf", "web", "manual"}


def _build_type_filter(filter_type: Optional[str]) -> Optional[qmodels.Filter]:
    if not filter_type:
        return None
    if filter_type not in _ALLOWED_TYPES:
        raise ValueError(
            f"Invalid filter_type '{filter_type}'. Must be one of {sorted(_ALLOWED_TYPES)}."
        )

    return qmodels.Filter(
        must=[
            qmodels.FieldCondition(
                key="type",
                match=qmodels.MatchValue(value=filter_type),
            )
        ]
    )


def search(
    query: str,
    top_k: int = 5,
    filter_type: Optional[str] = None,
) -> List[Dict]:
    query_vector = get_embedding(query)
    query_filter = _build_type_filter(filter_type)

    client = get_qdrant_client()
    hits = client.search(
        collection_name=QDRANT_COLLECTION,
        query_vector=query_vector,
        query_filter=query_filter,
        limit=top_k,
        with_payload=True,
    )

    results: List[Dict] = []
    for hit in hits:
        payload = hit.payload or {}
        results.append(
            {
                "text": payload.get("text", ""),
                "source": payload.get("source", ""),
                "type": payload.get("type", ""),
                "chunk_index": payload.get("chunk_index", -1),
                "score": float(hit.score),
                "ingested_at": payload.get("ingested_at", ""),
            }
        )

    return results


def search_multi_query(queries: List[str], top_k: int = 5) -> List[Dict]:
    merged: Dict[str, Dict] = {}
    per_query_k = max(top_k, 5)

    for q in queries:
        hits = search(q, top_k=per_query_k)
        for hit in hits:
            key = f"{hit['source']}::{hit['chunk_index']}"
            existing = merged.get(key)
            if existing is None or hit["score"] > existing["score"]:
                merged[key] = hit

    ranked = sorted(merged.values(), key=lambda r: r["score"], reverse=True)
    return ranked[:top_k]