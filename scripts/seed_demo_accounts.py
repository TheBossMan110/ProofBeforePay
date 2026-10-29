"""Create (or refresh) the two shared demo accounts that judges sign in with from the login page.

Run from the repository root:  apps/api/.venv/Scripts/python scripts/seed_demo_accounts.py [password]

Both accounts are verified straight away (their example.com addresses can't receive email), can't be renamed,
deleted or reset, and the demo admin sees the admin dashboard with people's names and emails masked. The password
only matters for signing in by hand; the login page's demo buttons don't need it.
"""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "apps" / "api"))

from app.core.config import settings  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.db.session import connect  # noqa: E402
from app.repositories.user_repo import UserRepo, now  # noqa: E402

PASSWORD = sys.argv[1] if len(sys.argv) > 1 else "ProofBeforePay-Demo-2026"
ACCOUNTS = [(settings.demo_judge_email, "Demo Judge"), (settings.demo_admin_email, "Demo Admin")]


async def main() -> None:
    db = connect(settings)
    if db.kind != "supabase":
        print("Supabase isn't configured, so the accounts would vanish on restart. Set SUPABASE_URL first.")
        return
    users = UserRepo(db)
    try:
        for email, name in ACCOUNTS:
            row = await users.by_email(email)
            if row is None:
                row = await users.create(name, email, hash_password(PASSWORD))
            await users.update(row["id"], name=name, password_hash=hash_password(PASSWORD), verified_at=row.get("verified_at") or now().isoformat())
            print(f"ready: {email}")
    finally:
        await db.close()
    print(f"password: {PASSWORD}")


asyncio.run(main())
