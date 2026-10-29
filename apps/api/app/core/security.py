"""Security primitives: password hashing, session tokens, one-time codes, rate limits and the spending ceiling.

Everything here uses the standard library. Passwords are hashed with scrypt; session tokens and one-time codes are
stored only as digests, so a database leak doesn't hand out working sessions or codes.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import time
from collections import defaultdict, deque
from pathlib import Path

_SCRYPT = {"n": 2**14, "r": 8, "p": 1, "dklen": 32}


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, **_SCRYPT)
    return "scrypt$" + base64.b64encode(salt).decode() + "$" + base64.b64encode(digest).decode()


def verify_password(password: str, stored: str | None) -> bool:
    """Constant-time check. With no stored hash it still does the work, so timing doesn't reveal unknown emails."""
    try:
        _, salt_b64, digest_b64 = (stored or "").split("$")
        salt, expected = base64.b64decode(salt_b64), base64.b64decode(digest_b64)
    except ValueError:
        salt, expected = b"0" * 16, b""
    actual = hashlib.scrypt(password.encode(), salt=salt, **_SCRYPT)
    return bool(expected) and hmac.compare_digest(actual, expected)


def new_token() -> str:
    return secrets.token_urlsafe(32)


def token_digest(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def new_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def code_digest(code: str, user_id: str, secret: str) -> str:
    return hmac.new(secret.encode(), f"{user_id}:{code}".encode(), hashlib.sha256).hexdigest()


def same_digest(a: str, b: str) -> bool:
    return hmac.compare_digest(a.encode(), b.encode())


class SlidingWindow:
    """At most `limit` events per key in the last `seconds`. In memory: a restart resets it, the spend ceiling doesn't."""

    def __init__(self, limit: int, seconds: float) -> None:
        self.limit, self.seconds = limit, seconds
        self._hits: defaultdict[str, deque[float]] = defaultdict(deque)

    def allow(self, key: str) -> bool:
        now = time.time()
        hits = self._hits[key]
        while hits and now - hits[0] > self.seconds:
            hits.popleft()
        if len(hits) >= self.limit:
            return False
        hits.append(now)
        return True


class RateLimiter:
    """Live-check limits that keep a public demo from draining shared credits: per visitor per hour, and per day."""

    def __init__(self, per_ip_per_hour: int, per_day: int) -> None:
        self.per_ip = per_ip_per_hour
        self._ip = SlidingWindow(per_ip_per_hour, 3600)
        self._day = SlidingWindow(per_day, 86400)

    def check(self, ip: str) -> str | None:
        if not self._ip.allow(ip):
            return f"This demo allows {self.per_ip} live checks per hour. Explore the example investigations meanwhile, or run it locally with your own keys."
        if not self._day.allow("all"):
            return "The live demo has reached today's limit. Explore the example investigations, or run ProofBeforePay locally with your own keys."
        return None


class SpendGuard:
    """A hard ceiling on Token Factory spend. Each run holds back a worst-case reserve before it starts,
    and its metered cost replaces the reserve when it ends. The total is kept in data/spend.json (and in the
    database's spend ledger when one is configured)."""

    def __init__(self, path: Path, cap: float, reserve: float) -> None:
        self.path, self.cap, self.reserve = path, cap, reserve
        self.reserved = 0.0
        try:
            self.spent = float(json.loads(path.read_text(encoding="utf-8"))["spent_usd"])
        except (OSError, ValueError, KeyError, TypeError):
            self.spent = 0.0

    def available(self) -> bool:
        return self.spent + self.reserved + self.reserve <= self.cap

    def claim(self) -> bool:
        if not self.available():
            return False
        self.reserved += self.reserve
        return True

    def settle(self, cost: float) -> None:
        self.reserved = max(0.0, self.reserved - self.reserve)
        self.spent += cost
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(json.dumps({"spent_usd": round(self.spent, 6), "cap_usd": self.cap}), encoding="utf-8")
