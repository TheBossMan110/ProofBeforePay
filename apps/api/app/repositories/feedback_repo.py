"""Feedback on reports and messages from the contact form."""
from __future__ import annotations

import uuid
from typing import Any

from ..db.base import Database
from .user_repo import now


class FeedbackRepo:
    def __init__(self, db: Database) -> None:
        self.feedback = db.table("feedback")
        self.messages = db.table("contact_messages")

    async def add_feedback(self, *, user_id: str | None, investigation_id: str | None, rating: int, comment: str) -> None:
        await self.feedback.insert([{
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "investigation_id": investigation_id,
            "rating": rating,
            "comment": comment or None,
            "created_at": now().isoformat(),
        }])

    async def recent_feedback(self, limit: int = 300) -> list[dict[str, Any]]:
        return await self.feedback.select(order="created_at", limit=limit)

    async def add_message(self, *, user_id: str | None, name: str, email: str, topic: str, message: str) -> None:
        await self.messages.insert([{
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "name": name,
            "email": email.lower(),
            "topic": topic,
            "message": message,
            "created_at": now().isoformat(),
        }])

    async def recent_messages(self, limit: int = 300) -> list[dict[str, Any]]:
        return await self.messages.select(order="created_at", limit=limit)

    async def delete_for_user(self, user_id: str) -> None:
        await self.feedback.delete({"user_id": user_id})
        await self.messages.delete({"user_id": user_id})
