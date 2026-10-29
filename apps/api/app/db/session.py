"""Picks the database: Supabase when it's configured, memory otherwise."""
from __future__ import annotations

import logging

from ..core.config import Settings
from .base import Database
from .memory import MemoryDatabase
from .supabase import SupabaseDatabase

logger = logging.getLogger("proofbeforepay.db")


def connect(settings: Settings) -> Database:
    if settings.db_configured:
        return SupabaseDatabase(settings.supabase_url, settings.supabase_secret_key)
    logger.warning("Supabase isn't configured: accounts, feedback and messages are kept in memory until restart")
    return MemoryDatabase()
