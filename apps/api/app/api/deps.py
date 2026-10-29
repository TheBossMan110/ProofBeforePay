"""Request helpers shared by the routes: the visitor's IP, the signed-in user, and per-IP limits."""
from __future__ import annotations

from fastapi import HTTPException, Request, Response

from ..models.user import User
from ..services import runtime

SESSION_COOKIE = "pbp_session"


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def limit(request: Request, bucket: str) -> None:
    if not runtime.current.limits[bucket].allow(client_ip(request)):
        raise HTTPException(429, "Too many attempts. Please wait a few minutes and try again.")


async def optional_user(request: Request) -> User | None:
    return await runtime.current.auth.from_token(request.cookies.get(SESSION_COOKIE))


async def require_user(request: Request) -> User:
    user = await optional_user(request)
    if user is None:
        raise HTTPException(401, "Please sign in.")
    return user


async def require_admin(request: Request) -> User:
    user = await require_user(request)
    if not user.is_admin:
        raise HTTPException(403, "This page is for administrators.")
    return user


def set_session(response: Response, request: Request, token: str) -> None:
    response.set_cookie(
        SESSION_COOKIE,
        token,
        max_age=30 * 24 * 3600,
        httponly=True,
        secure=request.url.scheme == "https",
        samesite="lax",
        path="/",
    )


def clear_session(response: Response) -> None:
    response.delete_cookie(SESSION_COOKIE, path="/")
