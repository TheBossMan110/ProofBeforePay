"""Hard trust signals: facts established by code, not by a language model.

Payment and pressure patterns, RDAP registration dates, sender-vs-official domain matching, careers-page presence,
reused wording and linked pages. Every signal carries the exact evidence it was derived from.
"""
from __future__ import annotations

import re
from typing import TYPE_CHECKING, Any

from ..tools.domain_inspector import FREE_EMAIL, PLATFORMS, SHORTENERS, _company_tokens, registrable
from ..tools.tavily_search import domain_of
from .rules import RULES, _sentence_around

if TYPE_CHECKING:
    from ..agent.state import Run

def _age_text(days: int) -> str:
    if days < 60:
        return f"{days} days ago"
    if days < 730:
        return f"{days // 30} months ago"
    return f"{days // 365} years ago"

class SignalBoard:
    """Collects signals for a run, numbering them F1, F2, … and streaming each one to the UI."""

    def __init__(self, run: Run) -> None:
        self.run = run
        self.items: list[dict[str, Any]] = []

    def add(
        self, kind: str, polarity: str, severity: str, title: str, detail: str, *, evidence: str = "", why: str = "", rule: str = ""
    ) -> dict[str, Any]:
        signal = {
            "id": f"F{len(self.items) + 1}",
            "kind": kind,
            "rule": rule,
            "polarity": polarity,
            "severity": severity,
            "title": title,
            "detail": detail,
            "evidence": evidence,
            "why": why,
        }
        self.items.append(signal)
        self.run.emit("signal", signal=signal)
        return signal

    def scan_patterns(self, text: str) -> None:
        for rule in RULES:
            match = rule.pattern.search(text)
            if match:
                quote = _sentence_around(text, match.start(), match.end())
                self.add(
                    "pattern", "red", rule.severity, rule.title, f'The message says: "{quote}"', evidence=quote, why=rule.why, rule=rule.id
                )

    def scan_contacts(self, contacts: dict[str, list[str]], company: str | None) -> None:
        for email in contacts["emails"]:
            domain = email.split("@", 1)[1]
            if domain in FREE_EMAIL and company:
                self.add(
                    "email",
                    "red",
                    "medium",
                    "Free email address for a company role",
                    f"{email} is a personal {domain} address, yet the sender claims to represent {company}.",
                    evidence=email,
                    why="Recruiters at real companies almost always write from the company domain.",
                )
        for url in contacts["urls"]:
            host = registrable(domain_of(url))
            if host in SHORTENERS:
                self.add(
                    "link",
                    "amber",
                    "low",
                    "Link hides its destination",
                    f"{url} uses the {host} shortener, so you can't see where it leads before clicking.",
                    evidence=url,
                    why="Shortened links are often used to disguise phishing pages.",
                )

    def official_match(
        self, contacts: dict[str, list[str]], official: str | None, aliases: set[str], company: str | None
    ) -> None:
        if not official:
            return
        corporate = [e for e in contacts["emails"] if e.split("@", 1)[1] not in FREE_EMAIL]
        for email in corporate:
            domain = registrable(email.split("@", 1)[1])
            if domain in aliases:
                self.add(
                    "email",
                    "green",
                    "medium",
                    "Email domain matches the official site",
                    f"{email} uses {domain}, which web research identified as {company}'s official domain.",
                    evidence=email,
                )
            else:
                self.add(
                    "email",
                    "red",
                    "high",
                    "Email domain differs from the official site",
                    f"{email} uses {domain}, but {company}'s official site is {official}.",
                    evidence=email,
                    why="Lookalike domains are the most common way to impersonate a real employer.",
                )
        for url in contacts["urls"]:
            host = registrable(domain_of(url))
            if host in PLATFORMS or host in SHORTENERS or host in aliases:
                continue
            if any(t in host for t in _company_tokens(company or "")):
                self.add(
                    "link",
                    "red",
                    "high",
                    "Link uses a lookalike of the company name",
                    f"{host} is not {company}'s official site ({official}), even though it borrows the name.",
                    evidence=url,
                    why="Lookalike domains are the most common way to impersonate a real employer.",
                )

    def domain_ages(self, ages: list[dict[str, Any]], official: str | None) -> None:
        for info in ages:
            domain, days = info["domain"], info.get("age_days")
            if info.get("missing"):
                self.add(
                    "domain",
                    "red" if domain != official else "amber",
                    "medium",
                    "No registration record found",
                    f"The registry has no record of {domain}. The site may not exist, or may have been taken down.",
                    why="Links to unregistered or deleted domains often belong to short-lived impersonation sites.",
                )
                continue
            if days is None:
                self.add("domain", "amber", "low", f"Registration date unavailable for {domain}", "The registry did not publish a registration date.")
                continue
            registered = f"{domain} was registered {info['registered'][:10]} ({_age_text(days)})."
            if domain == official:
                polarity, severity, title = ("green", "low", "Official domain is long-established") if days >= 3 * 365 else ("amber", "medium", "Official domain is relatively new")
            elif days < 90:
                polarity, severity, title = "red", "high", "Very recently registered domain"
            elif days < 365:
                polarity, severity, title = "red", "medium", "Domain is less than a year old"
            else:
                polarity, severity, title = "green", "low", "Domain has history"
            self.add(
                "domain",
                polarity,
                severity,
                title,
                registered,
                evidence=info["registered"],
                why="Scam operations typically register fresh domains that are abandoned within months." if polarity == "red" else "",
            )

    def careers_presence(self, role: str | None, official: str | None, pages: list[dict[str, Any]]) -> None:
        if not official or not role or not pages:
            return
        tokens = [t for t in re.findall(r"[a-z0-9]+", role.lower()) if len(t) >= 4]
        for page in pages:
            haystack = page["content"].lower()
            if tokens and all(t in haystack for t in tokens):
                self.add(
                    "careers",
                    "green",
                    "medium",
                    "Role appears on the official site",
                    f"'{role}' is mentioned on {page['url']} [{page['id']}].",
                    evidence=page["url"],
                )
                return
        self.add(
            "careers",
            "amber",
            "medium",
            "Role not found on the official site",
            f"Crawled {len(pages)} pages on {official} and found no listing matching '{role}'.",
            why="Large employers publish open roles on their own careers site; absence is a reason to ask, not proof of fraud.",
        )

    def fingerprint(self, phrase: str | None, matches: list[dict[str, Any]], official_aliases: set[str]) -> None:
        if not phrase:
            return
        on_official = [m for m in matches if registrable(m["domain"]) in official_aliases]
        if on_official:
            self.add(
                "fingerprint",
                "green",
                "medium",
                "Wording matches the official site",
                f'"{phrase}" appears verbatim on {on_official[0]["url"]} [{on_official[0]["id"]}].',
                evidence=phrase,
            )
        elif matches:
            domains = ", ".join(sorted({m["domain"] for m in matches})[:5])
            self.add(
                "fingerprint",
                "amber",
                "medium",
                "Exact wording appears elsewhere online",
                f'"{phrase}" was found verbatim on {len(matches)} page(s): {domains}.',
                evidence=phrase,
                why="Scam scripts are reused word for word; check whether those pages are warnings or genuine listings.",
            )


    def linked_pages(self, links: list[dict[str, Any]], official: str | None, company: str | None) -> None:
        """Signals from pages the message links to, as read by Tavily Extract (see Pipeline._inspect_links)."""
        for link in links:
            url, domain = link["url"], link["domain"]
            ref = f" [{link['source_id']}]" if link.get("source_id") else ""
            if link["official"]:
                if link["reachable"]:
                    self.add("link", "green", "low", "Link goes to the official site", f"{url} is on {company}'s official domain{ref}.", evidence=url)
                continue
            if not link["reachable"]:
                if not link.get("unregistered"):
                    self.add(
                        "link",
                        "amber",
                        "low",
                        "Linked page couldn't be opened",
                        f"{url} didn't load. The page may have been taken down, or it may block automated visitors.",
                        evidence=url,
                        why="Short-lived scam pages are often removed within days. This is a reason for care, not proof.",
                    )
                continue
            if link.get("presents_as") and official:
                self.add(
                    "link",
                    "red",
                    "high",
                    f"Linked page presents itself as {link['presents_as']}",
                    f"{url} uses {link['presents_as']}'s name, but it's hosted on {domain}, not {official}{ref}.",
                    evidence=url,
                    why="A page that borrows a company's name on a different domain is how impersonation sites work.",
                )
            for ask in link["asks_for"]:
                self.add(
                    "link",
                    "red",
                    "high",
                    f"Linked page asks for {ask['label']}",
                    f'{url} says: "{ask["quote"]}"{ref}',
                    evidence=ask["quote"],
                    why="Only give payment, logins or ID to a site you reached yourself from the company's official domain.",
                    rule=f"page_{ask['kind']}",
                )
