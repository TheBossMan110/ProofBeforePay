"""Rules that sit on top of the models. Code, not a model, has the last word on these.

Methodology version 2; the reasoning behind each rule is in docs/risk-methodology.md.
"""
from __future__ import annotations

import re
from typing import Any

METHODOLOGY_VERSION = 2

DECISIONS = ("PROCEED", "VERIFY_FIRST", "STOP")
DECISION_LABEL = {"PROCEED": "Proceed", "VERIFY_FIRST": "Verify first", "STOP": "Stop"}
CLAIM_TYPES = ("identity", "role", "compensation", "company", "process")
STATUSES = ("verified", "contradicted", "inconclusive")
POLARITIES = ("red", "green", "amber")
MONEY_RULES = ("upfront_payment", "check_equipment", "irreversible_payment")
# Signals that rule out a Proceed whatever the model concludes.
BLOCKS_PROCEED = MONEY_RULES + ("prompt_injection", "page_payment", "page_credentials", "page_identity")
EVIDENCE_FOR = {
    "identity": ("official", "recruiter", "warning", "careers", "reports"),
    "role": ("careers", "official", "warning"),
    "compensation": ("pay", "careers"),
    "company": ("official", "warning"),
    "process": ("warning", "official", "reports"),
}
_REF = re.compile(r"^[FCS]\d{1,3}$")
_INLINE_REF = re.compile(r"\[([FCS]\d{1,3})\]")

def guardrail(decision: str, signals: list[dict[str, Any]]) -> tuple[str, str | None]:
    """The model may never green-light an offer that asks for money, credentials or ID, or one that tries to
    instruct the checker. Returns the decision to use and, if it changed, why."""
    blocker = next((s for s in signals if s["rule"] in BLOCKS_PROCEED), None)
    if decision == "PROCEED" and blocker:
        return "VERIFY_FIRST", f"Downgraded from PROCEED because of [{blocker['id']}] {blocker['title'].lower()}."
    return decision, None

def challenge_outcome(should_be: str, doubt: str, decision: str) -> str:
    """The challenger names the decision it thinks is right and how much doubt is left; this turns that into an outcome."""
    if should_be in DECISIONS and should_be != decision:
        return "overturned"
    return "weakened" if doubt == "serious" else "holds"

def apply_challenge(judgement: dict[str, Any], challenge: dict[str, Any], signals: list[dict[str, Any]]) -> str | None:
    """What a challenge may change. The challenger can lower confidence, and when the two models disagree outright
    the answer becomes Verify first, except that a request for money keeps a Stop. Returns the change, if any."""
    outcome, before, confidence = challenge.get("outcome"), judgement["decision"], judgement["confidence"]
    if outcome not in ("weakened", "overturned"):
        return None
    money = next((s for s in signals if s["rule"] in MONEY_RULES), None)
    if outcome == "weakened" or before == "VERIFY_FIRST":
        judgement["confidence"] = max(40, confidence - 15)
        effect = f"Confidence lowered from {confidence} to {judgement['confidence']}: the challenger found a credible counterpoint."
    elif before == "STOP" and money:
        judgement["confidence"] = max(50, confidence - 20)
        effect = f"The challenger disputed this verdict, but it stays Stop because the message asks for money [{money['id']}]."
    else:
        judgement["decision"], judgement["confidence"] = "VERIFY_FIRST", min(confidence, 60)
        judgement["decision_before_challenge"] = before
        effect = (
            f"Changed from {DECISION_LABEL[before]} to Verify first. Ultra and Super disagree, "
            "and when they do, the safe answer is to verify."
        )
    judgement["challenge_effect"] = challenge["effect"] = effect
    return effect
