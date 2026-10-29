"""Follow-up questions about a finished report, answered by Nemotron Super from that report's evidence alone."""
from __future__ import annotations

import re
from typing import Any

from ..agent.state import Run
from ..llm import prompts
from ..llm.nebius_client import LLMRouter

_GROUP = re.compile(r"\[((?:[FCS]\d{1,3})(?:\s*[,;]\s*[FCS]\d{1,3})*)\]")


def keep_known_refs(text: str, known: set[str]) -> str:
    """Drop citations to ids the report doesn't have, so every chip in the answer leads somewhere."""

    def swap(match: re.Match[str]) -> str:
        ids = [i for i in re.split(r"\s*[,;]\s*", match.group(1)) if i in known]
        return f"[{', '.join(ids)}]" if ids else ""

    return re.sub(r"\s{2,}", " ", _GROUP.sub(swap, text)).strip()


async def answer_question(llm: LLMRouter, report: dict[str, Any], question: str) -> tuple[str, float]:
    """Returns the answer and what it cost. The call is metered on a scratch run so it never touches the report."""
    scratch = Run("ask", {})
    text = await llm.complete(scratch, tier="super", step="ask", messages=prompts.ask_messages(report, question), max_tokens=500, temperature=0.2)
    known = {s["id"] for s in report["signals"]} | {c["id"] for c in report["claims"]} | {s["id"] for s in report["sources"]}
    cost = sum(e["call"]["cost_usd"] for e in scratch.events if e["type"] == "llm_call")
    return keep_known_refs(text, known), cost
