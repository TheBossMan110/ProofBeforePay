"""Promote a finished investigation from data/runs into examples/ so it ships with the app as a replayable demo.

Run from the repository root:  python scripts/seed_demo.py <run_id> <slug>
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1] / "apps" / "api"


def main() -> int:
    if len(sys.argv) != 3 or not re.fullmatch(r"[a-z0-9-]{4,64}", sys.argv[2]):
        print("usage: python scripts/seed_demo.py <run_id> <slug>   (slug: lowercase letters, digits, dashes)")
        return 2
    run_id, slug = sys.argv[1], sys.argv[2]
    source = BACKEND / "data" / "runs" / f"{run_id}.json"
    if not source.is_file():
        print(f"No saved run at {source}")
        return 1
    record = json.loads(source.read_text(encoding="utf-8"))
    if record.get("status") != "done":
        print(f"Run {run_id} has status {record.get('status')!r}; only finished runs can become examples.")
        return 1
    record["id"] = slug
    target = BACKEND / "examples" / f"{slug}.json"
    target.parent.mkdir(exist_ok=True)
    target.write_text(json.dumps(record, ensure_ascii=False), encoding="utf-8")
    print(f"Saved {target.relative_to(BACKEND)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
