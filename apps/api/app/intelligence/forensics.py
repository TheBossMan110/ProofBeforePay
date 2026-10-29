"""Step 3: domain forensics (RDAP) and the pages the message links to (Tavily Extract)."""
from __future__ import annotations

import asyncio
from typing import TYPE_CHECKING, Any

from ..agent.policies import POLARITIES
from ..agent.workflow import _log, stage
from ..tools import domain_inspector
from ..tools.domain_inspector import FREE_EMAIL, PLATFORMS, SHORTENERS, registrable
from ..tools.tavily_search import domain_of, normalize_url
from ..tools.url_inspector import inspect_page

if TYPE_CHECKING:
    from ..agent.state import Investigation


class Forensics:
    """Registry records, sender-vs-official domain matching, and what linked pages ask for."""

    async def _forensics(self, inv: Investigation) -> None:
        run = inv.run
        async with stage(run, "forensics"):
            domains = [d for d in inv.contacts["domains"] if d not in FREE_EMAIL | PLATFORMS | SHORTENERS]
            if inv.official and inv.official not in domains:
                domains.append(inv.official)
            if domains:
                _log(run, "forensics", f"Reading registration records for {', '.join(domains[:5])} via RDAP")
            ages, links = await asyncio.gather(domain_inspector.lookup_domain_ages(domains[:5]), self._read_links(inv))
            inv.signals.domain_ages(ages, inv.official)
            unregistered = {a["domain"] for a in ages if a.get("missing")}
            for link in links:
                link["unregistered"] = link["domain"] in unregistered
                run.emit("link", link=link)
            inv.links = links
            inv.signals.linked_pages(links, inv.official, inv.entities["company"] or None)
            inv.signals.official_match(inv.contacts, inv.official, inv.official_aliases, inv.entities["company"])
            careers_on_official = [p for p in inv.careers_pages if registrable(p["domain"]) in inv.official_aliases]
            inv.signals.careers_presence(inv.entities["role"], inv.official, careers_on_official)
            inv.signals.fingerprint(inv.entities["fingerprint"], inv.fingerprint_hits, inv.official_aliases)
            counts = {p: sum(1 for s in inv.signals.items if s["polarity"] == p) for p in POLARITIES}
            _log(
                run,
                "forensics",
                f"{len(inv.signals.items)} hard signals: {counts['red']} red, {counts['amber']} amber, {counts['green']} green",
            )

    async def _read_links(self, inv: Investigation) -> list[dict[str, Any]]:
        """Open the pages the message links to (through Tavily, never from this server) and note what they ask for."""
        targets: dict[str, str] = {}
        for url in inv.contacts["urls"]:
            domain = registrable(domain_of(url))
            if domain not in PLATFORMS:
                targets.setdefault(url if "://" in url else f"https://{url}", domain)
        targets = dict(list(targets.items())[:3])
        if not targets:
            return []
        _log(inv.run, "forensics", f"Opening {len(targets)} linked page(s) with Tavily Extract")
        pages, _ = await self.web.extract(inv.run, list(targets), step="forensics:links", purpose="link")
        by_url = {normalize_url(p["url"]): p for p in pages}
        links = []
        for url, domain in targets.items():
            page = by_url.get(normalize_url(url))
            link: dict[str, Any] = {
                "url": url,
                "domain": domain,
                "official": domain in inv.official_aliases,
                "reachable": page is not None,
                "unregistered": False,
                "title": None,
                "snippet": "",
                "source_id": None,
                "asks_for": [],
                "presents_as": None,
            }
            if page:
                source = inv.sources.add(page["url"], page.get("title") or "", page["raw_content"], purpose="link")
                link.update(title=source["title"], snippet=" ".join(source["content"].split())[:280], source_id=source["id"])
                if not link["official"]:
                    link.update(inspect_page(source["content"], inv.entities["company"] or None))
            links.append(link)
        return links

    # ── 4. Claim checks ──────────────────────────────────────────────────────
