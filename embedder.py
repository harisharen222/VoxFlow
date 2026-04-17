"""
embedder.py
-----------
Wraps the sentence-transformers model that turns text into 384-dim vectors.

The model is loaded ONCE at module import time so that every call to
get_embedding() reuses the same in-memory instance. Reloading the model
on every call would be extremely slow.
"""

from typing import List
import google.generativeai as genai
from config import EMBEDDING_MODEL, GEMINI_API_KEY

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

def get_embedding(text: str) -> List[float]:
    """
    Convert a piece of text into a high-dimensional embedding vector via Gemini API.
    """
    result = genai.embed_content(
        model=EMBEDDING_MODEL,
        content=text,
        task_type="retrieval_document"
    )
    return result['embedding']
