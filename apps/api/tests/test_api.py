"""HTTP API: validation, the spending ceiling, limits, examples, replay and the evidence endpoints."""
from __future__ import annotations

from typing import Any

import pytest
from fastapi.testclient import TestClient

MESSAGE = "Hi, we'd like to offer you a remote role. Please reply so we can set up a short call this week."


def test_health_reports_live_mode_and_tiers(client: TestClient) -> None:
    body = client.get("/api/v1/health").json()
    assert body["live"] is True
    assert {t["name"] for t in body["tiers"]} == {"ultra", "super", "nano"}


def test_short_messages_are_rejected(client: TestClient) -> None:
    assert client.post("/api/v1/investigations", json={"message": "too short"}).status_code == 422


def test_a_run_is_created_settled_and_retrievable(client: TestClient, rt: Any) -> None:
    response = client.post("/api/v1/investigations", json={"message": MESSAGE})
    assert response.status_code == 201
    run_id = response.json()["id"]
    body = client.get(f"/api/v1/investigations/{run_id}").json()
    assert body["status"] == "done" and body["decision"] == "VERIFY_FIRST"
    assert rt.budget.spent == pytest.approx(0.02) and rt.budget.reserved == 0
    # Saved to the database too, and readable back after the in-memory copy is gone.
    rt.store._runs.clear()
    assert client.get(f"/api/v1/investigations/{run_id}").json()["decision"] == "VERIFY_FIRST"


def test_spending_ceiling_pauses_live_checks(client: TestClient, rt: Any) -> None:
    rt.budget.spent = 0.9
    assert client.get("/api/v1/health").json()["live"] is False
    response = client.post("/api/v1/investigations", json={"message": MESSAGE})
    assert response.status_code == 503 and "budget" in response.json()["detail"]


def test_rate_limit_per_visitor(client: TestClient) -> None:
    codes = [client.post("/api/v1/investigations", json={"message": MESSAGE}).status_code for _ in range(4)]
    assert codes == [201, 201, 201, 429]


def test_unknown_and_malformed_ids_are_404(client: TestClient) -> None:
    assert client.get("/api/v1/investigations/doesnotexist").status_code == 404
    assert client.get("/api/v1/investigations/..%2F..%2Fsecret").status_code == 404


def test_cross_site_writes_are_blocked(client: TestClient) -> None:
    response = client.post("/api/v1/investigations", json={"message": MESSAGE}, headers={"Origin": "https://evil.example"})
    assert response.status_code == 403


def _first_example(client: TestClient) -> str:
    examples: list[dict[str, Any]] = client.get("/api/v1/examples").json()
    if not examples:
        pytest.skip("no recorded examples in apps/api/examples")
    return examples[0]["id"]


def test_examples_replay_as_server_sent_events(client: TestClient) -> None:
    run_id = _first_example(client)
    with client.stream("GET", f"/api/v1/investigations/{run_id}/events") as response:
        text = "".join(response.iter_text())
    assert response.headers["content-type"].startswith("text/event-stream")
    assert '"type": "report"' in text and '"status": "done"' in text


def test_evidence_and_report_endpoints(client: TestClient) -> None:
    run_id = _first_example(client)
    claims = client.get(f"/api/v1/investigations/{run_id}/claims").json()
    evidence = client.get(f"/api/v1/investigations/{run_id}/evidence").json()
    report = client.get(f"/api/v1/investigations/{run_id}/report").json()
    assert claims and all(c["status"] in ("verified", "contradicted", "inconclusive") for c in claims)
    assert {e["relation"] for e in evidence["evidence"]} <= {"supports", "contradicts", "context"}
    assert report["judgement"]["decision"] in ("PROCEED", "VERIFY_FIRST", "STOP")


def test_health_answers_uptime_monitors(client: TestClient) -> None:
    # UptimeRobot and similar services check with HEAD, not GET.
    assert client.head("/api/v1/health").status_code == 200
