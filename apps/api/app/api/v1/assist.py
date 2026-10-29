"""Ask a question about a finished report, read a screenshot, and the public stats on the home page."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from ...services import runtime
from ...services.investigation_service import ServiceError
from ..deps import limit
from .investigations import get_run

router = APIRouter(tags=["assist"])


class AskRequest(BaseModel):
    question: str = Field(min_length=3, max_length=500)


class TranscribeRequest(BaseModel):
    image: str = Field(min_length=32, max_length=7_500_000)  # a data: URL; about 5 MB once decoded


@router.post("/investigations/{run_id}/ask")
async def ask(run_id: str, body: AskRequest, request: Request) -> dict[str, str]:
    """Answers from the report's own evidence, with citations. Nemotron Super, about a tenth of a cent a question."""
    run = await get_run(run_id)
    if not run.report:
        raise HTTPException(409, "This investigation hasn't finished yet.")
    limit(request, "ask")
    try:
        answer = await runtime.current.assistant.ask(run.id, run.report, " ".join(body.question.split()))
    except ServiceError as exc:
        raise HTTPException(exc.status, exc.message) from exc
    return {"answer": answer}


@router.post("/transcribe")
async def transcribe(body: TranscribeRequest, request: Request) -> dict[str, str]:
    limit(request, "transcribe")
    try:
        return await runtime.current.assistant.transcribe(body.image)
    except ServiceError as exc:
        raise HTTPException(exc.status, exc.message) from exc


@router.get("/stats")
async def stats() -> dict[str, Any]:
    return await runtime.current.assistant.stats()
