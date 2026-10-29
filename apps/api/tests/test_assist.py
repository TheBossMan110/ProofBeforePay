"""Ask the report, screenshot reading and the public stats. No model is called."""
from __future__ import annotations

import base64
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.intelligence.report_qa import keep_known_refs
from app.services import assistant_service


def test_unknown_citations_are_dropped() -> None:
    text = keep_known_refs("The fee is a red flag [C1, F9]. Nothing else [S99] backs it.", {"C1"})
    assert text == "The fee is a red flag [C1]. Nothing else backs it."


def test_ask_answers_from_a_finished_report(client: TestClient, rt: Any, monkeypatch: pytest.MonkeyPatch) -> None:
    seen: dict[str, Any] = {}

    async def fake_answer(llm: Any, report: dict[str, Any], question: str) -> tuple[str, float]:
        seen["question"] = question
        return "It asks you to pay first [F1].", 0.001

    monkeypatch.setattr(assistant_service, "answer_question", fake_answer)
    response = client.post("/api/v1/investigations/remote-job-telegram/ask", json={"question": "  Why   is this a Stop? "})
    assert response.status_code == 200
    assert response.json() == {"answer": "It asks you to pay first [F1]."}
    assert seen["question"] == "Why is this a Stop?"
    assert rt.budget.spent == pytest.approx(0.001) and rt.budget.reserved == 0


def test_ask_needs_a_real_investigation_and_a_real_question(client: TestClient) -> None:
    assert client.post("/api/v1/investigations/nope/ask", json={"question": "Is this safe?"}).status_code == 404
    assert client.post("/api/v1/investigations/remote-job-telegram/ask", json={"question": "?"}).status_code == 422


def _data_url(mime: str, raw: bytes) -> str:
    return f"data:{mime};base64," + base64.b64encode(raw).decode()


def test_transcribe_checks_the_image_before_any_model_call(client: TestClient, rt: Any) -> None:
    def post(image: str) -> int:
        return client.post("/api/v1/transcribe", json={"image": image}).status_code

    assert post(_data_url("image/gif", b"x" * 64)) == 415
    assert post("data:image/png;base64," + "not base64!" * 8) == 400
    assert post(_data_url("image/png", b"\0" * (5 * 1024 * 1024 + 1))) == 413
    assert rt.budget.spent == 0 and rt.budget.reserved == 0


def test_stats_are_public_and_shaped_for_the_home_page(client: TestClient) -> None:
    body = client.get("/api/v1/stats").json()
    assert set(body) == {"checks", "avg_seconds", "avg_cost_usd", "avg_savings_pct", "by_decision"}
    assert body["checks"] >= 0
