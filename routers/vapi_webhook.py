"""
routers/vapi_webhook.py
-----------------------
Single inbound webhook for all Vapi events. Vapi sends several event types
to the same URL, distinguished by `message.type`:

    - assistant-request    → return a dynamic assistant config
    - tool-calls           → execute the knowledge_query tool (runs RAG)
    - end-of-call-report   → log call summary
    - status-update        → log status transitions
    - <anything else>      → log + acknowledge

Tool-call handling is the most important path: it extracts the query from
the payload, runs the Phase 4 RAG pipeline, formats the answer for voice,
and echoes back the toolCallId that Vapi requires to correlate the reply.
"""

import logging
from copy import deepcopy

from fastapi import APIRouter, Request

import asyncio

import rag  # Phase 4 RAG orchestration — rag.ask(question, top_k, filter_type)
from voice_formatter import format_for_voice, build_vapi_response
from vapi_config import (
    VAPI_ASSISTANT_CONFIG,
    build_knowledge_query_tool,
    get_public_url,
)
from memory.conversation_memory import (
    build_conversation_context,
    get_turn_count,
    save_turn,
)
from memory.user_memory import build_user_context, extract_and_save_facts


logger = logging.getLogger("vapi.webhook")
logger.setLevel(logging.INFO)


router = APIRouter(prefix="/vapi", tags=["vapi"])


# ---------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------
def _build_dynamic_assistant() -> dict:
    """
    Produce the assistant config returned on `assistant-request`.
    The tool's server URL is computed at call time from PUBLIC_URL.
    """
    try:
        webhook_url = f"{get_public_url()}/vapi/webhook"
    except RuntimeError as e:
        # Surface config errors clearly in logs — Vapi will see an empty tools list.
        logger.error("PUBLIC_URL misconfiguration: %s", e)
        webhook_url = ""

    assistant = deepcopy(VAPI_ASSISTANT_CONFIG)
    assistant["tools"] = [build_knowledge_query_tool(webhook_url)] if webhook_url else []
    return {"assistant": assistant}


async def _handle_tool_calls(message: dict) -> dict:
    """
    Execute tool calls from Vapi. Currently we only implement `knowledge_query`.

    Expected payload shape (simplified):
        message.toolCallList: [
            {
              "id": "<toolCallId>",
              "function": { "name": "knowledge_query",
                            "arguments": { "query": "<string>" } }
            }
        ]
    """
    tool_calls = message.get("toolCallList") or message.get("toolCalls") or []
    if not tool_calls:
        logger.warning("tool-calls event received with no toolCallList")
        return {"results": []}

    # For Phase 5 we support a single tool call per event. Vapi typically sends one.
    call = tool_calls[0]
    tool_call_id = call.get("id", "")
    function = call.get("function", {}) or {}
    name = function.get("name", "")
    arguments = function.get("arguments", {}) or {}

    # Arguments may arrive as a dict already, or as a JSON string — handle both.
    if isinstance(arguments, str):
        import json
        try:
            arguments = json.loads(arguments)
        except Exception:
            arguments = {}

    query = (arguments.get("query") or "").strip()
    logger.info("tool-call received: name=%s toolCallId=%s query=%r", name, tool_call_id, query)

    if name != "knowledge_query" or not query:
        return build_vapi_response(
            "I'm sorry, I didn't catch a valid question.",
            tool_call_id=tool_call_id,
        )

    # Phase 7: derive session_id + user_id from the Vapi call payload so the
    # webhook shares the same memory layers as /ask.
    call = message.get("call", {}) or {}
    session_id = call.get("id") or "vapi-default"
    customer = call.get("customer", {}) or {}
    user_id = customer.get("number") or "anonymous"

    # Build memory context before answering.
    try:
        conversation_ctx = build_conversation_context(session_id, query)
    except Exception:
        conversation_ctx = []
    try:
        user_ctx = build_user_context(user_id, query)
    except Exception:
        user_ctx = ""

    # Run the RAG pipeline. Any failure returns a graceful voice message.
    raw_answer = ""
    try:
        rag_result = rag.ask(
            question=query,
            conversation_context=conversation_ctx,
            user_context=user_ctx,
        )
        raw_answer = rag_result.get("answer", "") or ""
        if not raw_answer.strip():
            spoken = "I'm sorry, I couldn't find an answer to that."
        else:
            spoken = format_for_voice(raw_answer)
    except Exception as e:
        logger.exception("RAG pipeline failed for query=%r: %s", query, e)
        spoken = "I'm sorry, I couldn't find an answer to that."

    # Persist the turn + schedule fact extraction (non-blocking).
    try:
        turn_idx = get_turn_count(session_id)
        save_turn(
            session_id=session_id,
            user_id=user_id,
            user_message=query,
            assistant_message=raw_answer,
            turn_index=turn_idx,
        )
    except Exception as e:
        logger.warning("save_turn failed (non-fatal): %s", e)

    if raw_answer:
        # Fire-and-forget fact extraction.
        asyncio.create_task(
            asyncio.to_thread(
                extract_and_save_facts, user_id, session_id, query, raw_answer
            )
        )

    return build_vapi_response(spoken, tool_call_id=tool_call_id)


# ---------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------
@router.post("/webhook")
async def vapi_webhook(request: Request):
    """
    Single entry point for all Vapi webhook events.

    Routes by `message.type`:
        assistant-request, tool-calls, end-of-call-report, status-update.
    """
    payload = await request.json()
    message = payload.get("message", {}) or {}
    event_type = message.get("type", "unknown")

    logger.info("vapi webhook event: type=%s", event_type)

    # --- 1. assistant-request ---
    if event_type == "assistant-request":
        return _build_dynamic_assistant()

    # --- 2. tool-calls (RAG entry point) ---
    if event_type == "tool-calls":
        return await _handle_tool_calls(message)

    # --- 3. end-of-call-report ---
    if event_type == "end-of-call-report":
        # Vapi sends a rich payload — we log the high-level summary.
        call = message.get("call", {}) or {}
        duration = message.get("durationSeconds") or message.get("duration")
        summary = message.get("summary") or message.get("analysis", {}).get("summary")
        transcript = message.get("transcript")
        logger.info(
            "end-of-call-report: callId=%s duration=%s summary=%s",
            call.get("id"),
            duration,
            summary,
        )
        if transcript:
            logger.debug("transcript: %s", transcript)
        return {"status": "ok"}

    # --- 4. status-update ---
    if event_type == "status-update":
        status = message.get("status")
        logger.info("status-update: status=%s", status)
        return {"status": "ok"}

    # --- 5. default / unknown ---
    logger.info("unhandled vapi event type=%r — acknowledging", event_type)
    return {"status": "received"}
