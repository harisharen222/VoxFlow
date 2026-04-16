"""
routers/search.py
-----------------
FastAPI router exposing Phase 3 semantic search endpoints:
    POST /search         → single-query vector search (optional type filter)
    POST /search/multi   → multi-query fan-out with dedup + merge
"""

from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from retriever import search, search_multi_query


router = APIRouter(tags=["search"])


# ---------- Request models ----------
class SearchRequest(BaseModel):
    query: str
    top_k: int = 5
    filter_type: Optional[str] = None  # "pdf" | "web" | "manual" | None


class MultiSearchRequest(BaseModel):
    queries: List[str]
    top_k: int = 5


# ---------- Endpoints ----------
@router.post("/search")
def search_endpoint(payload: SearchRequest):
    """
    Run a single semantic search against the knowledge base.

    Returns the original query, ranked results, and total found.
    HTTP 400 if the query is empty.
    """
    if not payload.query or not payload.query.strip():
        raise HTTPException(status_code=400, detail="Query must not be empty.")

    try:
        results = search(
            query=payload.query,
            top_k=payload.top_k,
            filter_type=payload.filter_type,
        )
    except ValueError as e:
        # Raised by retriever when filter_type is invalid.
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Search failed: {e}")

    return {
        "query": payload.query,
        "results": results,
        "total_found": len(results),
    }


@router.post("/search/multi")
def multi_search_endpoint(payload: MultiSearchRequest):
    """
    Run several queries at once, merge + deduplicate the hits, and return the
    best top_k. Useful for LLM-driven query expansion in Phase 4.
    """
    if not payload.queries or all(not q.strip() for q in payload.queries):
        raise HTTPException(status_code=400, detail="Queries list must not be empty.")

    # Drop any empty/whitespace-only strings before dispatching.
    cleaned = [q for q in payload.queries if q and q.strip()]

    try:
        results = search_multi_query(queries=cleaned, top_k=payload.top_k)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Multi-query search failed: {e}")

    return {
        "queries": payload.queries,
        "results": results,
        "total_found": len(results),
    }
