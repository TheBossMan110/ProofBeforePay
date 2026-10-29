"""Request bodies for feedback on a report and the contact form."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from .auth import EmailBody


class FeedbackRequest(BaseModel):
    investigation_id: str | None = Field(default=None, max_length=64)
    rating: int = Field(ge=1, le=5)
    comment: str = Field(default="", max_length=2000)


class ContactRequest(EmailBody):
    name: str = Field(min_length=1, max_length=80)
    topic: Literal["question", "feedback", "partnership", "press", "bug", "other"] = "question"
    message: str = Field(min_length=10, max_length=5000)
