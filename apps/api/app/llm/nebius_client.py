"""Tiered Nemotron routing on Nebius Token Factory (OpenAI-compatible API) with per-call telemetry.

Ultra does the single heavy reasoning pass, Super plans the research and settles escalated
fact-checks, and Nano takes every fast extraction / first-pass call. Every call is metered so the UI
can show real spend against an all-Ultra baseline.
"""
from __future__ import annotations

import logging
import time
from typing import TYPE_CHECKING, Any

import httpx
from openai import APIError, AsyncOpenAI, BadRequestError, NotFoundError

from ..core.config import Settings, Tier
from .output_parser import extract_json, strip_think

if TYPE_CHECKING:
    from ..agent.state import Run

logger = logging.getLogger("proofbeforepay.llm")

FALLBACK = {"ultra": "super", "super": "nano", "nano": "super"}
_EXCLUDE = ("omni", "-vl", "embed", "reward", "guard", "safety", "parse", "retriev", "rerank")
_REPAIR_PROMPT = (
    "You repair malformed JSON. Return only the corrected JSON value, with no commentary. "
    "Keep every field and value from the input; fix only syntax."
)


class LLMError(RuntimeError):
    """A model call failed in a way the pipeline should surface to the user."""


class _ModelUnavailable(Exception):
    pass


def _estimate_tokens(text: str) -> int:
    return max(1, len(text) // 4)


def _model_missing(exc: APIError) -> bool:
    message = str(exc).lower()
    return "model" in message and any(s in message for s in ("not found", "does not exist", "unknown", "not available"))


class ThinkSplitter:
    """Classifies a content stream into thinking/answer segments around <think> tags, across chunk borders."""

    _TAGS = ("<think>", "</think>")

    def __init__(self) -> None:
        self.buffer = ""
        self.in_think = False

    @property
    def kind(self) -> str:
        return "thinking" if self.in_think else "content"

    def feed(self, text: str) -> list[tuple[str, str]]:
        self.buffer += text
        out: list[tuple[str, str]] = []
        while True:
            tag = self._TAGS[1] if self.in_think else self._TAGS[0]
            idx = self.buffer.find(tag)
            if idx == -1:
                break
            if idx:
                out.append((self.kind, self.buffer[:idx]))
            self.buffer = self.buffer[idx + len(tag) :]
            self.in_think = not self.in_think
        hold = max(
            (k for tag in self._TAGS for k in range(1, len(tag)) if self.buffer.endswith(tag[:k])),
            default=0,
        )
        ready = self.buffer[: len(self.buffer) - hold]
        if ready:
            out.append((self.kind, ready))
        self.buffer = self.buffer[len(self.buffer) - hold :]
        return out

    def flush(self) -> list[tuple[str, str]]:
        out = [(self.kind, self.buffer)] if self.buffer else []
        self.buffer = ""
        return out


class _StreamRelay:
    """Batches token deltas into ~160-char events so the UI animates smoothly without flooding the log."""

    def __init__(self, run: Run, step: str, tier: str, enabled: bool) -> None:
        self.run, self.step, self.tier, self.enabled = run, step, tier, enabled
        self.kind: str | None = None
        self.pending = ""
        self.last_flush = time.monotonic()

    def push(self, kind: str, text: str) -> None:
        if not self.enabled or not text:
            return
        if kind != self.kind:
            self.flush()
            self.kind = kind
        self.pending += text
        if len(self.pending) >= 160 or time.monotonic() - self.last_flush >= 0.15:
            self.flush()

    def flush(self) -> None:
        if self.pending:
            self.run.emit("stream", step=self.step, tier=self.tier, kind=self.kind, text=self.pending)
            self.pending = ""
        self.last_flush = time.monotonic()


class LLMRouter:
    def __init__(self, settings: Settings) -> None:
        self.tiers: dict[str, Tier] = settings.tiers
        self.client = AsyncOpenAI(
            api_key=settings.nebius_api_key or "not-configured",
            base_url=settings.nebius_base_url,
            timeout=httpx.Timeout(300.0, connect=15.0),
            max_retries=2,
        )
        self.catalog: list[str] = []
        self._unavailable: set[str] = set()
        self._plain_only: set[str] = set()

    async def resolve_models(self) -> None:
        """Match configured tiers against the live catalog, picking the closest Nemotron if an ID moved."""
        page = await self.client.models.list()
        ids = [m.id for m in page.data]
        self.catalog = [i for i in ids if "nemotron" in i.lower() and not any(x in i.lower() for x in _EXCLUDE)]
        for tier in self.tiers.values():
            if tier.model in ids:
                continue
            candidates = sorted((i for i in self.catalog if tier.name in i.lower()), key=len)
            if candidates:
                logger.warning("%s not in catalog; using %s for the %s tier", tier.model, candidates[0], tier.name)
                tier.model = candidates[0]
            else:
                logger.warning("No Nemotron %s model in catalog; calls will reroute to %s", tier.name, FALLBACK[tier.name])
                self._unavailable.add(tier.name)

    async def complete(
        self,
        run: Run,
        *,
        tier: str,
        step: str,
        messages: list[dict[str, str]],
        max_tokens: int = 1500,
        temperature: float = 0.2,
        json_mode: bool = False,
        thinking: bool = False,
        stream: bool = False,
    ) -> str:
        requested = tier
        if tier in self._unavailable:
            tier = FALLBACK[tier]
        try:
            return await self._call(run, tier, requested, step, messages, max_tokens, temperature, json_mode, thinking, stream)
        except _ModelUnavailable:
            if tier != requested:
                raise LLMError(f"No model available for the {requested} tier") from None
            self._unavailable.add(tier)
            fallback = FALLBACK[tier]
            run.emit(
                "log",
                stage=step.split(":")[0],
                level="warn",
                message=f"{self.tiers[tier].model} is unavailable, rerouting to {self.tiers[fallback].label}",
            )
            try:
                return await self._call(run, fallback, requested, step, messages, max_tokens, temperature, json_mode, thinking, stream)
            except _ModelUnavailable:
                raise LLMError(f"No model available for the {requested} tier") from None

    async def complete_json(self, run: Run, *, tier: str, step: str, messages: list[dict[str, str]], **kwargs: Any) -> Any:
        kwargs.setdefault("json_mode", True)
        text = await self.complete(run, tier=tier, step=step, messages=messages, **kwargs)
        try:
            return extract_json(text)
        except ValueError:
            run.emit("log", stage=step.split(":")[0], level="warn", message="Malformed JSON, repairing with Nano")
            repaired = await self.complete(
                run,
                tier="nano",
                step=f"{step}:repair",
                messages=[{"role": "system", "content": _REPAIR_PROMPT}, {"role": "user", "content": text[-30000:]}],
                max_tokens=8000,
                json_mode=True,
            )
            return extract_json(repaired)

    async def _call(
        self,
        run: Run,
        tier_name: str,
        requested: str,
        step: str,
        messages: list[dict[str, str]],
        max_tokens: int,
        temperature: float,
        json_mode: bool,
        thinking: bool,
        stream: bool,
    ) -> str:
        tier = self.tiers[tier_name]
        kwargs: dict[str, Any] = {
            "model": tier.model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "stream": True,
        }
        if tier.model not in self._plain_only:
            kwargs["stream_options"] = {"include_usage": True}
            if json_mode:
                kwargs["response_format"] = {"type": "json_object"}
            if not thinking:
                kwargs["extra_body"] = {"chat_template_kwargs": {"enable_thinking": False}}

        started = time.monotonic()
        try:
            response = await self.client.chat.completions.create(**kwargs)
        except NotFoundError as exc:
            raise _ModelUnavailable from exc
        except BadRequestError as exc:
            if _model_missing(exc):
                raise _ModelUnavailable from exc
            if tier.model in self._plain_only:
                raise LLMError(f"{tier.label} rejected the request: {exc.message}") from exc
            # Optional extensions (usage streaming, JSON mode, thinking toggle) are not universal; retry without them.
            self._plain_only.add(tier.model)
            for key in ("stream_options", "response_format", "extra_body"):
                kwargs.pop(key, None)
            try:
                response = await self.client.chat.completions.create(**kwargs)
            except APIError as retry_exc:
                raise LLMError(f"{tier.label} request failed: {retry_exc}") from retry_exc
        except APIError as exc:
            raise LLMError(f"{tier.label} request failed: {exc}") from exc

        relay = _StreamRelay(run, step, tier_name, stream)
        splitter = ThinkSplitter()
        content: list[str] = []
        reasoning: list[str] = []
        usage = None
        first_token: float | None = None
        finish_reason = None
        try:
            async for chunk in response:
                if getattr(chunk, "usage", None):
                    usage = chunk.usage
                if not chunk.choices:
                    continue
                choice = chunk.choices[0]
                finish_reason = choice.finish_reason or finish_reason
                delta = choice.delta
                trace = getattr(delta, "reasoning_content", None) or getattr(delta, "reasoning", None)
                if trace:
                    first_token = first_token or time.monotonic()
                    reasoning.append(trace)
                    relay.push("thinking", trace)
                if delta.content:
                    first_token = first_token or time.monotonic()
                    content.append(delta.content)
                    for kind, segment in splitter.feed(delta.content):
                        relay.push(kind, segment)
            for kind, segment in splitter.flush():
                relay.push(kind, segment)
        except (APIError, httpx.HTTPError) as exc:
            raise LLMError(f"{tier.label} stream interrupted: {exc}") from exc
        finally:
            relay.flush()

        raw = "".join(content)
        text = strip_think(raw)
        prompt_text = "".join(m["content"] for m in messages)
        prompt_tokens = getattr(usage, "prompt_tokens", None) or _estimate_tokens(prompt_text)
        completion_tokens = getattr(usage, "completion_tokens", None) or _estimate_tokens(raw + "".join(reasoning))
        run.emit(
            "llm_call",
            call={
                "step": step,
                "tier": tier_name,
                "requested_tier": requested,
                "model": tier.model,
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "latency_ms": round((time.monotonic() - started) * 1000),
                "ttft_ms": round((first_token - started) * 1000) if first_token else None,
                "cost_usd": tier.cost(prompt_tokens, completion_tokens),
                "baseline_cost_usd": self.tiers["ultra"].cost(prompt_tokens, completion_tokens),
                "estimated_usage": usage is None,
            },
        )
        if not text:
            hint = " (ran out of tokens while reasoning)" if finish_reason == "length" else ""
            raise LLMError(f"{tier.label} returned an empty answer{hint}")
        return text
