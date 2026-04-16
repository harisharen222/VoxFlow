"""
routers/ingest.py
-----------------
FastAPI router exposing three ingestion endpoints:
    POST /ingest/pdf   → multipart PDF upload
    POST /ingest/url   → fetch + ingest a web page
    POST /ingest/text  → ingest raw text

Each endpoint delegates to the corresponding function in ingestor.py
and returns a uniform success payload, or HTTP 400 on failure.
"""

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from ingestor import ingest_pdf, ingest_url, ingest_text


router = APIRouter(prefix="/ingest", tags=["ingest"])


# ---------- Request models ----------
class UrlRequest(BaseModel):
    url: str


class TextRequest(BaseModel):
    text: str
    source_name: str


# ---------- Endpoints ----------
@router.post("/pdf")
async def ingest_pdf_endpoint(file: UploadFile = File(...)):
    """
    Accept a multipart PDF upload, extract & ingest it.
    Returns number of chunks stored.
    """
    try:
        file_bytes = await file.read()
        chunks_stored = ingest_pdf(file_bytes, source_name=file.filename or "uploaded.pdf")
        return {
            "source": file.filename,
            "chunks_stored": chunks_stored,
            "status": "success",
        }
    except Exception as e:
        # Surface the underlying error as a 400 for the caller.
        raise HTTPException(status_code=400, detail=f"PDF ingestion failed: {e}")


@router.post("/url")
def ingest_url_endpoint(payload: UrlRequest):
    """
    Fetch a web page, extract readable content, and ingest it.
    """
    try:
        chunks_stored = ingest_url(payload.url)
        return {
            "source": payload.url,
            "chunks_stored": chunks_stored,
            "status": "success",
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"URL ingestion failed: {e}")


@router.post("/text")
def ingest_text_endpoint(payload: TextRequest):
    """
    Ingest a raw text string under the given source name.
    """
    try:
        chunks_stored = ingest_text(payload.text, payload.source_name)
        return {
            "source": payload.source_name,
            "chunks_stored": chunks_stored,
            "status": "success",
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Text ingestion failed: {e}")
