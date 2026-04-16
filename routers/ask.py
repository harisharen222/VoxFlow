"""
routers/ask.py
--------------
FastAPI router exposing the RAG endpoint.

Phase 7 adds session + user memory:
    - `session_id` ties a /ask call to a conversation (multi-turn).
    - `user_id`    ties the call to a long-term user profile.

Before answering, we build two context layers:
    - conversation_context: merged recent + semantically relevant past turns
    - user_context:         bullet list of remembered facts about the user

After answering, we:
    1. persist the (user, assistant) pair to conversation_memory,
    2. run fact extraction in the background so it does not block the
       response to the caller.
"""

from typing import Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel

from rag import ask as rag_ask
from memory.conversation_memory import (
    build_conversation_context,
    get_turn_count,
    save_turn,
)
from memory.user_memory import build_user_context, extract_and_save_facts


router = APIRouter(tags=["ask"])


# ---------- Request model ----------
class AskRequest(BaseModel):
    question: str
    top_k: int = 5
    filter_type: Optional[str] = None
    session_id: str = "default"
    user_id: str = "anonymous"


# ---------- Endpoint ----------
@router.post("/ask")
def ask_endpoint(payload: AskRequest, background_tasks: BackgroundTasks):
    """
    Full RAG with memory: retrieve → inject history + user facts → generate
    cited answer → persist turn + schedule fact extraction.

    Errors:
        - 400 if the question is empty.
        - 503 "LLM unavailable" on downstream LLM failure.
    """
    if not payload.question or not payload.question.strip():
        raise HTTPException(status_code=400, detail="Question must not be empty.")

    # Build memory context BEFORE the call.
    try:
        conversation_ctx = build_conversation_context(
            payload.session_id, payload.question
        )
    except Exception:
        # Memory read failures should never break answering.
        conversation_ctx = []

    try:
        user_ctx = build_user_context(payload.user_id, payload.question)
    except Exception:
        user_ctx = ""

    # Run the RAG pipeline with memory injected.
    try:
        result = rag_ask(
            question=payload.question,
            top_k=payload.top_k,
            filter_type=payload.filter_type,
            conversation_context=conversation_ctx,
            user_context=user_ctx,
        )
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"LLM unavailable: {e}")

    # Persist this turn synchronously (cheap: one embed + one upsert).
    try:
        turn_idx = get_turn_count(payload.session_id)
        save_turn(
            session_id=payload.session_id,
            user_id=payload.user_id,
            user_message=payload.question,
            assistant_message=result.get("answer", ""),
            turn_index=turn_idx,
        )
    except Exception:
        # Memory write failures are non-fatal — the answer still returns.
        pass

    # Fact extraction is an extra Claude call — defer so the user gets the
    # response immediately.
    background_tasks.add_task(
        extract_and_save_facts,
        payload.user_id,
        payload.session_id,
        payload.question,
        result.get("answer", ""),
    )

    return result
