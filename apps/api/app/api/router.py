"""Every API route, under /api/v1."""
from __future__ import annotations

from fastapi import APIRouter

from .v1 import admin, auth, contact, evidence, feedback, health, investigations, me, reports

api_router = APIRouter(prefix="/api/v1")
for module in (health, investigations, evidence, reports, auth, me, feedback, contact, admin):
    api_router.include_router(module.router)
