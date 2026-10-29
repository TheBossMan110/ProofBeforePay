"""Resend test mode: codes it won't deliver go to the owner's inbox, labelled with who they're for."""
from __future__ import annotations

import asyncio
import dataclasses

import pytest

from app.core.config import settings
from app.services.email_service import EmailService, RecipientNotAllowed


class Recorder(EmailService):
    def __init__(self, inbox: str) -> None:
        super().__init__(dataclasses.replace(settings, resend_api_key="test", email_test_inbox=inbox))
        self.sent: list[tuple[list[str], str, str]] = []

    async def send(self, to: list[str], subject: str, html_body: str, text: str) -> None:
        if to != [self.settings.email_test_inbox]:
            raise RecipientNotAllowed("Resend is in test mode.")
        self.sent.append((to, subject, text))


def test_undeliverable_codes_go_to_the_test_inbox() -> None:
    email = Recorder("owner@example.com")
    asyncio.run(email.send_code("someone@example.org", "Sam", "123456", "verify"))
    [(to, subject, text)] = email.sent
    assert to == ["owner@example.com"]
    assert "someone@example.org" in subject and "123456" in text and text.startswith("Test mode")
    asyncio.run(email.close())


def test_without_a_test_inbox_the_error_reaches_the_person() -> None:
    email = Recorder("")
    with pytest.raises(RecipientNotAllowed):
        asyncio.run(email.send_code("someone@example.org", "Sam", "123456", "verify"))
    asyncio.run(email.close())
