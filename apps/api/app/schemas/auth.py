"""Request bodies for accounts. Emails are trimmed and lower-cased; codes must be six digits."""
from __future__ import annotations

import re
from typing import Literal

from pydantic import BaseModel, Field, field_validator

_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]{2,}$")


def _email(value: str) -> str:
    value = value.strip().lower()
    if len(value) > 254 or not _EMAIL.match(value):
        raise ValueError("Enter a valid email address.")
    return value


class EmailBody(BaseModel):
    email: str

    _check_email = field_validator("email")(_email)


class SignupRequest(EmailBody):
    name: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("name")
    @classmethod
    def _name(cls, value: str) -> str:
        value = " ".join(value.split())
        if not value:
            raise ValueError("Enter your name.")
        return value


class LoginRequest(EmailBody):
    password: str = Field(min_length=1, max_length=128)


class CodeRequest(EmailBody):
    code: str = Field(pattern=r"^\d{6}$")


class ResendRequest(EmailBody):
    purpose: Literal["verify", "reset"] = "verify"


class ResetRequest(CodeRequest):
    password: str = Field(min_length=8, max_length=128)


class ProfileUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
