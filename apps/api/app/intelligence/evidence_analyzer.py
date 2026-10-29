"""Step 4: check every claim. Nano first; Super re-checks anything uncertain with fresh evidence."""
from __future__ import annotations

import asyncio
from typing import TYPE_CHECKING, Any

from ..agent.policies import EVIDENCE_FOR, STATUSES
from ..agent.workflow import _log, _squash, _text, stage
from ..llm import prompts
from ..llm.nebius_client import LLMError
from ..tools.tavily_search import SourceRegistry

if TYPE_CHECKING:
    from ..agent.state import Investigation, Run


class EvidenceAnalyzer:
    """Marks each claim verified, contradicted or inconclusive, with a verbatim quote."""

    async def _verify(self, inv: Investigation) -> None:
        run = inv.run
        async with stage(run, "verify"):
            if not inv.claims:
                _log(run, "verify", "The message makes no externally checkable claims")
                return
            _log(run, "verify", f"Checking {len(inv.claims)} claims: Nano first, Super re-checks anything uncertain")
            gate = asyncio.Semaphore(4)

            async def check(claim: dict[str, Any]) -> dict[str, Any]:
                async with gate:
                    return await self._check_claim(inv, claim)

            inv.claims = list(await asyncio.gather(*(check(c) for c in inv.claims)))
            counts = {s: sum(1 for c in inv.claims if c["status"] == s) for s in STATUSES}
            escalated = sum(1 for c in inv.claims if c["escalated"])
            _log(
                run,
                "verify",
                f"{counts['verified']} verified, {counts['contradicted']} contradicted, "
                f"{counts['inconclusive']} inconclusive ({escalated} escalated to Super)",
            )

    async def _check_claim(self, inv: Investigation, claim: dict[str, Any]) -> dict[str, Any]:
        run, step = inv.run, f"verify:{claim['id']}"
        run.emit("claim", claim={**claim, "status": "checking", "checked_by": "nano", "escalated": False})
        pool = inv.sources.with_purpose(*EVIDENCE_FOR[claim["type"]]) or inv.sources.items
        evidence = pool[:8]
        verdict = await self._judge_claim(run, "nano", step, claim, evidence) if evidence else None
        checked_by, escalated = "nano", False
        if verdict is None or verdict["status"] != "verified" or verdict["confidence"] < 0.75:
            checked_by, escalated = "super", True
            run.emit("claim", claim={**claim, "status": "checking", "checked_by": "super", "escalated": True})
            fresh = inv.sources.add_results(
                await self.web.search(run, claim["text"], step=step, purpose="verify", max_results=4), purpose="verify"
            )
            combined = list({s["id"]: s for s in fresh + evidence}.values())[:8]
            if combined:
                verdict = await self._judge_claim(run, "super", step, claim, combined) or verdict
        if verdict is None:
            verdict = {
                "status": "inconclusive",
                "confidence": 0.0,
                "source_id": None,
                "quote": "",
                "note": "No evidence about this claim could be found.",
            }
        source = inv.sources.get(verdict["source_id"])
        if source is None or (verdict["quote"] and _squash(verdict["quote"])[:60] not in _squash(source["content"])):
            verdict["quote"] = ""  # never show a quote we cannot find in the cited page
        result = {
            **claim,
            **verdict,
            "source_id": source["id"] if source else None,
            "source": SourceRegistry.public(source) if source else None,
            "checked_by": checked_by,
            "escalated": escalated,
        }
        run.emit("claim", claim=result)
        return result

    async def _judge_claim(
        self, run: Run, tier: str, step: str, claim: dict[str, Any], evidence: list[dict[str, Any]]
    ) -> dict[str, Any] | None:
        try:
            data = await self.llm.complete_json(
                run, tier=tier, step=step, messages=prompts.verify_messages(claim["text"], evidence), max_tokens=700
            )
        except (LLMError, ValueError) as exc:
            _log(run, "verify", f"{claim['id']}: {tier} check failed ({exc})", "warn")
            return None
        if not isinstance(data, dict):
            return None
        status = _text(data.get("status"), 20).lower()
        if status not in STATUSES:
            return None
        try:
            confidence = min(max(float(data.get("confidence", 0.5)), 0.0), 1.0)
        except (TypeError, ValueError):
            confidence = 0.5
        return {
            "status": status,
            "confidence": confidence,
            "source_id": _text(data.get("source_id"), 10) or None,
            "quote": _text(data.get("quote"), 400),
            "note": _text(data.get("note"), 300),
        }

    # ── 5. Judgement ─────────────────────────────────────────────────────────
