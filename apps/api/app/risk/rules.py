"""Pattern rules over message and page text. Each fires on a phrase and keeps the sentence it came from."""
from __future__ import annotations

import re
from dataclasses import dataclass

@dataclass(frozen=True)
class Rule:
    id: str
    title: str
    severity: str
    pattern: re.Pattern[str]
    why: str

def _rx(pattern: str) -> re.Pattern[str]:
    return re.compile(pattern, re.I)

RULES = (
    Rule(
        "upfront_payment",
        "Asks you to pay before you start",
        "high",
        _rx(r"\b(?:registration|training|processing|application|onboarding|certification|placement|starter|activation|security|visa)\s+(?:fee|deposit|charge|kit)s?\b"
            r"|\bpay\s+(?:a|the|an|your)\s+(?:small\s+|one[- ]time\s+)?(?:fee|deposit)\b|\brefundable\s+deposit\b"),
        "Legitimate employers do not charge candidates to get hired.",
    ),
    Rule(
        "check_equipment",
        "Fake-check / equipment purchase pattern",
        "high",
        _rx(r"\b(?:send|mail|deposit|cash)\w*\s+(?:you\s+)?(?:a\s+)?(?:check|cheque)\b|\b(?:check|cheque)\s+(?:to|for|so\s+you\s+can)\s+(?:buy|purchase)\b"
            r"|\b(?:approved|designated|preferred|certified|our)\s+vendor\b|\b(?:purchase|buy)\s+(?:your\s+|the\s+|all\s+)?(?:work\s+)?(?:equipment|laptop|software|devices?)\b"),
        "Being sent a check to buy equipment from a vendor they choose is the classic fake-check scheme.",
    ),
    Rule(
        "irreversible_payment",
        "Mentions hard-to-reverse payment methods",
        "high",
        _rx(r"\b(?:bitcoin|btc|usdt|crypto(?:currency)?|gift\s*cards?|itunes\s+cards?|western\s+union|moneygram|zelle|cash\s*app)\b"),
        "Crypto, gift cards and wire services can't be reversed, which is why fraud prefers them.",
    ),
    Rule(
        "sensitive_data",
        "Asks for sensitive personal or financial data",
        "high",
        _rx(r"\b(?:ssn|social\s+security|bank\s+(?:account|login|details|information)|routing\s+number|passport\s+(?:copy|number|scan)|cnic|credit\s+card|debit\s+card|national\s+id)\b"),
        "Bank details and ID numbers should only go to a verified employer after a written offer.",
    ),
    Rule(
        "chat_interview",
        "Interview or hiring over a chat app",
        "medium",
        _rx(r"\b(?:interview|chat|onboard\w*|hiring|recruit\w*|contact|message|text)\b[^.\n]{0,60}\b(?:telegram|whatsapp|signal\s+app|wickr|wechat|google\s+chat|hangouts)\b"
            r"|\b(?:telegram|whatsapp|wickr|wechat)\b[^.\n]{0,60}\b(?:interview|chat|onboard\w*|hiring)\b"),
        "Real companies rarely run interviews purely by text on messaging apps.",
    ),
    Rule(
        "too_easy",
        "Hiring with no screening",
        "medium",
        _rx(r"\bno\s+(?:prior\s+)?(?:experience|interview|skills?|resume|cv)\s+(?:is\s+)?(?:needed|required|necessary)\b|\b(?:hired|start)\s+(?:immediately|today|right\s+away)\b|\bwithout\s+(?:an\s+)?interview\b"),
        "Being hired without any screening is a common bait.",
    ),
    Rule(
        "prompt_injection",
        "Message contains instructions aimed at AI checkers",
        "high",
        _rx(r"\b(?:ignore|disregard|forget)\s+(?:all\s+|any\s+)?(?:(?:previous|prior|above|earlier|your|the)\s+)+(?:instructions|rules|prompts?|guidelines)\b"
            r"|\b(?:classify|mark|rate|label|treat|flag)\s+(?:this|the)\s+(?:message|email|offer|text)\s+as\s+(?:safe|legitimate|legit|genuine|verified|trusted)\b"
            r"|\b(?:ai|automated|language\s+model|llm|assistant|scanner|checker)s?\b[^.\n]{0,40}\b(?:must|should)\s+(?:classify|mark|rate|label|respond|answer|reply|output|return)\b"
            r"|\bnote\s+to\s+(?:the\s+)?(?:ai|assistants?|llms?|language\s+models?)\b"),
        "Genuine messages don't address automated checkers. Text like this tries to steer screening tools.",
    ),
    Rule(
        "pressure",
        "Pressure to act fast",
        "low",
        _rx(r"\b(?:urgent(?:ly)?|within\s+(?:\d{1,2}|twenty[- ]four|forty[- ]eight)\s+hours|asap|limited\s+(?:slots|spots|positions|seats)|act\s+now|today\s+only|before\s+(?:the\s+)?slots?\s+(?:fill|close))\b"),
        "Urgency is used to stop you from checking.",
    ),
)

def _sentence_around(text: str, start: int, end: int) -> str:
    left = max(text.rfind(ch, 0, start) for ch in ".!?\n") + 1
    rights = [i for i in (text.find(ch, end) for ch in ".!?\n") if i != -1]
    right = min(rights) + 1 if rights else len(text)
    sentence = " ".join(text[left:right].split())
    return sentence if len(sentence) <= 220 else sentence[:219] + "…"
