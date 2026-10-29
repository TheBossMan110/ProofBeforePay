"""The ProofBeforePay investigation: intake → research → forensics → claim checks → judgement → challenge → brief.

Model routing: Nano reads the offer, runs first-pass claim checks and writes the brief; Super re-checks any claim Nano
is unsure about with fresh evidence; Ultra makes the single final judgement over everything; then Super argues
against that judgement with its own counter-searches, and code (agent/policies.py) decides what the challenge changes.
Each step lives in app/intelligence; this class runs them in order.
"""
from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from ..intelligence.challenge_pass import ChallengePass
from ..intelligence.claim_extractor import ClaimExtractor
from ..intelligence.evidence_analyzer import EvidenceAnalyzer
from ..intelligence.forensics import Forensics
from ..intelligence.judge import Judge
from ..intelligence.report_generator import ReportGenerator
from ..intelligence.web_research import WebResearcher
from ..llm.nebius_client import LLMError
from .state import Investigation
from .workflow import PipelineError

if TYPE_CHECKING:
    from ..llm.nebius_client import LLMRouter
    from ..tools.tavily_search import WebResearch
    from .state import Run

logger = logging.getLogger("proofbeforepay.pipeline")

class Pipeline(ClaimExtractor, WebResearcher, Forensics, EvidenceAnalyzer, Judge, ChallengePass, ReportGenerator):
    """Runs the seven steps for one run and turns failures into a message the user can act on."""

    def __init__(self, llm: LLMRouter, web: WebResearch, max_claims: int) -> None:
        self.llm = llm
        self.web = web
        self.max_claims = max_claims

    async def execute(self, run: Run) -> None:
        run.set_status("running")
        inv = Investigation(run)
        try:
            await self._intake(inv)
            await self._research(inv)
            await self._forensics(inv)
            await self._verify(inv)
            await self._judge(inv)
            await self._challenge(inv)
            await self._brief(inv)
            report = self._assemble(inv)
        except (LLMError, PipelineError) as exc:
            self._fail(run, str(exc))
            return
        except Exception:
            logger.exception("Run %s crashed", run.id)
            self._fail(run, "Something went wrong on our side. Please run the check again.")
            return
        run.report = report
        run.emit("report", report=report)
        run.set_status("done")

    @staticmethod
    def _fail(run: Run, message: str) -> None:
        run.error = message
        run.emit("error", message=message)
        run.set_status("error", message)

    # ── 1. Intake ────────────────────────────────────────────────────────────
