"""ProofBeforePay API: investigations, accounts and the admin dashboard under /api/v1, plus the web app itself.

The Next.js site is exported as static files and served from this same origin, so the session cookie is first-party
and there is one container to deploy.
"""
from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from urllib.parse import urlsplit

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles

from .api.router import api_router
from .core.config import settings
from .core.logging import configure_logging
from .db.base import DatabaseError
from .services import runtime

configure_logging()
logger = logging.getLogger("proofbeforepay")


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    rt = runtime.current
    if settings.llm_configured:
        try:
            await rt.llm.resolve_models()
            logger.info("Model tiers: %s", {name: tier.model for name, tier in rt.llm.tiers.items()})
        except Exception as exc:
            logger.warning("Could not read the Token Factory model catalog: %s", exc)
    else:
        logger.warning("NEBIUS_API_KEY is not set; only example investigations are available")
    await rt.investigations.restore_spend()
    logger.info("Database: %s; model spend so far $%.4f of $%.2f", rt.db.kind, rt.budget.spent, rt.budget.cap)
    yield
    await rt.db.close()
    await rt.email.close()


app = FastAPI(title="ProofBeforePay", version="2.0.0", lifespan=lifespan)
if settings.cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "DELETE"],
        allow_headers=["content-type", "last-event-id"],
    )


@app.middleware("http")
async def same_origin_writes(request: Request, call_next):  # type: ignore[no-untyped-def]
    """Cookie-authenticated writes must come from this site. SameSite=Lax already stops most cross-site requests;
    this closes the rest. Requests without an Origin header (curl, server-to-server) carry no browser cookie risk."""
    if request.method in ("POST", "PATCH", "PUT", "DELETE") and request.url.path.startswith("/api/"):
        origin = request.headers.get("origin")
        if origin and origin not in settings.cors_origins and urlsplit(origin).netloc != request.headers.get("host"):
            return JSONResponse({"detail": "Cross-site request blocked."}, status_code=403)
    return await call_next(request)


@app.exception_handler(DatabaseError)
async def database_unavailable(_request: Request, exc: DatabaseError) -> JSONResponse:
    logger.error("Database error: %s", exc)
    return JSONResponse({"detail": "Accounts are unavailable right now. Please try again in a minute."}, status_code=503)


app.include_router(api_router)


_static = settings.static_dir.resolve()
if (_static / "index.html").is_file():
    # The Next.js static export: hashed assets under /_next, one HTML file per route (about.html for /about).
    if (_static / "_next").is_dir():
        app.mount("/_next", StaticFiles(directory=_static / "_next"), name="next-assets")

    @app.api_route("/{path:path}", methods=["GET", "HEAD"], include_in_schema=False)
    async def site(path: str) -> Response:
        if path.startswith("api/"):
            raise HTTPException(404, "Not found.")
        clean = path.strip("/")
        candidates = [_static / clean, _static / f"{clean}.html", _static / clean / "index.html"] if clean else [_static / "index.html"]
        for candidate in candidates:
            resolved = candidate.resolve()
            if resolved.is_file() and resolved.is_relative_to(_static):
                return FileResponse(resolved)
        return FileResponse(_static / "404.html", status_code=404)
