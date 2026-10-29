"""Builds the service graph once. Routes read `runtime.current` at request time, so tests can swap in a runtime
with an in-memory database, a fake pipeline or a fake email sender."""
from __future__ import annotations

from dataclasses import dataclass, field

from ..agent.orchestrator import Pipeline
from ..core.config import Settings, settings
from ..core.security import RateLimiter, SlidingWindow, SpendGuard
from ..db.base import Database
from ..db.session import connect
from ..llm.nebius_client import LLMRouter
from ..repositories.feedback_repo import FeedbackRepo
from ..repositories.investigation_repo import InvestigationRepo
from ..repositories.run_store import RunStore
from ..repositories.user_repo import UserRepo
from ..tools.tavily_search import WebResearch
from .admin_service import AdminService
from .assistant_service import AssistantService
from .auth_service import AuthService
from .email_service import EmailService
from .investigation_service import InvestigationService


def _limits() -> dict[str, SlidingWindow]:
    """Per-IP limits on endpoints that send email or accept passwords and codes."""
    return {
        "signup": SlidingWindow(6, 3600),
        "login": SlidingWindow(12, 900),
        "code": SlidingWindow(12, 900),
        "email": SlidingWindow(8, 900),
        "contact": SlidingWindow(5, 3600),
        "feedback": SlidingWindow(30, 3600),
        "ask": SlidingWindow(30, 3600),
        "transcribe": SlidingWindow(10, 3600),
    }


@dataclass
class Runtime:
    settings: Settings
    llm: LLMRouter
    db: Database
    store: RunStore
    runs: InvestigationRepo
    users: UserRepo
    feedback: FeedbackRepo
    email: EmailService
    budget: SpendGuard
    investigations: InvestigationService
    auth: AuthService
    admin: AdminService
    assistant: AssistantService
    limits: dict[str, SlidingWindow] = field(default_factory=_limits)


def build(
    config: Settings = settings,
    *,
    db: Database | None = None,
    pipeline: Pipeline | None = None,
    email: EmailService | None = None,
    store: RunStore | None = None,
    budget: SpendGuard | None = None,
) -> Runtime:
    llm = LLMRouter(config)
    db = db or connect(config)
    store = store or RunStore(config.data_dir, config.examples_dir)
    runs, users, feedback = InvestigationRepo(db), UserRepo(db), FeedbackRepo(db)
    email = email or EmailService(config)
    budget = budget or SpendGuard(config.data_dir / "spend.json", config.max_spend_usd, config.run_reserve_usd)
    pipeline = pipeline or Pipeline(llm, WebResearch(config.tavily_api_key), config.max_claims)
    investigations = InvestigationService(
        config, pipeline, store, runs, budget, RateLimiter(config.runs_per_ip_per_hour, config.max_runs_per_day)
    )
    return Runtime(
        settings=config,
        llm=llm,
        db=db,
        store=store,
        runs=runs,
        users=users,
        feedback=feedback,
        email=email,
        budget=budget,
        investigations=investigations,
        auth=AuthService(users, runs, feedback, email, config),
        admin=AdminService(config, llm, db, runs, users, feedback, email, budget, store),
        assistant=AssistantService(config, llm, budget, runs, store),
    )


current: Runtime = build()
