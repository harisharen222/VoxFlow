"""
llm.py
------
Gemini-powered reasoning module.

Provides:
    - rewrite_query()        → expand a user question into 2-3 diverse sub-queries
    - build_context_prompt() → assemble a grounded RAG prompt from retrieved chunks
    - generate_answer()      → call Gemini to produce a grounded, cited answer

All calls use `gemini-2.5-flash` with temperature=0 for deterministic output.
"""

from typing import List, Optional
import json

import google.generativeai as genai

import config


# Configure the SDK once at import time.
genai.configure(api_key=config.GEMINI_API_KEY)

# Model identifier used for every Gemini call in this module.
_MODEL = config.GEMINI_MODEL


def _extract_text(response) -> str:
    """Pull plain text out of a Gemini response, tolerant of empty candidates."""
    try:
        if getattr(response, "text", None):
            return response.text
    except Exception:
        pass
    # Fallback: walk candidates/parts manually.
    out = ""
    for cand in getattr(response, "candidates", []) or []:
        content = getattr(cand, "content", None)
        for part in getattr(content, "parts", []) or []:
            t = getattr(part, "text", "")
            if t:
                out += t
    return out


def _strip_code_fence(text: str) -> str:
    """Strip ```json ... ``` fences that models sometimes wrap JSON in."""
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:]
        cleaned = cleaned.strip()
    return cleaned


# ---------------------------------------------------------------
# 1. Query rewriting
# ---------------------------------------------------------------
def rewrite_query(question: str) -> List[str]:
    """
    Expand a user question into 2-3 semantically diverse search queries.
    Falls back to `[question]` on any failure.
    """
    system_prompt = (
        "You are a search query optimizer. Given a user question, "
        "return 2-3 different search queries that together cover the full meaning. "
        "Respond ONLY with a JSON array of strings. No explanation."
    )

    try:
        model = genai.GenerativeModel(_MODEL, system_instruction=system_prompt)
        response = model.generate_content(
            question,
            generation_config={"temperature": 0, "max_output_tokens": 256},
        )
        raw_text = _extract_text(response)
        cleaned = _strip_code_fence(raw_text)
        queries = json.loads(cleaned)

        if isinstance(queries, list):
            cleaned_queries = [q for q in queries if isinstance(q, str) and q.strip()]
            if cleaned_queries:
                return cleaned_queries
    except Exception:
        pass

    return [question]


# ---------------------------------------------------------------
# 2. Prompt construction
# ---------------------------------------------------------------
def build_context_prompt(question: str, chunks: List[dict]) -> str:
    """Build a structured RAG prompt from retrieved chunks."""
    lines: List[str] = []

    lines.append(
        "You are a helpful personal productivity assistant. "
        "Answer using ONLY the provided context below. "
        "If the answer is not in the context, say so clearly. "
        "Be concise and direct."
    )
    lines.append("")

    for idx, chunk in enumerate(chunks, start=1):
        source = chunk.get("source", "unknown")
        ctype = chunk.get("type", "unknown")
        text = chunk.get("text", "")
        lines.append(f"[Source {idx} — {source} ({ctype})]")
        lines.append(text)
        lines.append("")

    lines.append(f"User Question: {question}")
    lines.append("Answer (cite sources by number, e.g. [Source 1]):")

    return "\n".join(lines)


# ---------------------------------------------------------------
# 3. Grounded answer generation
# ---------------------------------------------------------------
def generate_answer(
    question: str,
    chunks: List[dict],
    conversation_context: Optional[List[dict]] = None,
    user_context: str = "",
) -> dict:
    """
    Generate a grounded answer from retrieved chunks using Gemini.

    Gemini uses roles "user" and "model" (not "assistant"). Prior turns with
    role="assistant" are remapped transparently.
    """
    prompt = build_context_prompt(question, chunks)

    # Build contents: [prior turns..., current user message].
    # Gemini's message shape: {"role": "user"|"model", "parts": [{"text": "..."}]}
    contents: List[dict] = []
    if conversation_context:
        for turn in conversation_context:
            role = turn.get("role")
            content = turn.get("content", "")
            if not content:
                continue
            if role == "user":
                contents.append({"role": "user", "parts": [{"text": content}]})
            elif role in ("assistant", "model"):
                contents.append({"role": "model", "parts": [{"text": content}]})
    contents.append({"role": "user", "parts": [{"text": prompt}]})

    # user_context becomes the system instruction so it steers every reply.
    system_instruction = user_context.strip() if user_context and user_context.strip() else None

    model = genai.GenerativeModel(_MODEL, system_instruction=system_instruction)
    response = model.generate_content(
        contents,
        generation_config={"temperature": 0, "max_output_tokens": 1024},
    )

    answer_text = _extract_text(response)

    sources = []
    for chunk in chunks:
        text = chunk.get("text", "")
        sources.append(
            {
                "source": chunk.get("source", ""),
                "type": chunk.get("type", ""),
                "score": chunk.get("score", 0.0),
                "text_preview": text[:120],
            }
        )

    return {
        "answer": answer_text.strip(),
        "sources": sources,
        "chunks_used": len(chunks),
    }
