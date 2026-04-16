"""
routers/connectors.py
---------------------
REST endpoints for triggering connector syncs and checking configuration:

    GET  /connectors/status         → which connectors have credentials set
    POST /connectors/gdrive/sync    → pull files from Drive into Qdrant
    POST /connectors/notion/sync    → pull pages from Notion into Qdrant
"""

import os
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from connectors import gdrive_connector, notion_connector


router = APIRouter(prefix="/connectors", tags=["connectors"])


# ---------- Request models ----------
class GDriveSyncRequest(BaseModel):
    folder_id: Optional[str] = None


class NotionSyncRequest(BaseModel):
    database_id: Optional[str] = None


# ---------- Status ----------
@router.get("/status")
def connectors_status():
    """
    Report whether the env vars required for each connector are set.
    Does NOT validate the credentials against the remote services.
    """
    gdrive_env = "GOOGLE_SERVICE_ACCOUNT_JSON"
    notion_env = "NOTION_TOKEN"

    return {
        "gdrive": {
            "configured": bool(os.getenv(gdrive_env, "").strip()),
            "env_var": gdrive_env,
        },
        "notion": {
            "configured": bool(os.getenv(notion_env, "").strip()),
            "env_var": notion_env,
        },
    }


# ---------- Google Drive sync ----------
@router.post("/gdrive/sync")
def gdrive_sync(payload: GDriveSyncRequest = GDriveSyncRequest()):
    """Trigger a Google Drive sync. Optional `folder_id` scopes the pull."""
    if not os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON", "").strip():
        raise HTTPException(
            status_code=422,
            detail="GOOGLE_SERVICE_ACCOUNT_JSON is not set. Configure the "
                   "service-account JSON before triggering a sync.",
        )
    try:
        return gdrive_connector.sync_drive_folder(folder_id=payload.folder_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Drive sync failed: {e}")


# ---------- Notion sync ----------
@router.post("/notion/sync")
def notion_sync(payload: NotionSyncRequest = NotionSyncRequest()):
    """Trigger a Notion sync. Optional `database_id` scopes the pull."""
    if not os.getenv("NOTION_TOKEN", "").strip():
        raise HTTPException(
            status_code=422,
            detail="NOTION_TOKEN is not set. Configure the Notion integration "
                   "token before triggering a sync.",
        )
    try:
        return notion_connector.sync_notion_workspace(database_id=payload.database_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Notion sync failed: {e}")
