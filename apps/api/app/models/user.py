"""The signed-in user as the rest of the app sees it (never with the password hash)."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class User:
    id: str
    name: str
    email: str
    role: str
    verified: bool
    created_at: str | None

    @classmethod
    def from_row(cls, row: dict[str, Any], admin_emails: frozenset[str]) -> User:
        # ADMIN_EMAILS wins over the stored role, so admin access is granted by configuration, not by a database edit.
        role = "admin" if row["email"] in admin_emails else (row.get("role") or "user")
        return cls(row["id"], row.get("name") or "", row["email"], role, bool(row.get("verified_at")), row.get("created_at"))

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"

    def public(self) -> dict[str, Any]:
        return {"id": self.id, "name": self.name, "email": self.email, "role": self.role, "verified": self.verified, "created_at": self.created_at}
