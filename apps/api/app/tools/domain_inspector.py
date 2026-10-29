"""Domains: registrable names, the company's official domain, and RDAP registration dates (no API key needed)."""
from __future__ import annotations

import asyncio
import re
from datetime import datetime, timezone
from typing import Any

import httpx
import tldextract

from .tavily_search import domain_of

_tld = tldextract.TLDExtract(suffix_list_urls=())  # bundled public-suffix snapshot; no network fetch

FREE_EMAIL = {
    "gmail.com", "googlemail.com", "yahoo.com", "ymail.com", "outlook.com", "hotmail.com", "live.com",
    "msn.com", "icloud.com", "me.com", "aol.com", "proton.me", "protonmail.com", "gmx.com", "gmx.net",
    "mail.com", "yandex.com", "yandex.ru", "qq.com", "163.com", "126.com", "zohomail.com", "tutanota.com",
}

PLATFORMS = {
    "linkedin.com", "upwork.com", "fiverr.com", "freelancer.com", "indeed.com", "glassdoor.com", "t.me",
    "telegram.org", "telegram.me", "wa.me", "whatsapp.com", "google.com", "forms.gle", "zoom.us",
    "microsoft.com", "calendly.com", "skype.com", "facebook.com", "instagram.com", "x.com", "twitter.com",
    "youtube.com", "github.com", "notion.site", "dropbox.com",
}

SHORTENERS = {"bit.ly", "tinyurl.com", "t.co", "cutt.ly", "rb.gy", "is.gd", "ow.ly", "shorturl.at", "tiny.cc", "rebrand.ly"}

AGGREGATORS = PLATFORMS | {
    "wikipedia.org", "crunchbase.com", "bloomberg.com", "reddit.com", "ziprecruiter.com", "zoominfo.com",
    "dnb.com", "bbb.org", "trustpilot.com", "medium.com", "simplyhired.com", "monster.com", "forbes.com",
    "reuters.com", "wikimedia.org", "builtin.com", "comparably.com", "rocketreach.co", "apollo.io",
}

_CORP_WORDS = {
    "inc", "llc", "ltd", "corp", "corporation", "company", "co", "group", "the", "and", "solutions",
    "services", "technologies", "technology", "global", "international", "limited", "holdings", "plc",
    # Generic business words: "Quillmere Design Studio" must not match every studio or design firm online.
    "design", "designs", "studio", "studios", "creative", "digital", "media", "agency", "consulting", "partners",
    "labs", "systems", "software", "logistics", "marketing", "network", "capital", "ventures", "enterprises",
    "industries", "careers", "jobs", "remote", "staffing", "recruitment", "talent",
}

_LOOKALIKE_WORDS = ("career", "job", "hr", "recruit", "hiring", "talent", "staffing", "apply", "onboard")

def registrable(domain: str) -> str:
    ext = _tld(domain)
    top = getattr(ext, "top_domain_under_public_suffix", None) or ext.registered_domain
    return (top or domain).lower()

def _company_tokens(company: str) -> list[str]:
    return [t for t in re.findall(r"[a-z0-9]+", company.lower()) if len(t) >= 4 and t not in _CORP_WORDS]

def guess_official_domain(company: str | None, results: list[dict[str, Any]]) -> str | None:
    """Pick the registrable domain that best matches the company name from ranked search results."""
    if not company:
        return None
    compact = "".join(t for t in re.findall(r"[a-z0-9]+", company.lower()) if t not in _CORP_WORDS)
    tokens = _company_tokens(company)
    best: tuple[int, int, str] | None = None
    for rank, result in enumerate(results):
        domain = registrable(domain_of(result["url"]))
        if domain in AGGREGATORS:
            continue
        label = domain.split(".")[0].replace("-", "")
        score = 0
        if compact and label == compact:
            score = 4
        elif compact and (label.startswith(compact) or compact.startswith(label)) and len(label) >= 3:
            score = 3
        elif any(t in label for t in tokens):
            score = 1
        if score and any(w in domain for w in _LOOKALIKE_WORDS):
            score -= 2
        if score > 0 and (best is None or (score, -rank) > (best[0], best[1])):
            best = (score, -rank, domain)
    return best[2] if best else None

async def _rdap(client: httpx.AsyncClient, domain: str) -> dict[str, Any]:
    info: dict[str, Any] = {"domain": domain, "registered": None, "age_days": None, "missing": False}
    try:
        response = await client.get(f"https://rdap.org/domain/{domain}", headers={"Accept": "application/rdap+json"})
        if response.status_code == 404 and response.url.host != "rdap.org":
            info["missing"] = True  # the authoritative registry answered: no such domain
            return info
        if response.status_code != 200:
            return info
        for event in response.json().get("events", []):
            if event.get("eventAction") == "registration" and event.get("eventDate"):
                registered = datetime.fromisoformat(event["eventDate"].replace("Z", "+00:00"))
                if registered.tzinfo is None:
                    registered = registered.replace(tzinfo=timezone.utc)
                info["registered"] = registered.isoformat()
                info["age_days"] = (datetime.now(timezone.utc) - registered).days
                break
    except (httpx.HTTPError, ValueError):
        pass
    return info

async def lookup_domain_ages(domains: list[str]) -> list[dict[str, Any]]:
    """Registration dates from RDAP, the ICANN-mandated successor to WHOIS (no API key required)."""
    if not domains:
        return []
    async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
        return list(await asyncio.gather(*(_rdap(client, d) for d in domains)))
