"""
routers/memory.py
-----------------
Inspection and management endpoints for the Phase 7 memory layers.

    GET    /memory/session/{session_id}      → full turns in a session
    GET    /memory/user/{user_id}            → full facts for a user
    DELETE /memory/session/{session_id}      → wipe a session
    DELETE /memory/user/{user_id}            → wipe a user's facts
    POST   /memory/user/{user_id}/facts      → manually add a fact
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from memory.conversation_memory import (
    get_recent_turns,
    delete_session,
)
from memory.user_memory import (
    get_all_user_facts,
    save_user_fact,
    delete_user,
)


router = APIRouter(prefix="/memory", tags=["memory"])


# ---------- Request models ----------
class FactRequest(BaseModel):
    fact: str
    category: str = "other"
    confidence: float = 1.0


# ---------- Session ----------
@router.get("/session/{session_id}")
def get_session(session_id: str):
    """Return up to 100 turns for the given session."""
    try:
        turns = get_recent_turns(session_id, limit=100)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Memory read failed: {e}")
    return {"session_id": session_id, "turns": turns, "count": len(turns)}


@router.delete("/session/{session_id}")
def delete_session_endpoint(session_id: str):
    """Erase every stored point for this session."""
    try:
        delete_session(session_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Memory delete failed: {e}")
    return {"deleted": True, "session_id": session_id}


# ---------- User ----------
@router.get("/user/{user_id}")
def get_user(user_id: str):
    """Return every stored fact for the given user."""
    try:
        facts = get_all_user_facts(user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Memory read failed: {e}")
    return {"user_id": user_id, "facts": facts, "count": len(facts)}


@router.delete("/user/{user_id}")
def delete_user_endpoint(user_id: str):
    """Erase every stored fact for this user."""
    try:
        delete_user(user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Memory delete failed: {e}")
    return {"deleted": True, "user_id": user_id}


@router.post("/user/{user_id}/facts")
def add_user_fact(user_id: str, payload: FactRequest):
    """Manually add a single fact for the given user (source='explicit')."""
    if not payload.fact or not payload.fact.strip():
        raise HTTPException(status_code=400, detail="Fact must not be empty.")
    try:
        save_user_fact(
            user_id=user_id,
            fact=payload.fact,
            category=payload.category,
            source="explicit",
            confidence=payload.confidence,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Memory write failed: {e}")
    return {"saved": True, "fact": payload.fact}
