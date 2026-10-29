"""Accounts, one-time email codes and sign-in sessions."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from ..db.base import Database

USER_COLUMNS = "id,name,email,password_hash,verified_at,role,created_at,last_login_at"


def now() -> datetime:
    return datetime.now(timezone.utc)


def parse(value: str | None) -> datetime | None:
    return datetime.fromisoformat(value.replace("Z", "+00:00")) if value else None


class UserRepo:
    def __init__(self, db: Database) -> None:
        self.users = db.table("users")
        self.codes = db.table("email_codes")
        self.sessions = db.table("sessions")

    # ── users ──
    async def by_email(self, email: str) -> dict[str, Any] | None:
        rows = await self.users.select(where={"email": email.lower()}, columns=USER_COLUMNS, limit=1)
        return rows[0] if rows else None

    async def by_id(self, user_id: str) -> dict[str, Any] | None:
        rows = await self.users.select(where={"id": user_id}, columns=USER_COLUMNS, limit=1)
        return rows[0] if rows else None

    async def create(self, name: str, email: str, password_hash: str) -> dict[str, Any]:
        user = {
            "id": str(uuid.uuid4()),
            "name": name,
            "email": email.lower(),
            "password_hash": password_hash,
            "verified_at": None,
            "role": "user",
            "created_at": now().isoformat(),
            "last_login_at": None,
        }
        await self.users.insert([user])
        return user

    async def update(self, user_id: str, **values: Any) -> None:
        await self.users.update({"id": user_id}, values)

    async def all(self, limit: int = 500) -> list[dict[str, Any]]:
        return await self.users.select(columns="id,name,email,verified_at,role,created_at,last_login_at", order="created_at", limit=limit)

    async def delete(self, user_id: str) -> None:
        # Supabase cascades codes and sessions; the in-memory tables need it done by hand.
        await self.codes.delete({"user_id": user_id})
        await self.sessions.delete({"user_id": user_id})
        await self.users.delete({"id": user_id})

    # ── one-time codes ──
    async def add_code(self, user_id: str, purpose: str, digest: str, ttl: timedelta) -> None:
        created = now()
        await self.codes.insert([{
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "purpose": purpose,
            "code_hash": digest,
            "attempts": 0,
            "created_at": created.isoformat(),
            "expires_at": (created + ttl).isoformat(),
            "consumed_at": None,
        }])

    async def latest_code(self, user_id: str, purpose: str) -> dict[str, Any] | None:
        rows = await self.codes.select(where={"user_id": user_id, "purpose": purpose}, order="created_at", limit=1)
        return rows[0] if rows else None

    async def update_code(self, code_id: str, **values: Any) -> None:
        await self.codes.update({"id": code_id}, values)

    # ── sessions ──
    async def add_session(self, digest: str, user_id: str, ttl: timedelta, ip: str, user_agent: str) -> None:
        created = now()
        await self.sessions.insert([{
            "id": digest,
            "user_id": user_id,
            "created_at": created.isoformat(),
            "expires_at": (created + ttl).isoformat(),
            "ip": ip[:64],
            "user_agent": user_agent[:300],
        }])

    async def session(self, digest: str) -> dict[str, Any] | None:
        rows = await self.sessions.select(where={"id": digest}, limit=1)
        return rows[0] if rows else None

    async def end_session(self, digest: str) -> None:
        await self.sessions.delete({"id": digest})

    async def end_all_sessions(self, user_id: str) -> None:
        await self.sessions.delete({"user_id": user_id})
