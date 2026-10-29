"""Email through Resend: one-time codes for verifying an account or resetting a password, and admin notices."""
from __future__ import annotations

import html
import logging

import httpx

from ..core.config import Settings

logger = logging.getLogger("proofbeforepay.email")

PURPOSE_COPY = {
    "verify": ("Your ProofBeforePay code", "Use this code to verify your email and finish creating your account."),
    "reset": ("Reset your ProofBeforePay password", "Use this code to set a new password. If you didn't ask for this, you can ignore this email."),
}


class EmailError(RuntimeError):
    """Sending failed; the message is safe to show to the user."""


def code_email(name: str, code: str, purpose: str, public_url: str) -> tuple[str, str, str]:
    subject, intro = PURPOSE_COPY[purpose]
    greeting = f"Hi {html.escape(name.split()[0])}," if name.strip() else "Hi,"
    digits = "".join(
        f'<td style="padding:0 4px"><div style="width:44px;height:56px;line-height:56px;border-radius:12px;background:#ffffff;'
        f'border:1px solid #e3ddd0;font:600 28px ui-monospace,SFMono-Regular,Menlo,monospace;color:#16140f;text-align:center">{d}</div></td>'
        for d in code
    )
    body = f"""<!doctype html><html><body style="margin:0;background:#f6f3ec;padding:32px 12px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#16140f">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:480px;background:#fbfaf6;border:1px solid #e3ddd0;border-radius:20px;overflow:hidden" cellspacing="0" cellpadding="0">
<tr><td style="height:4px;background:#76b900"></td></tr>
<tr><td style="padding:32px 32px 8px"><p style="margin:0;font-weight:700;font-size:16px;letter-spacing:-0.01em">ProofBeforePay</p></td></tr>
<tr><td style="padding:8px 32px 0"><p style="margin:16px 0 8px;font-size:15px">{greeting}</p>
<p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:#4b463b">{intro}</p></td></tr>
<tr><td align="center" style="padding:0 24px"><table role="presentation" cellspacing="0" cellpadding="0"><tr>{digits}</tr></table></td></tr>
<tr><td style="padding:24px 32px 32px"><p style="margin:0;font-size:13px;line-height:1.55;color:#7a7466">The code works for 10 minutes. ProofBeforePay will never ask you for this code by phone, chat or email.</p></td></tr>
<tr><td style="padding:16px 32px;border-top:1px solid #ece6da;font-size:12px;color:#9a9384">Check the offer before it costs you · <a href="{html.escape(public_url)}" style="color:#4a7a00">{html.escape(public_url.split('//')[-1])}</a></td></tr>
</table></td></tr></table></body></html>"""
    text = f"{greeting}\n\n{intro}\n\nYour code: {code}\n\nIt works for 10 minutes. We'll never ask you for this code by phone, chat or email."
    return subject, body, text


class EmailService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.client = (
            httpx.AsyncClient(base_url="https://api.resend.com", headers={"Authorization": f"Bearer {settings.resend_api_key}"}, timeout=15.0)
            if settings.resend_api_key
            else None
        )

    @property
    def configured(self) -> bool:
        return self.client is not None

    async def send(self, to: list[str], subject: str, html_body: str, text: str) -> None:
        if self.client is None:
            raise EmailError("Email isn't set up on this server yet.")
        payload = {"from": self.settings.email_from, "to": to, "subject": subject, "html": html_body, "text": text}
        try:
            response = await self.client.post("/emails", json=payload)
        except httpx.HTTPError as exc:
            logger.error("Resend request failed: %s", exc)
            raise EmailError("We couldn't send the email. Please try again in a minute.") from exc
        if response.status_code >= 400:
            detail = response.text[:300]
            logger.error("Resend refused the email (%s): %s", response.status_code, detail)
            if response.status_code == 403 and ("testing emails" in detail or "verify a domain" in detail):
                raise EmailError("This server can only email its owner until a sending domain is verified in Resend.")
            raise EmailError("We couldn't send the email. Please try again in a minute.")

    async def send_code(self, to: str, name: str, code: str, purpose: str) -> None:
        if self.client is None and not self.settings.production:
            # Local development without Resend: the code goes to the server log instead. Never in production.
            logger.warning("RESEND_API_KEY isn't set. %s code for %s: %s", purpose.capitalize(), to, code)
            return
        subject, body, text = code_email(name, code, purpose, self.settings.public_url)
        await self.send([to], subject, body, text)

    async def notify_admins(self, subject: str, text: str) -> None:
        """Best effort: a failed notice never fails the request that triggered it."""
        if self.client is None or not self.settings.admin_emails:
            return
        body = f"<pre style=\"font:14px/1.5 -apple-system,Segoe UI,sans-serif;white-space:pre-wrap\">{html.escape(text)}</pre>"
        try:
            await self.send(sorted(self.settings.admin_emails), subject, body, text)
        except EmailError:
            pass

    async def close(self) -> None:
        if self.client is not None:
            await self.client.aclose()
