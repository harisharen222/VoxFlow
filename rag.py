"""
rag.py
------
Retrieval-Augmented Generation orchestration layer.

Ties together:
    retriever.search_multi_query()  → fetch relevant chunks
    llm.rewrite_query()             → expand the question for better recall
    llm.generate_answer()           → produce a grounded, cited answer

Phase 7 adds optional memory injection:
    - conversation_context: prior turns in this session
    - user_context: system-prompt addendum with long-term facts

Exposes:
    ask(question, top_k, filter_type,
        conversation_context, user_context) → full RAG response dict
"""

from typing import List, Optional
from retriever import search_multi_query
from llm import rewrite_query, generate_answer


def ask(
    question: str,
    top_k: int = 5,
    filter_type: Optional[str] = None,
    conversation_context: Optional[List[dict]] = None,
    user_context: str = "",
) -> dict:
    """
    Full RAG pipeline: rewrite → retrieve → generate.

    Args:
        question: The user's natural language question.
        top_k: Number of chunks to retrieve and feed into the LLM.
        filter_type: Optional payload type filter.
        conversation_context: Optional prior turns as [{role, content}, ...]
            that should be inserted into Claude's messages array before the
            current question — enables multi-turn follow-ups.
        user_context: Optional string of remembered facts about the user;
            appended to the system prompt so Claude's answer is personalized.

    Returns:
        { question, answer, sources, chunks_used, queries_used }
    """
    # Step 1: expand the user question into diverse sub-queries.
    queries = rewrite_query(question)

    # Step 2: retrieve across all sub-queries and merge hits.
    chunks = search_multi_query(queries=queries, top_k=top_k)

    # Step 3: short-circuit if nothing relevant came back.
    if not chunks:
        return {
            "question": question,
            "answer": "I don't have any relevant information on that topic.",
            "sources": [],
            "chunks_used": 0,
            "queries_used": queries,
        }

    # Step 4: generate a grounded answer, passing memory context through.
    generated = generate_answer(
        question,
        chunks,
        conversation_context=conversation_context or [],
        user_context=user_context or "",
    )

    # Step 5: assemble the final response.
    return {
        "question": question,
        "answer": generated["answer"],
        "sources": generated["sources"],
        "chunks_used": generated["chunks_used"],
        "queries_used": queries,
    }
