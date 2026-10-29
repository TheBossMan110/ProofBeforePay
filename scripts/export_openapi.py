"""Write the API contract to packages/shared-types/openapi.json, so clients can generate types from it.

Run from the repository root:  apps/api/.venv/Scripts/python scripts/export_openapi.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "apps" / "api"))

from app.main import app  # noqa: E402

target = ROOT / "packages" / "shared-types" / "openapi.json"
target.write_text(json.dumps(app.openapi(), indent=2) + "\n", encoding="utf-8")
print(f"Wrote {target.relative_to(ROOT)} ({len(app.openapi()['paths'])} paths)")
