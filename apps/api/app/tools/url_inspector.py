"""Contacts and links in a message, and what a linked page asks for. Pages are read through Tavily Extract,
never fetched by this server."""
from __future__ import annotations

import re
from typing import Any

from ..risk.rules import _rx, _sentence_around
from .domain_inspector import _company_tokens, registrable
from .tavily_search import domain_of

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")

URL_RE = re.compile(
    r"(?:https?://|www\.)[^\s<>()\"']+"
    r"|\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|net|org|io|co|ai|info|biz|xyz|online|site|top|us|uk|in|pk|app|dev|me|ly|gl|gd|at)(?:/[^\s<>()\"']*)?",
    re.I,
)

PHONE_RE = re.compile(r"\+\d{1,3}[\d\s().-]{7,15}\d|\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b")

def extract_contacts(text: str, sender: str = "") -> dict[str, list[str]]:
    combined = f"{sender}\n{text}"
    emails = list(dict.fromkeys(e.lower().rstrip(".") for e in EMAIL_RE.findall(combined)))
    without_emails = EMAIL_RE.sub(" ", combined)
    urls = list(dict.fromkeys(u.rstrip(".,;:!?") for u in URL_RE.findall(without_emails)))
    phones = list(dict.fromkeys(" ".join(p.split()) for p in PHONE_RE.findall(combined)))
    domains = list(dict.fromkeys(registrable(e.split("@", 1)[1]) for e in emails))
    domains += [d for d in dict.fromkeys(registrable(domain_of(u)) for u in urls) if d not in domains]
    return {"emails": emails[:6], "urls": urls[:8], "phones": phones[:4], "domains": domains[:8]}

# What a linked page asks a visitor for. Checked on pages outside the company's official domains only.
PAGE_ASKS = (
    ("payment", "a payment", _rx(
        r"\b(?:card\s+number|cvv|cvc|expiry\s+date|billing\s+address|pay\s+now|make\s+a\s+payment|payment\s+(?:details|method)"
        r"|(?:registration|processing|application|onboarding|training)\s+fee)\b"
    )),
    ("credentials", "a password or account login", _rx(
        r"\b(?:password|passcode|log\s*in\s+with|sign\s*in\s+with\s+(?:google|microsoft|outlook|your\s+email))\b"
    )),
    ("identity", "ID documents or bank details", _rx(
        r"\b(?:ssn|social\s+security|bank\s+account|routing\s+number|passport|driver'?s\s+licen[cs]e|national\s+id|cnic)\b"
    )),
)

def inspect_page(text: str, company: str | None) -> dict[str, Any]:
    """What a linked page claims to be and what it asks for, found by plain pattern matching."""
    asks = []
    for kind, label, pattern in PAGE_ASKS:
        match = pattern.search(text)
        if match:
            asks.append({"kind": kind, "label": label, "quote": _sentence_around(text, match.start(), match.end())})
    tokens = _company_tokens(company or "")
    lowered = text.lower()
    presents_as = company if tokens and all(t in lowered for t in tokens) else None
    return {"asks_for": asks, "presents_as": presents_as}
