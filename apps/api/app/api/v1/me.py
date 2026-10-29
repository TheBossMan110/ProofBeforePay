"""The signed-in user's own data: their investigations, their profile, and deleting their account."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Response

from ...db.base import DatabaseError
from ...models.user import User
from ...schemas.auth import ProfileUpdate
from ...services import runtime
from ...services.auth_service import AuthError
from ..deps import clear_session, require_user

router = APIRouter(prefix="/me", tags=["me"])


@router.get("/investigations")
async def my_investigations(user: User = Depends(require_user)) -> list[dict[str, Any]]:
    rt = runtime.current
    try:
        saved = await rt.runs.for_user(user.id)
    except DatabaseError:
        saved = []
    # Runs still in progress (or not yet saved) live only in memory; merge them in, newest first.
    known = {r["id"] for r in saved}
    live = [r.summary() for r in rt.store.recent() if r.user_id == user.id and r.id not in known]
    return sorted(live + saved, key=lambda r: r.get("created_at") or 0, reverse=True)


@router.patch("")
async def update_profile(body: ProfileUpdate, user: User = Depends(require_user)) -> dict[str, Any]:
    try:
        updated = await runtime.current.auth.rename(user, " ".join(body.name.split()))
    except AuthError as exc:
        raise HTTPException(exc.status, {"message": exc.message, "code": exc.code}) from exc
    return {"user": updated.public()}


@router.delete("")
async def delete_account(response: Response, user: User = Depends(require_user)) -> dict[str, str]:
    try:
        await runtime.current.auth.delete_account(user)
    except AuthError as exc:
        raise HTTPException(exc.status, {"message": exc.message, "code": exc.code}) from exc
    clear_session(response)
    return {"status": "deleted"}
