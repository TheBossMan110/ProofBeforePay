"""Plans the web research: which searches to run for this message, and why."""
from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING, Any

from ..tools.domain_inspector import FREE_EMAIL, PLATFORMS, SHORTENERS

if TYPE_CHECKING:
    from .state import Investigation

def plan_research(inv: Investigation) -> list[tuple[str, str, dict[str, Any]]]:
    e, contacts = inv.entities, inv.contacts
    company, role, name = e["company"], e["role"], e["recruiter_name"]
    plan: list[tuple[str, str, dict[str, Any]]] = []
    if company:
        plan.append(("official", f"{company} official website", {"depth": "basic", "max_results": 6}))
        plan.append(("warning", f"{company} recruitment fraud warning fake job offers", {}))
        if role:
            plan.append(("careers", f"{company} careers {role}", {}))
        if name:
            plan.append(("recruiter", f"{name} {e['recruiter_title']} {company}".replace("  ", " "), {"depth": "basic"}))
    for email in contacts["emails"][:2]:
        plan.append(("reports", f'"{email}" scam', {"depth": "basic"}))
    foreign = [d for d in contacts["domains"] if d not in FREE_EMAIL | PLATFORMS | SHORTENERS]
    for domain in foreign[:2]:
        plan.append(("reports", f"{domain} scam reviews", {"depth": "basic"}))
    for phone in contacts["phones"][:1]:
        plan.append(("reports", f"{phone} scam", {"depth": "basic"}))
    if role and e["compensation"]:
        plan.append(("pay", f"{role} typical pay rate {date.today().year}", {"depth": "basic"}))
    if e["fingerprint"]:
        plan.append(("fingerprint", e["fingerprint"], {"depth": "basic", "exact_match": True}))
    if not company:
        plan.append(("reports", f"{role or 'remote job'} offer {e['channel']} scam".strip(), {}))
    return plan
