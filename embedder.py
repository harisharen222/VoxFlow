"""
embedder.py
-----------
Wraps the sentence-transformers model that turns text into 384-dim vectors.

The model is loaded ONCE at module import time so that every call to
get_embedding() reuses the same in-memory instance. Reloading the model
on every call would be extremely slow.
"""

from typing import List
from sentence_transformers import SentenceTransformer

from config import EMBEDDING_MODEL

# Load the model once, at module level.
# First run will download weights from HuggingFace and cache them locally.
_model = SentenceTransformer(EMBEDDING_MODEL)


def get_embedding(text: str) -> List[float]:
    """
    Convert a piece of text into a 384-dimensional embedding vector.

    Args:
        text: The input string to embed.

    Returns:
        A list of floats (length 384 for all-MiniLM-L6-v2).
    """
    # encode() returns a numpy array; convert to a plain Python list
    # so it can be serialized to JSON by FastAPI without extra work.
    vector = _model.encode(text, convert_to_numpy=True)
    return vector.tolist()
