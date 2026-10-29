"""What one investigation knows: the run's append-only event log, and the working state handed between steps."""
from __future__ import annotations

import asyncio
import time
from typing import Any

from ..risk.scoring import SignalBoard
from ..tools.tavily_search import SourceRegistry

TERMINAL_STATUSES = {"done", "error"}

class Run:
    def __init__(self, run_id: str, input: dict[str, Any], *, example: bool = False) -> None:
        self.id = run_id
        self.input = input
        self.example = example
        self.user_id: str | None = None  # the signed-in owner, if any
        self.status = "queued"
        self.created_at = time.time()
        self.events: list[dict[str, Any]] = []
        self.report: dict[str, Any] | None = None
        self.error: str | None = None
        self._t0 = time.monotonic()
        self._subscribers: set[asyncio.Queue[dict[str, Any]]] = set()

    @property
    def finished(self) -> bool:
        return self.status in TERMINAL_STATUSES

    def emit(self, type_: str, **data: Any) -> None:
        event = {"seq": len(self.events), "t": round(time.monotonic() - self._t0, 3), "type": type_, **data}
        self.events.append(event)
        for queue in self._subscribers:
            queue.put_nowait(event)

    def set_status(self, status: str, message: str | None = None) -> None:
        self.status = status
        payload: dict[str, Any] = {"status": status}
        if message:
            payload["message"] = message
        self.emit("status", **payload)

    def subscribe(self) -> asyncio.Queue[dict[str, Any]]:
        queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
        self._subscribers.add(queue)
        return queue

    def unsubscribe(self, queue: asyncio.Queue[dict[str, Any]]) -> None:
        self._subscribers.discard(queue)

    def summary(self) -> dict[str, Any]:
        report = self.report or {}
        judgement = report.get("judgement", {})
        return {
            "id": self.id,
            "status": self.status,
            "example": self.example,
            "created_at": self.created_at,
            "input": self.input,
            "error": self.error,
            "decision": judgement.get("decision"),
            "headline": judgement.get("headline"),
            "confidence": judgement.get("confidence"),
            "company": report.get("entities", {}).get("company"),
            "role": report.get("entities", {}).get("role"),
            "challenge_outcome": (report.get("challenge") or {}).get("outcome"),
            "cost_usd": (report.get("telemetry") or {}).get("cost_usd"),
            "duration_s": (report.get("telemetry") or {}).get("duration_s"),
            "savings_pct": (report.get("telemetry") or {}).get("savings_pct"),
        }

    def to_record(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "input": self.input,
            "status": self.status,
            "created_at": self.created_at,
            "report": self.report,
            "error": self.error,
            "events": self.events,
            "user_id": self.user_id,
        }

    @classmethod
    def from_record(cls, record: dict[str, Any], *, example: bool = False) -> Run:
        run = cls(record["id"], record["input"], example=example)
        run.status = record["status"]
        run.created_at = record["created_at"]
        run.report = record.get("report")
        run.error = record.get("error")
        run.events = record.get("events", [])
        run.user_id = record.get("user_id")
        return run

class Investigation:
    """Everything one run learns, handed from stage to stage."""

    def __init__(self, run: Run) -> None:
        self.run = run
        self.offer: dict[str, Any] = run.input
        self.sources = SourceRegistry(run)
        self.signals = SignalBoard(run)
        self.entities: dict[str, Any] = {}
        self.contacts: dict[str, list[str]] = {}
        self.claims: list[dict[str, Any]] = []
        self.official: str | None = None
        self.official_aliases: set[str] = set()
        self.careers_pages: list[dict[str, Any]] = []
        self.fingerprint_hits: list[dict[str, Any]] = []
        self.searched: list[str] = []
        self.links: list[dict[str, Any]] = []
        self.judgement: dict[str, Any] = {}
        self.challenge: dict[str, Any] | None = None
        self.brief: dict[str, Any] = {}
        self.started = time.monotonic()
