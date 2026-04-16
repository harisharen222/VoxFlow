"""
vapi_config.py
--------------
Centralized Vapi configuration.

Holds the system prompt + default assistant settings returned dynamically
when Vapi sends an `assistant-request` event. Also exposes a helper to
read the public URL (where our webhook is reachable from the internet)
from environment variables.
"""

import os


# ---------------------------------------------------------------
# System prompt for the in-call Claude model (inside Vapi)
# ---------------------------------------------------------------
VAPI_SYSTEM_PROMPT = """
You are a voice-first knowledge assistant with access to a curated knowledge base.

When a user asks a question:
1. Always use the knowledge_query tool to search the knowledge base first
2. Answer based ONLY on what the tool returns
3. If the tool returns no results, say you don't have that information
4. Keep answers concise — this is a voice conversation, not a document
5. Speak naturally, as if talking to a person, not reading a report
6. Never mention "the knowledge base" or "the tool" — just answer directly
""".strip()


# ---------------------------------------------------------------
# Default Vapi assistant configuration
# ---------------------------------------------------------------
# Note: the `tools[*].server.url` is filled in at request time via
# get_public_url() because it depends on runtime (ngrok / deploy URL).
VAPI_ASSISTANT_CONFIG = {
    "name": "Knowledge Agent",
    "firstMessage": "Hello! I'm your knowledge assistant. What would you like to know?",
    "model": {
        # Haiku keeps in-call latency low; heavier reasoning happens server-side
        # when the knowledge_query tool fires and we run the full RAG pipeline.
        "provider": "anthropic",
        "model": "claude-3-haiku-20240307",
        "messages": [
            {"role": "system", "content": VAPI_SYSTEM_PROMPT},
        ],
    },
    "voice": {
        "provider": "11labs",
        "voiceId": "rachel",
    },
    "transcriber": {
        "provider": "deepgram",
        "model": "nova-2",
        "language": "en-US",
    },
    "endCallMessage": "Goodbye! Feel free to call again.",
    "endCallPhrases": ["goodbye", "bye", "that's all", "thank you bye"],
    "silenceTimeoutSeconds": 30,
    "maxDurationSeconds": 600,
}


# ---------------------------------------------------------------
# Tool definition — attached to the assistant config at request time
# ---------------------------------------------------------------
def build_knowledge_query_tool(webhook_url: str) -> dict:
    """
    Build the `knowledge_query` function-tool definition. Vapi will call
    `webhook_url` when the in-call model decides to invoke the tool.
    """
    return {
        "type": "function",
        "function": {
            "name": "knowledge_query",
            "description": "Query the knowledge base to answer user questions",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The user's question",
                    },
                },
                "required": ["query"],
            },
        },
        "server": {"url": webhook_url},
    }


# ---------------------------------------------------------------
# Helper: read PUBLIC_URL from environment
# ---------------------------------------------------------------
def get_public_url() -> str:
    """
    Return the public base URL where this server is reachable
    (e.g. an ngrok tunnel or a deployed domain).

    Raises:
        RuntimeError: if PUBLIC_URL is not set — needed for Vapi to reach
                      our tool webhook.
    """
    url = os.getenv("PUBLIC_URL", "").strip()
    if not url:
        raise RuntimeError(
            "PUBLIC_URL is not set. Set it in your .env to the public base URL "
            "where this server is reachable (e.g., an ngrok HTTPS URL) so Vapi "
            "can call the /vapi/webhook tool endpoint."
        )
    # Strip any trailing slash for predictable concatenation.
    return url.rstrip("/")
