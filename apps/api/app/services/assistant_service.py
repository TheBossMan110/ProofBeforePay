"""The helpers around an investigation: answering questions about a report, reading a screenshot, and public stats.

Every model call here goes through the same spending ceiling as the investigations.
"""
from __future__ import annotations

import base64
import binascii
import logging
import time
from typing import Any

from openai import APIError

from ..core.config import Settings
from ..core.security import SpendGuard
from ..intelligence.report_qa import answer_question
from ..llm import prompts
from ..llm.nebius_client import LLMError, LLMRouter
from ..repositories.investigation_repo import InvestigationRepo
from ..repositories.run_store import RunStore
from .investigation_service import ServiceError

logger = logging.getLogger("proofbeforepay.assistant")

MAX_IMAGE_BYTES = 5 * 1024 * 1024
_IMAGE_TYPES = ("image/png", "image/jpeg", "image/webp")
_STATS_TTL = 60.0


class AssistantService:
    def __init__(self, settings: Settings, llm: LLMRouter, budget: SpendGuard, runs: InvestigationRepo, store: RunStore) -> None:
        self.settings, self.llm, self.budget, self.runs, self.store = settings, llm, budget, runs, store
        self._stats: tuple[float, dict[str, Any]] | None = None

    def _reserve(self) -> None:
        if not self.settings.llm_configured:
            raise ServiceError(503, "The models aren't configured on this server.")
        if not self.budget.claim():
            raise ServiceError(503, "The live demo has used up its model budget for now.")

    async def _spend(self, label: str, cost: float) -> None:
        self.budget.settle(cost)
        await self.runs.record_spend(label, cost)

    async def ask(self, run_id: str, report: dict[str, Any], question: str) -> str:
        self._reserve()
        cost = 0.0
        try:
            answer, cost = await answer_question(self.llm, report, question)
        except LLMError as exc:
            logger.warning("Ask failed for %s: %s", run_id, exc)
            raise ServiceError(502, "Couldn't answer that just now. Please try again.") from exc
        finally:
            await self._spend(f"ask:{run_id}", cost)
        return answer

    async def transcribe(self, data_url: str) -> dict[str, str]:
        """Reads the message out of a screenshot with a small vision model. Nemotron does all the reasoning later."""
        header, _, payload = data_url.partition(",")
        mime = header.removeprefix("data:").split(";")[0]
        if mime not in _IMAGE_TYPES or ";base64" not in header:
            raise ServiceError(415, "Upload a PNG, JPEG or WebP screenshot.")
        try:
            size = len(base64.b64decode(payload, validate=True))
        except (binascii.Error, ValueError) as exc:
            raise ServiceError(400, "That image couldn't be read.") from exc
        if size > MAX_IMAGE_BYTES:
            raise ServiceError(413, "That screenshot is too large. Keep it under 5 MB.")

        self._reserve()
        cost = 0.0
        try:
            for model in self.settings.vision_models:
                try:
                    response = await self.llm.client.chat.completions.create(
                        model=model,
                        temperature=0,
                        max_tokens=1500,
                        messages=[{"role": "user", "content": [
                            {"type": "text", "text": prompts.TRANSCRIBE_PROMPT},
                            {"type": "image_url", "image_url": {"url": data_url}},
                        ]}],
                    )
                except APIError as exc:
                    logger.warning("Vision model %s failed: %s", model, exc)
                    continue
                usage = response.usage
                if usage:
                    cost = (usage.prompt_tokens * self.settings.price_vision_in + usage.completion_tokens * self.settings.price_vision_out) / 1_000_000
                text = (response.choices[0].message.content or "").strip()
                if not text or text == "NO_TEXT":
                    raise ServiceError(422, "We couldn't find any message text in that image.")
                return {"text": text[:8000], "model": model}
            raise ServiceError(502, "Couldn't read the screenshot just now. Paste the text instead.")
        finally:
            await self._spend("transcribe", cost)

    async def stats(self) -> dict[str, Any]:
        """Public, anonymous numbers for the home page. Cached for a minute."""
        if self._stats and time.monotonic() - self._stats[0] < _STATS_TTL:
            return self._stats[1]
        try:
            rows = await self.runs.recent(2000)
        except Exception:  # the home page should never fail because of the database
            rows = [r.summary() for r in self.store.recent()]
        done = [r for r in rows if r["status"] == "done"]
        avg = lambda key: round(sum(float(r[key]) for r in done if r.get(key)) / max(1, sum(1 for r in done if r.get(key))), 4)  # noqa: E731
        by_decision: dict[str, int] = {}
        for r in done:
            if r.get("decision"):
                by_decision[r["decision"]] = by_decision.get(r["decision"], 0) + 1
        result = {
            "checks": len(done),
            "avg_seconds": avg("duration_s"),
            "avg_cost_usd": avg("cost_usd"),
            "avg_savings_pct": avg("savings_pct"),
            "by_decision": by_decision,
        }
        self._stats = (time.monotonic(), result)
        return result
