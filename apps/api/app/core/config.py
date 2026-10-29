"""Runtime configuration, read once from environment variables (a root .env file is supported)."""
from __future__ import annotations

import os
import re
import secrets
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parents[4]  # repository root (holds .env)
API_DIR = Path(__file__).resolve().parents[2]  # apps/api
load_dotenv(ROOT_DIR / ".env")


def _env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


def _float(name: str, default: float) -> float:
    raw = _env(name)
    return float(raw) if raw else default


def _int(name: str, default: int) -> int:
    raw = _env(name)
    return int(raw) if raw else default


def _supabase_rest_url(raw: str) -> str:
    """Accept the project URL (https://<ref>.supabase.co) or a Postgres connection string for the same project.

    The app talks to Supabase over its HTTPS API, so a direct connection string (db.<ref>.supabase.co) or a pooler
    string (user postgres.<ref>) is turned into the project's API URL.
    """
    if not raw or raw.startswith("http"):
        return raw.rstrip("/")
    match = re.search(r"@db\.([a-z0-9]+)\.supabase\.co", raw) or re.search(r"//postgres\.([a-z0-9]+)[:@]", raw)
    return f"https://{match.group(1)}.supabase.co" if match else ""


def _auth_secret(data_dir: Path) -> str:
    """Signs one-time codes. Set AUTH_SECRET in production; locally a random one is kept in data/ so sessions survive restarts."""
    configured = _env("AUTH_SECRET")
    if configured:
        return configured
    path = data_dir / "auth_secret.txt"
    try:
        return path.read_text(encoding="utf-8").strip()
    except OSError:
        value = secrets.token_urlsafe(48)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(value, encoding="utf-8")
        return value


@dataclass
class Tier:
    """One rung of the model ladder. Prices are USD per 1M tokens."""

    name: str
    label: str
    model: str
    input_price: float
    output_price: float

    def cost(self, prompt_tokens: int, completion_tokens: int) -> float:
        return (prompt_tokens * self.input_price + completion_tokens * self.output_price) / 1_000_000

    def public(self) -> dict:
        return {
            "name": self.name,
            "label": self.label,
            "model": self.model,
            "input_price": self.input_price,
            "output_price": self.output_price,
        }


@dataclass
class Settings:
    nebius_api_key: str
    nebius_base_url: str
    tavily_api_key: str
    tiers: dict[str, Tier]
    data_dir: Path
    examples_dir: Path
    static_dir: Path
    cors_origins: list[str]
    runs_per_ip_per_hour: int
    max_runs_per_day: int
    max_concurrent_runs: int
    max_claims: int
    max_spend_usd: float
    run_reserve_usd: float
    supabase_url: str
    supabase_secret_key: str
    production: bool
    auth_secret: str
    resend_api_key: str
    email_from: str
    admin_emails: frozenset[str]
    public_url: str
    demo_judge_email: str
    vision_models: tuple[str, ...]
    price_vision_in: float
    price_vision_out: float
    demo_admin_email: str
    demo_login: bool
    email_test_inbox: str

    @property
    def email_configured(self) -> bool:
        return bool(self.resend_api_key)

    @property
    def db_configured(self) -> bool:
        return bool(self.supabase_url and self.supabase_secret_key)

    @property
    def llm_configured(self) -> bool:
        return bool(self.nebius_api_key)

    @property
    def search_configured(self) -> bool:
        return bool(self.tavily_api_key)

    @property
    def live_enabled(self) -> bool:
        return self.llm_configured and self.search_configured


def load_settings() -> Settings:
    data_dir = Path(_env("DATA_DIR", str(API_DIR / "data")))
    return Settings(
        nebius_api_key=_env("NEBIUS_API_KEY"),
        nebius_base_url=_env("NEBIUS_BASE_URL", "https://api.tokenfactory.us-central1.nebius.com/v1/"),
        tavily_api_key=_env("TAVILY_API_KEY"),
        tiers={
            "ultra": Tier(
                "ultra",
                "Nemotron 3 Ultra",
                _env("MODEL_ULTRA", "nvidia/Nemotron-3-Ultra-550b-a55b"),
                _float("PRICE_ULTRA_IN", 1.00),
                _float("PRICE_ULTRA_OUT", 3.00),
            ),
            "super": Tier(
                "super",
                "Nemotron 3 Super",
                _env("MODEL_SUPER", "nvidia/nemotron-3-super-120b-a12b"),
                _float("PRICE_SUPER_IN", 0.30),
                _float("PRICE_SUPER_OUT", 0.90),
            ),
            "nano": Tier(
                "nano",
                "Nemotron 3 Nano",
                _env("MODEL_NANO", "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B"),
                _float("PRICE_NANO_IN", 0.06),
                _float("PRICE_NANO_OUT", 0.24),
            ),
        },
        data_dir=data_dir,
        examples_dir=API_DIR / "examples",
        static_dir=Path(_env("STATIC_DIR", str(ROOT_DIR / "apps" / "web" / "out"))),
        # The Next.js dev server runs on another port; production serves the exported site from this origin.
        cors_origins=[o.strip() for o in _env("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",") if o.strip()],
        runs_per_ip_per_hour=_int("RUNS_PER_IP_PER_HOUR", 3),
        max_runs_per_day=_int("MAX_RUNS_PER_DAY", 150),
        max_concurrent_runs=_int("MAX_CONCURRENT_RUNS", 4),
        max_claims=_int("MAX_CLAIMS", 8),
        # Total Token Factory spend this server may run up, and what each run holds back until its real cost is known.
        max_spend_usd=_float("MAX_SPEND_USD", 1.00),
        run_reserve_usd=_float("RUN_RESERVE_USD", 0.15),
        # Optional Supabase persistence. The secret key stays on the server; the browser never sees it.
        supabase_url=_supabase_rest_url(_env("SUPABASE_URL")),
        supabase_secret_key=_env("SUPABASE_SECRET_KEY") or _env("SUPABASE_SERVICE_ROLE_KEY"),
        # Accounts: one-time codes by email through Resend. In production codes are never written to the log.
        production=_env("APP_ENV").lower() == "production",
        auth_secret=_auth_secret(data_dir),
        resend_api_key=_env("RESEND_API_KEY"),
        email_from=_env("EMAIL_FROM", "ProofBeforePay <onboarding@resend.dev>"),
        admin_emails=frozenset(e.strip().lower() for e in _env("ADMIN_EMAILS").split(",") if e.strip()),
        public_url=_env("PUBLIC_URL", "http://localhost:3000").rstrip("/"),
        # Shared demo accounts for judges, signed in with one click from the login page. They can't be renamed,
        # deleted or reset, and the demo admin sees the admin dashboard with people's names and emails masked.
        # example.com is reserved, so nobody can own these addresses. Create them with scripts/seed_demo_accounts.py.
        demo_judge_email=_env("DEMO_JUDGE_EMAIL", "demo.judge@example.com").lower(),
        # Reads text out of uploaded screenshots (Nemotron does all the reasoning). The first one that answers is used.
        vision_models=tuple(m.strip() for m in _env("MODEL_VISION", "openbmb/MiniCPM-V-4_5,google/gemma-3-27b-it").split(",") if m.strip()),
        price_vision_in=_float("PRICE_VISION_IN", 0.20),
        price_vision_out=_float("PRICE_VISION_OUT", 0.60),
        demo_admin_email=_env("DEMO_ADMIN_EMAIL", "demo.admin@example.com").lower(),
        # Until a sending domain is verified, Resend only delivers to the account owner. With this set, a code Resend
        # won't deliver goes to this inbox instead, labelled with who it's for. Leave empty once a domain is verified.
        email_test_inbox=_env("EMAIL_TEST_INBOX").lower(),
        demo_login=_env("DEMO_LOGIN", "on").lower() not in ("off", "false", "0"),
    )


settings = load_settings()
