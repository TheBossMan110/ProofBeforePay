"""The contact form: saved for the admin dashboard, and emailed to the admins when email is set up."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request

from ...db.base import DatabaseError
from ...models.user import User
from ...schemas.feedback import ContactRequest
from ...services import runtime
from ..deps import limit, optional_user

router = APIRouter(tags=["contact"])


@router.post("/contact", status_code=201)
async def contact(body: ContactRequest, request: Request, user: User | None = Depends(optional_user)) -> dict[str, str]:
    limit(request, "contact")
    rt = runtime.current
    name, message = " ".join(body.name.split()), body.message.strip()
    try:
        await rt.feedback.add_message(user_id=user.id if user else None, name=name, email=body.email, topic=body.topic, message=message)
    except DatabaseError as exc:
        raise HTTPException(503, "We couldn't send your message just now. Please try again.") from exc
    await rt.email.notify_admins(f"[ProofBeforePay] {body.topic}: message from {name}", f"From: {name} <{body.email}>\n\n{message}")
    return {"status": "received"}
