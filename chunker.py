"""
chunker.py
----------
Text chunking utility.

Splits input text into sentence-aware chunks of roughly `chunk_size` words
with a sliding `overlap` of words carried between consecutive chunks. This
preserves semantic boundaries better than naive character slicing.
"""

from typing import List
import nltk

# Download the Punkt sentence tokenizer the first time this module is imported.
# `quiet=True` suppresses console noise; subsequent runs are no-ops.
nltk.download("punkt", quiet=True)
nltk.download("punkt_tab", quiet=True)

from nltk.tokenize import sent_tokenize


def chunk_text(text: str, chunk_size: int = 300, overlap: int = 50) -> List[str]:
    """
    Split `text` into sentence-aware chunks.

    Algorithm:
      1. Tokenize into sentences via nltk.sent_tokenize.
      2. Greedily append sentences to the current chunk until the running
         word count would exceed `chunk_size`.
      3. Flush the chunk, then seed the next chunk with the trailing
         `overlap` words of the previous one so context carries over.

    Args:
        text: The raw input text.
        chunk_size: Target words per chunk (soft cap — we never split a sentence).
        overlap: Number of trailing words repeated at the start of the next chunk.

    Returns:
        A list of chunk strings. Empty list if `text` is empty/whitespace.
    """
    # Guard against empty input.
    if not text or not text.strip():
        return []

    # Step 1: break into sentences.
    sentences = sent_tokenize(text.strip())

    chunks: List[str] = []
    current_words: List[str] = []

    for sentence in sentences:
        sentence_words = sentence.split()

        # If adding this sentence would overflow the chunk, flush first.
        if current_words and len(current_words) + len(sentence_words) > chunk_size:
            chunks.append(" ".join(current_words))
            # Seed next chunk with the last `overlap` words for context continuity.
            current_words = current_words[-overlap:] if overlap > 0 else []

        current_words.extend(sentence_words)

    # Flush any remaining words as the final chunk.
    if current_words:
        chunks.append(" ".join(current_words))

    return chunks
