"""
config.py
---------
Centralized configuration loader.

Reads environment variables from the `.env` file (via python-dotenv) and
exposes them as plain Python constants for the rest of the app to import.
Keeping all config in one place avoids scattering os.getenv calls everywhere.
"""

import os
from dotenv import load_dotenv

# Load variables from .env into the process environment.
# If a variable is already set in the real environment, that wins.
load_dotenv()


# ---------- Qdrant ----------
QDRANT_HOST = os.getenv("QDRANT_HOST", "localhost")
QDRANT_PORT = int(os.getenv("QDRANT_PORT", "6333"))
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")          # None if not set = local mode
QDRANT_COLLECTION = os.getenv("QDRANT_COLLECTION", "knowledge_base")


# ---------- Embeddings ----------
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
EMBEDDING_DIM = int(os.getenv("EMBEDDING_DIM", "384"))


# ---------- External APIs ----------
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
VAPI_API_KEY = os.getenv("VAPI_API_KEY", "")


# ---------- Public URL (for Vapi webhooks) ----------
PUBLIC_URL = os.getenv("PUBLIC_URL", "")


# ---------- Connectors ----------
GOOGLE_SERVICE_ACCOUNT_JSON = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON", "")
NOTION_TOKEN = os.getenv("NOTION_TOKEN", "")


# ---------- FastAPI server ----------
APP_HOST = os.getenv("APP_HOST", "0.0.0.0")
APP_PORT = int(os.getenv("APP_PORT", "8000"))