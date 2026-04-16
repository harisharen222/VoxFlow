"""
voice_formatter.py
------------------
Utilities that turn text-oriented RAG output into clean, speakable text for
Vapi's TTS layer, and wrap the result into the exact webhook response shape
Vapi expects.
"""

from typing import List
import re


# Max words allowed in a spoken response. Vapi/11labs TTS sounds best when
# each reply is under ~30 seconds, which maps to roughly 280 words.
_MAX_WORDS = 280


def format_for_voice(text: str) -> str:
    """
    Clean a RAG answer for spoken delivery.

    Operations (in order):
      1. Remove inline/fenced code backticks.
      2. Strip markdown bold/italic/heading markers (**, *, __, _, ##, ###).
      3. Remove citation markers like [1], [Source 2], (Source: foo).
      4. Convert numbered lists ("1.", "2.") into spoken transitions
         ("First,", "Second,", ... "Finally,").
      5. Strip leading bullet markers (-, •, *) at line starts.
      6. Collapse excess whitespace/newlines into single spaces.
      7. Truncate to ~280 words at a sentence boundary when possible.

    Args:
        text: Raw answer string (may contain markdown + citations).

    Returns:
        Plain-English string safe for TTS.
    """
    if not text:
        return ""

    cleaned = text

    # 1. Remove code fences and inline backticks entirely.
    cleaned = re.sub(r"```[\s\S]*?```", " ", cleaned)
    cleaned = cleaned.replace("`", "")

    # 2. Strip markdown emphasis/heading markers.
    #    Remove **bold**, __bold__, *italic*, _italic_ by dropping the markers.
    cleaned = re.sub(r"\*\*(.+?)\*\*", r"\1", cleaned)
    cleaned = re.sub(r"__(.+?)__", r"\1", cleaned)
    cleaned = re.sub(r"(?<!\w)\*(.+?)\*(?!\w)", r"\1", cleaned)
    cleaned = re.sub(r"(?<!\w)_(.+?)_(?!\w)", r"\1", cleaned)
    #    Remove leading heading hashes like "## Title" → "Title".
    cleaned = re.sub(r"^\s*#{1,6}\s*", "", cleaned, flags=re.MULTILINE)

    # 3. Remove citation markers.
    #    [1], [12], [Source 3], [source: foo], (Source: foo), (source 2)
    cleaned = re.sub(r"\[\s*source\s*\d+\s*\]", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\[\s*source[^\]]*\]", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\[\s*\d+\s*\]", "", cleaned)
    cleaned = re.sub(r"\(\s*source[^)]*\)", "", cleaned, flags=re.IGNORECASE)

    # 4. Convert numbered lists into spoken transitions.
    #    Split on lines; translate leading "N." markers.
    ordinal_words = ["First", "Second", "Third", "Fourth", "Fifth",
                     "Sixth", "Seventh", "Eighth", "Ninth", "Tenth"]

    new_lines: List[str] = []
    num_line_re = re.compile(r"^\s*(\d+)[\.\)]\s+(.*)$")
    seen_numbers: List[int] = []

    # First pass: detect which numbered items appear (to know when we hit the last).
    raw_lines = cleaned.splitlines()
    numbered_positions = [
        i for i, ln in enumerate(raw_lines) if num_line_re.match(ln)
    ]
    last_num_idx = numbered_positions[-1] if numbered_positions else -1

    for i, line in enumerate(raw_lines):
        m = num_line_re.match(line)
        if m:
            n = int(m.group(1))
            body = m.group(2).strip()
            seen_numbers.append(n)
            # "Finally," for the last numbered item when there are ≥ 2.
            if i == last_num_idx and len(numbered_positions) >= 2:
                transition = "Finally,"
            elif 1 <= n <= len(ordinal_words):
                transition = f"{ordinal_words[n - 1]},"
            else:
                transition = f"Next,"
            new_lines.append(f"{transition} {body}")
        else:
            new_lines.append(line)

    cleaned = "\n".join(new_lines)

    # 5. Strip leading bullet markers (-, •, *) at the start of lines.
    cleaned = re.sub(r"^\s*[-•*]\s+", "", cleaned, flags=re.MULTILINE)

    # 6. Collapse whitespace.
    cleaned = re.sub(r"\s+", " ", cleaned).strip()

    # 7. Cap length to ~280 words, preferring to cut at a sentence boundary.
    words = cleaned.split()
    if len(words) > _MAX_WORDS:
        truncated = " ".join(words[:_MAX_WORDS])
        # Try to end at the last sentence boundary inside the truncation.
        last_period = max(truncated.rfind("."), truncated.rfind("!"), truncated.rfind("?"))
        if last_period > 0 and last_period >= len(truncated) * 0.6:
            truncated = truncated[: last_period + 1]
        cleaned = truncated.strip()

    return cleaned


def build_vapi_response(
    answer: str,
    tool_call_id: str = "",
    status: str = "success",
) -> dict:
    """
    Wrap a formatted answer in the webhook response shape Vapi expects
    for a Tool Call response.

    Args:
        answer: The voice-formatted answer string.
        tool_call_id: The toolCallId to echo back (from the inbound request).
        status: Optional status tag — kept for compatibility with the original
                signature; Vapi itself only needs `results`.

    Returns:
        {
            "results": [
                { "toolCallId": <id>, "result": <answer> }
            ]
        }
    """
    return {
        "results": [
            {
                "toolCallId": tool_call_id,
                "result": answer,
            }
        ]
    }
