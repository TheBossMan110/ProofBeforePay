"""Step 1: read the message. Nemotron Nano extracts the facts and claims; rules flag patterns."""
from __future__ import annotations

from typing import TYPE_CHECKING

from ..agent.policies import CLAIM_TYPES
from ..agent.workflow import PipelineError, _log, _squash, _text, stage
from ..llm import prompts
from ..tools.url_inspector import extract_contacts

if TYPE_CHECKING:
    from ..agent.state import Investigation


class ClaimExtractor:
    """Turns the pasted message into entities and checkable claims."""

    async def _intake(self, inv: Investigation) -> None:
        run, message = inv.run, inv.offer["message"]
        async with stage(run, "intake"):
            inv.contacts = extract_contacts(message, inv.offer.get("sender", ""))
            _log(run, "intake", "Scanning the message for payment, pressure and data-harvesting patterns")
            inv.signals.scan_patterns(message)
            _log(run, "intake", "Nemotron Nano is extracting the offer's claims")
            data = await self.llm.complete_json(
                run, tier="nano", step="intake", messages=prompts.intake_messages(inv.offer), max_tokens=1500
            )
            if not isinstance(data, dict):
                raise PipelineError("Couldn't read the offer. Try pasting the complete message.")

            fingerprint = _text(data.get("fingerprint"), 200)
            if fingerprint and _squash(fingerprint) not in _squash(message):
                fingerprint = ""  # only search wording that is truly verbatim
            work_mode = _text(data.get("work_mode"), 20).lower()
            requests = data.get("requests") if isinstance(data.get("requests"), list) else []
            inv.entities = {
                "company": _text(data.get("company"), 120),
                "recruiter_name": _text(data.get("recruiter_name"), 120),
                "recruiter_title": _text(data.get("recruiter_title"), 120),
                "role": _text(data.get("role"), 120),
                "compensation": _text(data.get("compensation"), 120),
                "work_mode": work_mode if work_mode in ("remote", "onsite", "hybrid") else "unknown",
                "channel": _text(data.get("channel"), 60) or _text(inv.offer.get("channel"), 60),
                "requests": [r for r in (_text(x, 200) for x in requests) if r][:6],
                "fingerprint": fingerprint,
                "contacts": inv.contacts,
            }
            raw_claims = data.get("claims") if isinstance(data.get("claims"), list) else []
            for item in raw_claims:
                if not isinstance(item, dict) or not _text(item.get("text")):
                    continue
                claim_type = _text(item.get("type"), 20).lower()
                inv.claims.append({
                    "id": f"C{len(inv.claims) + 1}",
                    "type": claim_type if claim_type in CLAIM_TYPES else "company",
                    "text": _text(item.get("text"), 300),
                })
                if len(inv.claims) >= self.max_claims:
                    break
            inv.signals.scan_contacts(inv.contacts, inv.entities["company"] or None)
            run.emit("entities", entities=inv.entities, claims=inv.claims)

    # ── 2. Web research ──────────────────────────────────────────────────────
