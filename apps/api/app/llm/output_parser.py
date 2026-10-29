"""Tolerant JSON extraction for model output (reasoning traces, code fences, trailing commas)."""
from __future__ import annotations

import json
import re
from typing import Any

_FENCE = re.compile(r"```(?:json)?\s*(.*?)```", re.S | re.I)
_TRAILING_COMMA = re.compile(r",\s*([}\]])")


def strip_think(text: str) -> str:
    """Drop an inline <think>…</think> trace; some chat templates emit only the closing tag."""
    if "</think>" in text:
        text = text.rsplit("</think>", 1)[1]
    return text.replace("<think>", "").strip()


def _loads(candidate: str) -> Any:
    try:
        return json.loads(candidate)
    except json.JSONDecodeError:
        return json.loads(_TRAILING_COMMA.sub(r"\1", candidate))


def extract_json(text: str) -> Any:
    """Return the first JSON object/array found in model output, or raise ValueError."""
    text = strip_think(text)
    candidates = [m.strip() for m in _FENCE.findall(text)]
    for open_ch, close_ch in (("{", "}"), ("[", "]")):
        start, end = text.find(open_ch), text.rfind(close_ch)
        if start != -1 and end > start:
            candidates.append(text[start : end + 1])
    candidates.append(text)
    for candidate in candidates:
        try:
            return _loads(candidate)
        except (json.JSONDecodeError, ValueError):
            continue
    raise ValueError("No valid JSON found in model output")
