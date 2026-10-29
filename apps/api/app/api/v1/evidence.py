"""The evidence trail of a finished investigation, as separate resources: claims, and claim-to-source evidence."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException

from .investigations import get_run

router = APIRouter(tags=["evidence"])
RELATION = {"verified": "supports", "contradicted": "contradicts"}


def _report(run_report: dict[str, Any] | None) -> dict[str, Any]:
    if not run_report:
        raise HTTPException(409, "This investigation hasn't finished yet.")
    return run_report


@router.get("/investigations/{run_id}/claims")
async def claims(run_id: str) -> list[dict[str, Any]]:
    return _report((await get_run(run_id)).report)["claims"]


@router.get("/investigations/{run_id}/evidence")
async def evidence(run_id: str) -> dict[str, Any]:
    report = _report((await get_run(run_id)).report)
    sources = {s["id"]: s for s in report["sources"]}
    links = [
        {
            "claim_id": c["id"],
            "status": c["status"],
            "source": sources.get(c["source_id"]),
            "excerpt": c.get("quote") or None,
            "relation": RELATION.get(c["status"], "context"),
        }
        for c in report["claims"]
        if c.get("source_id")
    ]
    return {"evidence": links, "signals": report["signals"], "sources": report["sources"]}
