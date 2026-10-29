"""Admin only: system health, usage, users, feedback and messages."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from ...models.user import User
from ...services import runtime
from ..deps import require_admin

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])


@router.get("/overview")
async def overview() -> dict[str, Any]:
    return await runtime.current.admin.overview()


@router.get("/users")
async def users() -> list[dict[str, Any]]:
    return await runtime.current.admin.users_table()


@router.get("/investigations")
async def investigations() -> list[dict[str, Any]]:
    return await runtime.current.runs.recent(300)


@router.get("/feedback")
async def feedback() -> list[dict[str, Any]]:
    return await runtime.current.admin.feedback_table()


@router.get("/messages")
async def messages() -> list[dict[str, Any]]:
    return await runtime.current.admin.messages_table()


@router.get("/whoami")
async def whoami(user: User = Depends(require_admin)) -> dict[str, Any]:
    return user.public()
