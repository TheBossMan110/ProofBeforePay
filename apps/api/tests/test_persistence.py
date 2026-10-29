"""The spending ceiling and the mapping from a report to the evidence-trail tables."""
from __future__ import annotations

from pathlib import Path

import pytest

from app.core.security import SpendGuard
from app.repositories.investigation_repo import evidence_rows


def test_spend_guard_reserves_per_run_and_survives_restarts(tmp_path: Path) -> None:
    path = tmp_path / "spend.json"
    guard = SpendGuard(path, cap=1.0, reserve=0.15)
    started = 0
    while guard.claim():
        started += 1
    assert started == 6  # 6 × $0.15 reserved; a 7th could overshoot the $1 ceiling
    for _ in range(started):
        guard.settle(0.02)
    assert round(guard.spent, 2) == 0.12 and guard.reserved == 0
    assert SpendGuard(path, cap=1.0, reserve=0.15).spent == pytest.approx(guard.spent)


def test_spend_guard_stops_before_the_ceiling(tmp_path: Path) -> None:
    guard = SpendGuard(tmp_path / "spend.json", cap=0.5, reserve=0.15)
    guard.settle(0.4)
    assert not guard.available() and not guard.claim()


def test_report_maps_to_evidence_rows() -> None:
    report = {
        "claims": [
            {"id": "C1", "type": "process", "text": "No fees", "status": "contradicted", "confidence": 0.9, "source_id": "S2",
             "quote": "We never charge.", "checked_by": "super", "escalated": True, "note": "n"},
            {"id": "C2", "type": "identity", "text": "Jane works there", "status": "inconclusive", "confidence": 0.2, "source_id": None},
        ],
        "sources": [{"id": "S2", "url": "https://acme.com/fraud", "title": "Fraud", "domain": "acme.com", "purposes": ["warning"],
                     "retrieved_at": 1793250000.0}],
        "signals": [{"id": "F1", "rule": "upfront_payment", "kind": "pattern", "polarity": "red", "severity": "high", "title": "Fee",
                     "detail": "d"}],
        "judgement": {"key_findings": [{"polarity": "red", "text": "Asks for a fee", "refs": ["F1", "C1"]}]},
    }
    rows = evidence_rows("abc123", report)
    assert [c["claim_id"] for c in rows["claims"]] == ["C1", "C2"]
    assert rows["evidence"] == [
        {"investigation_id": "abc123", "claim_id": "C1", "source_id": "S2", "excerpt": "We never charge.", "relation": "contradicts"}
    ]
    assert rows["sources"][0]["retrieved_at"].startswith("2026-")
    assert rows["findings"][0] == {"investigation_id": "abc123", "position": 0, "polarity": "red", "text": "Asks for a fee", "refs": ["F1", "C1"]}
