"""Request bodies for investigations. Responses are plain dicts built from the run and its report."""
from __future__ import annotations

from pydantic import BaseModel, Field


class InvestigationRequest(BaseModel):
    message: str = Field(min_length=40, max_length=8000)
    sender: str = Field(default="", max_length=200)
    channel: str = Field(default="", max_length=60)
