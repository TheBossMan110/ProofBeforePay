"""Step 2: investigate the web with Tavily (search, exact match, crawl, extract)."""
from __future__ import annotations

import asyncio
from typing import TYPE_CHECKING, Any

from ..agent.planner import plan_research
from ..agent.workflow import _log, stage
from ..tools.domain_inspector import guess_official_domain, registrable

if TYPE_CHECKING:
    from ..agent.state import Investigation


class WebResearcher:
    """Finds the official site, its own fraud warnings, careers pages and reports about the sender."""

    async def _research(self, inv: Investigation) -> None:
        run, company = inv.run, inv.entities["company"]
        async with stage(run, "research"):
            plan = plan_research(inv)
            inv.searched = [query for _, query, _ in plan]
            _log(run, "research", f"Running {len(plan)} Tavily searches in parallel")
            batches = await asyncio.gather(
                *(self.web.search(run, query, step="research", purpose=purpose, **opts) for purpose, query, opts in plan)
            )
            ranked_for_official: list[dict[str, Any]] = []
            careers_results: list[dict[str, Any]] = []
            for (purpose, _, _), results in zip(plan, batches):
                added = inv.sources.add_results(results, purpose=purpose)
                if purpose == "fingerprint":
                    inv.fingerprint_hits = added
                if purpose in ("official", "warning", "careers"):
                    ranked_for_official.extend(results)
                if purpose == "careers":
                    careers_results.extend(results)
                    inv.careers_pages.extend(added)

            inv.official = guess_official_domain(company, ranked_for_official)
            if inv.official:
                # Large employers often host jobs on a separate domain (e.g. amazon.jobs); crawl that when present.
                careers_domain = guess_official_domain(company, careers_results) or inv.official
                inv.official_aliases = {inv.official, careers_domain}
                _log(run, "research", f"Identified {inv.official} as {company}'s official site")
                run.emit("official", domain=inv.official)
                role = inv.entities["role"]
                instructions = (
                    f"Find the careers or jobs pages and any open position matching '{role}'"
                    if role
                    else "Find the careers or jobs pages and the current open positions"
                )
                _log(run, "research", f"Crawling {careers_domain} with Tavily Crawl to look for the role")
                # A fraud warning on the company's own site is the most authoritative source there is, and search
                # snippets of it are too short to judge from, so read those pages in full alongside the crawl.
                own_warnings = [
                    s["url"] for s in inv.sources.with_purpose("warning") if registrable(s["domain"]) in inv.official_aliases
                ][:2]
                if own_warnings:
                    _log(run, "research", f"Reading {company}'s own fraud warning in full")
                pages, (warning_pages, _) = await asyncio.gather(
                    self.web.crawl(run, f"https://{careers_domain}", instructions, step="research:careers", purpose="careers"),
                    self.web.extract(run, own_warnings, step="research:warning", purpose="warning"),
                )
                inv.sources.add_results(warning_pages, purpose="warning")
                crawled = inv.sources.add_results(pages[:12], purpose="careers")
                inv.careers_pages = list({s["id"]: s for s in inv.careers_pages + crawled}.values())
            elif company:
                _log(run, "research", f"Could not identify an official website for {company}", "warn")
            _log(run, "research", f"Collected {len(inv.sources.items)} unique sources")

    # ── 3. Domain forensics ──────────────────────────────────────────────────
