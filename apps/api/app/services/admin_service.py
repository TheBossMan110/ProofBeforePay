"""What the admin dashboard shows: whether each part of the system is up, and how it's being used.

The health checks only use calls that cost nothing (the Token Factory model list, a one-row database read).
"""
from __future__ import annotations

import time
from collections import Counter
from datetime import datetime, timezone
from typing import Any

from ..core.config import Settings
from ..core.security import SpendGuard
from ..db.base import Database, DatabaseError
from ..llm.nebius_client import LLMRouter
from ..repositories.feedback_repo import FeedbackRepo
from ..repositories.investigation_repo import InvestigationRepo, epoch
from ..repositories.run_store import RunStore
from ..repositories.user_repo import UserRepo
from .email_service import EmailService

_MODEL_CHECK_TTL = 60.0


def mask_email(email: str | None) -> str | None:
    """maya.chen@gmail.com becomes m•••@gmail.com, so the shared demo admin never sees real addresses."""
    if not email or "@" not in email:
        return email
    local, domain = email.split("@", 1)
    return f"{local[:1]}•••@{domain}"


def mask_name(name: str | None) -> str | None:
    return f"{name.strip()[:1]}•••" if name and name.strip() else name


class AdminService:
    def __init__(
        self,
        settings: Settings,
        llm: LLMRouter,
        db: Database,
        runs: InvestigationRepo,
        users: UserRepo,
        feedback: FeedbackRepo,
        email: EmailService,
        budget: SpendGuard,
        store: RunStore,
    ) -> None:
        self.settings, self.llm, self.db, self.runs, self.users = settings, llm, db, runs, users
        self.feedback, self.email, self.budget, self.store = feedback, email, budget, store
        self._model_check: tuple[float, dict[str, Any]] | None = None

    async def _token_factory(self) -> dict[str, Any]:
        if not self.settings.llm_configured:
            return {"status": "off", "detail": "NEBIUS_API_KEY isn't set"}
        if self._model_check and time.monotonic() - self._model_check[0] < _MODEL_CHECK_TTL:
            return self._model_check[1]
        started = time.monotonic()
        try:
            page = await self.llm.client.models.list()
            nemotron = [m.id for m in page.data if "nemotron" in m.id.lower()]
            result = {"status": "ok", "latency_ms": round((time.monotonic() - started) * 1000), "detail": f"{len(nemotron)} Nemotron models available"}
        except Exception as exc:  # any failure here is the answer we're looking for
            result = {"status": "down", "detail": str(exc)[:160]}
        self._model_check = (time.monotonic(), result)
        return result

    async def _database(self) -> dict[str, Any]:
        if self.db.kind == "memory":
            return {"status": "off", "detail": "Supabase isn't configured; using memory"}
        started = time.monotonic()
        ok = await self.db.ping()
        return {"status": "ok" if ok else "down", "latency_ms": round((time.monotonic() - started) * 1000),
                "detail": "Supabase Postgres" if ok else "Can't read the tables; has the migration run?"}

    def _recent_tool_health(self) -> dict[str, Any]:
        """Tavily's state from the latest finished live run, so checking it costs no credits."""
        if not self.settings.search_configured:
            return {"status": "off", "detail": "TAVILY_API_KEY isn't set"}
        runs = [r for r in self.store.recent() if r.finished and not r.example]
        if not runs:
            return {"status": "ok", "detail": "Configured; no live runs since the server started"}
        calls = [e["call"] for e in runs[0].events if e["type"] == "tavily_call"]
        failed = sum(1 for c in calls if not c["ok"])
        return {"status": "ok" if not failed else "degraded", "detail": f"Latest run: {len(calls) - failed}/{len(calls)} calls succeeded"}

    async def overview(self) -> dict[str, Any]:
        try:
            runs = await self.runs.recent(500)
            users = await self.users.all(1000)
            feedback = await self.feedback.recent_feedback(500)
            messages = await self.feedback.recent_messages(500)
        except DatabaseError:
            runs, users, feedback, messages = [], [], [], []
        day_ago = time.time() - 86400
        finished = [r for r in runs if r["status"] == "done"]
        costs = [float(r["cost_usd"] or 0) for r in finished]
        durations = [float(r["duration_s"]) for r in finished if r.get("duration_s")]
        savings = [float(r["savings_pct"]) for r in finished if r.get("savings_pct") is not None]
        ratings = [int(f["rating"]) for f in feedback if f.get("rating")]
        per_day = Counter(datetime.fromtimestamp(r["created_at"], timezone.utc).strftime("%Y-%m-%d") for r in runs if r.get("created_at"))
        return {
            "generated_at": time.time(),
            "health": {
                "api": {"status": "ok", "detail": "Serving requests"},
                "token_factory": await self._token_factory(),
                "tavily": self._recent_tool_health(),
                "database": await self._database(),
                "email": {"status": "ok" if self.email.configured else "off",
                          "detail": f"Resend, from {self.settings.email_from}" if self.email.configured else "RESEND_API_KEY isn't set"},
            },
            "models": [tier.public() for tier in self.llm.tiers.values()],
            "budget": {"spent_usd": round(self.budget.spent, 4), "cap_usd": self.budget.cap, "reserved_usd": round(self.budget.reserved, 2)},
            "stats": {
                "users": len(users),
                "verified_users": sum(1 for u in users if u.get("verified_at")),
                "investigations": len(runs),
                "investigations_24h": sum(1 for r in runs if (r.get("created_at") or 0) > day_ago),
                "errors": sum(1 for r in runs if r["status"] == "error"),
                "by_decision": dict(Counter(r["decision"] for r in finished if r.get("decision"))),
                "challenge_outcomes": dict(Counter(r["challenge_outcome"] for r in finished if r.get("challenge_outcome"))),
                "avg_cost_usd": round(sum(costs) / len(costs), 4) if costs else 0,
                "total_cost_usd": round(sum(costs), 4),
                "avg_duration_s": round(sum(durations) / len(durations), 1) if durations else 0,
                "avg_savings_pct": round(sum(savings) / len(savings), 1) if savings else 0,
                "feedback": len(feedback),
                "avg_rating": round(sum(ratings) / len(ratings), 2) if ratings else None,
                "messages": len(messages),
                "per_day": [{"day": d, "count": c} for d, c in sorted(per_day.items())[-14:]],
            },
            "recent": runs[:12],
        }

    async def users_table(self, masked: bool = False) -> list[dict[str, Any]]:
        users = await self.users.all(1000)
        runs = await self.runs.recent(1000)
        counts = Counter(r["user_id"] for r in runs if r.get("user_id"))
        demo = (self.settings.demo_judge_email, self.settings.demo_admin_email)

        def shown(u: dict[str, Any], value: str | None, mask: Any) -> str | None:
            return mask(value) if masked and u["email"] not in demo else value

        return [
            {
                "id": u["id"],
                "name": shown(u, u.get("name"), mask_name),
                "email": shown(u, u["email"], mask_email),
                "role": "admin" if u["email"] in self.settings.admin_emails or u["email"] == demo[1] else u.get("role", "user"),
                "verified": bool(u.get("verified_at")),
                "created_at": epoch(u["created_at"]) if u.get("created_at") else None,
                "last_login_at": epoch(u["last_login_at"]) if u.get("last_login_at") else None,
                "investigations": counts.get(u["id"], 0),
            }
            for u in users
        ]

    async def feedback_table(self, masked: bool = False) -> list[dict[str, Any]]:
        rows = await self._with_emails(await self.feedback.recent_feedback(500))
        if masked:
            rows = [{**r, "user_email": mask_email(r["user_email"]), "user_name": mask_name(r["user_name"])} for r in rows]
        return rows

    async def messages_table(self, masked: bool = False) -> list[dict[str, Any]]:
        rows = [{**m, "created_at": epoch(m["created_at"])} for m in await self.feedback.recent_messages(500)]
        if masked:
            rows = [{**m, "email": mask_email(m["email"]), "name": mask_name(m["name"])} for m in rows]
        return rows

    async def _with_emails(self, rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
        users = {u["id"]: u for u in await self.users.all(1000)}
        return [
            {**r, "created_at": epoch(r["created_at"]), "user_email": users.get(r.get("user_id") or "", {}).get("email"),
             "user_name": users.get(r.get("user_id") or "", {}).get("name")}
            for r in rows
        ]
