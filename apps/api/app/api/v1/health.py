"""Public status: is live mode on, which models are in use, and what the demo allows."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter

from ...services import runtime

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict[str, Any]:
    rt = runtime.current
    return {
        "status": "ok",
        "live": rt.investigations.live,
        "tiers": [tier.public() for tier in rt.llm.tiers.values()],
        "examples": len(rt.store.examples),
        "limits": {"per_ip_per_hour": rt.settings.runs_per_ip_per_hour},
        "accounts": True,
        # Codes may land in the owner's inbox instead of the person's own (see EMAIL_TEST_INBOX).
        "email_test_mode": bool(rt.settings.email_test_inbox),
    }
