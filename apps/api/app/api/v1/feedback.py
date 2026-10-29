"""Feedback on a report: a 1–5 rating and an optional comment. Signed-in or not."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request

from ...db.base import DatabaseError
from ...models.user import User
from ...schemas.feedback import FeedbackRequest
from ...services import runtime
from ..deps import limit, optional_user

router = APIRouter(tags=["feedback"])


@router.post("/feedback", status_code=201)
async def feedback(body: FeedbackRequest, request: Request, user: User | None = Depends(optional_user)) -> dict[str, str]:
    limit(request, "feedback")
    try:
        await runtime.current.feedback.add_feedback(
            user_id=user.id if user else None, investigation_id=body.investigation_id, rating=body.rating, comment=body.comment.strip()
        )
    except DatabaseError as exc:
        raise HTTPException(503, "We couldn't save your feedback just now. Please try again.") from exc
    return {"status": "thanks"}
