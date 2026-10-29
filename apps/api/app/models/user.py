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
    demo: bool = False

    @classmethod
    def from_row(cls, row: dict[str, Any], admin_emails: frozenset[str], demo_emails: tuple[str, str] = ("", "")) -> User:
        # Admin access is granted by configuration (ADMIN_EMAILS, or the demo admin), never by a database edit.
        judge, demo_admin = demo_emails
        email = row["email"]
        role = "admin" if email in admin_emails or email == demo_admin else (row.get("role") or "user")
        demo = email in (judge, demo_admin)
        return cls(row["id"], row.get("name") or "", email, role, bool(row.get("verified_at")), row.get("created_at"), demo)

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"

    @property
    def sees_masked_data(self) -> bool:
        """The demo admin's login is public, so it sees the admin dashboard with people's details masked."""
        return self.demo and self.is_admin

    def public(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "verified": self.verified,
            "created_at": self.created_at,
            "demo": self.demo,
        }
