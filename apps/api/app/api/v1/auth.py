"""Accounts: sign up and verify by emailed code, sign in and out, and reset a forgotten password."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, Response

from ...models.user import User
from ...schemas.auth import CodeRequest, DemoRequest, EmailBody, LoginRequest, ResendRequest, ResetRequest, SignupRequest
from ...services import runtime
from ...services.auth_service import AuthError
from ...services.email_service import EmailError
from ..deps import SESSION_COOKIE, clear_session, client_ip, limit, optional_user, set_session

router = APIRouter(prefix="/auth", tags=["auth"])


def _fail(exc: AuthError | EmailError) -> HTTPException:
    if isinstance(exc, EmailError):
        return HTTPException(503, str(exc))
    return HTTPException(exc.status, {"message": exc.message, "code": exc.code})


async def _signed_in(user: User, request: Request, response: Response) -> dict[str, Any]:
    token = await runtime.current.auth.start_session(user, client_ip(request), request.headers.get("user-agent", ""))
    set_session(response, request, token)
    return {"user": user.public()}


@router.post("/signup", status_code=201)
async def signup(body: SignupRequest, request: Request) -> dict[str, str]:
    limit(request, "signup")
    try:
        await runtime.current.auth.signup(body.name, body.email, body.password)
    except (AuthError, EmailError) as exc:
        raise _fail(exc) from exc
    return {"status": "verify", "email": body.email}


@router.post("/verify")
async def verify(body: CodeRequest, request: Request, response: Response) -> dict[str, Any]:
    limit(request, "code")
    try:
        user = await runtime.current.auth.verify(body.email, body.code)
    except AuthError as exc:
        raise _fail(exc) from exc
    return await _signed_in(user, request, response)


@router.post("/resend")
async def resend(body: ResendRequest, request: Request) -> dict[str, str]:
    limit(request, "email")
    try:
        await runtime.current.auth.resend(body.email, body.purpose)
    except (AuthError, EmailError) as exc:
        raise _fail(exc) from exc
    return {"status": "sent"}


@router.post("/login")
async def login(body: LoginRequest, request: Request, response: Response) -> dict[str, Any]:
    limit(request, "login")
    try:
        user = await runtime.current.auth.login(body.email, body.password)
    except (AuthError, EmailError) as exc:
        raise _fail(exc) from exc
    return await _signed_in(user, request, response)


@router.post("/demo")
async def demo(body: DemoRequest, request: Request, response: Response) -> dict[str, Any]:
    """One-click sign-in to a shared demo account, so judges can try the signed-in app without an email code."""
    limit(request, "login")
    try:
        user = await runtime.current.auth.demo_user(body.kind)
    except AuthError as exc:
        raise _fail(exc) from exc
    return await _signed_in(user, request, response)


@router.post("/forgot")
async def forgot(body: EmailBody, request: Request) -> dict[str, str]:
    limit(request, "email")
    try:
        await runtime.current.auth.forgot(body.email)
    except (AuthError, EmailError) as exc:
        raise _fail(exc) from exc
    return {"status": "sent"}


@router.post("/reset")
async def reset(body: ResetRequest, request: Request, response: Response) -> dict[str, Any]:
    limit(request, "code")
    try:
        user = await runtime.current.auth.reset(body.email, body.code, body.password)
    except AuthError as exc:
        raise _fail(exc) from exc
    return await _signed_in(user, request, response)


@router.post("/logout")
async def logout(request: Request, response: Response) -> dict[str, str]:
    await runtime.current.auth.end_session(request.cookies.get(SESSION_COOKIE))
    clear_session(response)
    return {"status": "signed_out"}


@router.get("/me")
async def me(user: User | None = Depends(optional_user)) -> dict[str, Any]:
    return {"user": user.public() if user else None}
