"""The finished report on its own, for clients that don't need the event log."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException

from .investigations import get_run

router = APIRouter(tags=["reports"])


@router.get("/investigations/{run_id}/report")
async def report(run_id: str) -> dict[str, Any]:
    run = await get_run(run_id)
    if run.report is None:
        raise HTTPException(409, run.error or "This investigation hasn't finished yet.")
    return run.report
