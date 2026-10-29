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
async def users(viewer: User = Depends(require_admin)) -> list[dict[str, Any]]:
    return await runtime.current.admin.users_table(masked=viewer.sees_masked_data)


@router.get("/investigations")
async def investigations() -> list[dict[str, Any]]:
    return await runtime.current.runs.recent(300)


@router.get("/feedback")
async def feedback(viewer: User = Depends(require_admin)) -> list[dict[str, Any]]:
    return await runtime.current.admin.feedback_table(masked=viewer.sees_masked_data)


@router.get("/messages")
async def messages(viewer: User = Depends(require_admin)) -> list[dict[str, Any]]:
    return await runtime.current.admin.messages_table(masked=viewer.sees_masked_data)


@router.get("/whoami")
async def whoami(user: User = Depends(require_admin)) -> dict[str, Any]:
    return user.public()
