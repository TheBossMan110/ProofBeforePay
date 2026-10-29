"use client";

import { ArrowRight, CircleCheck, CircleQuestionMark, CircleX, Copy, ListTree, ScanText, Search } from "lucide-react";
import type { ReactNode } from "react";
import { TierBadge } from "@/components/ui";
import { cx } from "@/lib/cx";
import type { StageKey } from "@/types";

/** Small illustrated screens for each pipeline step, using the made-up "Orvel Logistics" message from the hero. */
function Frame({ name, badge, children }: { name: string; badge?: ReactNode; children: ReactNode }) {
  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3">
        <span className="flex items-center gap-2">
          <span className="flex gap-1.5" aria-hidden>
            <span className="size-2 rounded-full bg-white/10" />
            <span className="size-2 rounded-full bg-white/10" />
            <span className="size-2 rounded-full bg-white/10" />
          </span>
          <span className="ml-2 font-mono text-[11px] text-bone-500">{name}</span>
        </span>
        {badge}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Row({ k, v, tone, i }: { k: string; v: string; tone?: string; i: number }) {
  return (
    <div className="flex animate-fade-up items-center justify-between gap-4 border-b border-white/[0.05] py-2 last:border-0" style={{ animationDelay: `${0.15 + i * 0.08}s` }}>
      <span className="font-mono text-[11px] text-bone-500">{k}</span>
      <span className={cx("text-right text-sm", tone ?? "text-bone-100")}>{v}</span>
    </div>
  );
}

function Intake() {
  return (
    <Frame name="intake · nemotron-nano" badge={<TierBadge tier="nano" />}>
      <p className="rounded-xl bg-black/25 p-3 text-[13px] leading-relaxed text-bone-400">
        “…remote data entry role at <span className="text-caution-300">$45/hr</span>. We&apos;ll{" "}
        <span className="text-stop-300">mail you a check for equipment</span>…”
      </p>
      <div className="mt-4">
        {[
          ["company", "Orvel Logistics"],
          ["role", "Remote data entry"],
          ["pay", "$45/hr", "text-caution-300"],
          ["channel", "Telegram"],
          ["asks you to", "Deposit a check, buy a laptop", "text-stop-300"],
          ["claims found", "4"],
        ].map(([k, v, tone], i) => (
          <Row key={k} k={k ?? ""} v={v ?? ""} tone={tone} i={i} />
        ))}
      </div>
    </Frame>
  );
}

function Research() {
  const rows = [
    { icon: Search, kind: "search", q: "Orvel Logistics official website", r: "orvel.com" },
    { icon: Search, kind: "search", q: "Orvel Logistics recruitment scam warning", r: "3 results" },
    { icon: ScanText, kind: "exact", q: "“mail you a check for equipment”", r: "2 matches" },
    { icon: ListTree, kind: "crawl", q: "orvel.com/careers", r: "14 pages" },
  ];
  return (
    <Frame name="research · tavily" badge={<span className="rounded-full bg-white/[0.05] px-2 py-0.5 font-mono text-[10.5px] text-bone-300">Tavily</span>}>
      <ul className="space-y-2.5">
        {rows.map(({ icon: Icon, kind, q, r }, i) => (
          <li key={q} className="flex animate-fade-up items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2.5" style={{ animationDelay: `${0.1 + i * 0.12}s` }}>
            <Icon className="size-4 shrink-0 text-bone-400" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] text-bone-100">{q}</span>
              <span className="font-mono text-[10.5px] text-bone-600">{kind}</span>
            </span>
            <span className="shrink-0 font-mono text-[11px] text-brand-300">{r}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-bone-500">No “data entry” role on the official careers pages.</p>
    </Frame>
  );
}

function Forensics() {
  const domains = [
    { d: "orvel.com", age: "Registered 2009", years: 1, tone: "bg-brand-400", note: "Official site" },
    { d: "orvel-careers.co", age: "Registered 9 days ago", years: 0.02, tone: "bg-stop-400", note: "Sender's domain" },
  ];
  return (
    <Frame name="forensics · rdap" badge={<span className="rounded-full bg-white/[0.05] px-2 py-0.5 font-mono text-[10.5px] text-bone-300">RDAP</span>}>
      <ul className="space-y-5">
        {domains.map((x, i) => (
          <li key={x.d} className="animate-fade-up" style={{ animationDelay: `${0.15 + i * 0.15}s` }}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-mono text-sm text-bone-50">{x.d}</span>
              <span className="text-[11px] text-bone-500">{x.note}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <div className={cx("h-full origin-left rounded-full", x.tone)} style={{ width: `${Math.max(2, x.years * 100)}%` }} />
            </div>
            <p className="mt-1.5 font-mono text-[11px] text-bone-400">{x.age}</p>
          </li>
        ))}
      </ul>
      <div className="mt-5 rounded-xl border border-stop-500/25 bg-stop-500/[0.06] px-3 py-2.5 text-[13px] text-stop-200">
        The sender&apos;s domain doesn&apos;t match orvel.com and is brand new.
      </div>
    </Frame>
  );
}

function Verify() {
  return (
    <Frame name="verify · nano → super" badge={<TierBadge tier="super" />}>
      <p className="text-[13px] text-bone-100">“Lena Hart is a recruiter at Orvel Logistics.”</p>
      <div className="mt-4 space-y-2.5">
        <div className="flex animate-fade-up items-center gap-3 rounded-xl border border-caution-400/20 bg-caution-400/[0.04] px-3 py-2.5" style={{ animationDelay: "0.1s" }}>
          <CircleQuestionMark className="size-4 text-caution-300" aria-hidden />
          <span className="flex-1 text-[13px] text-caution-200">Inconclusive · 52% sure</span>
          <TierBadge tier="nano" prefix="" className="text-[10px]" />
        </div>
        <div className="flex items-center gap-2 pl-4 font-mono text-[10.5px] text-bone-500">
          <ArrowRight className="size-3 rotate-90" aria-hidden /> unsure, so escalated with a fresh search
        </div>
        <div className="flex animate-fade-up items-center gap-3 rounded-xl border border-stop-500/25 bg-stop-500/[0.05] px-3 py-2.5" style={{ animationDelay: "0.45s" }}>
          <CircleX className="size-4 text-stop-300" aria-hidden />
          <span className="flex-1 text-[13px] text-stop-200">Contradicted · 86% sure</span>
          <TierBadge tier="super" prefix="" className="text-[10px]" />
        </div>
      </div>
      <blockquote className="mt-4 animate-fade-up rounded-lg border-l-2 border-white/10 bg-black/25 px-3 py-2 text-xs text-bone-300" style={{ animationDelay: "0.7s" }}>
        “We never ask candidates to buy equipment or deposit checks.”{" "}
        <span className="font-mono text-[10.5px] text-brand-300">S4</span>
      </blockquote>
    </Frame>
  );
}

function Judge() {
  return (
    <Frame name="judge · nemotron-ultra" badge={<TierBadge tier="ultra" />}>
      <div className="rounded-xl bg-black/30 p-4 font-mono text-[12px] leading-relaxed text-bone-400">
        <p className="animate-fade-up">The sender writes from a domain registered 9 days ago [F4] that isn&apos;t orvel.com.</p>
        <p className="mt-2 animate-fade-up" style={{ animationDelay: "0.3s" }}>
          The equipment-check request matches a known fake-check pattern [F1], and Orvel says it never does this [C1, S4].
        </p>
        <p className="mt-2 animate-fade-up" style={{ animationDelay: "0.6s" }}>
          Nothing ties Lena Hart to the company<span className="ml-0.5 inline-block h-3 w-1.5 animate-caret bg-brand-400 align-middle" />
        </p>
      </div>
      <div className="mt-4 flex animate-fade-up items-center justify-between rounded-xl border border-stop-500/30 bg-stop-500/[0.06] px-4 py-3" style={{ animationDelay: "0.9s" }}>
        <span className="text-xl font-semibold tracking-[-0.03em] text-stop-300">Stop.</span>
        <span className="font-mono text-[11px] text-bone-400">confidence 94</span>
      </div>
    </Frame>
  );
}

function Challenge() {
  return (
    <Frame name="challenge · nemotron-super" badge={<TierBadge tier="super" />}>
      <p className="font-mono text-[11px] tracking-[0.1em] text-bone-500 uppercase">Trying to prove “Stop” wrong</p>
      <div className="mt-3 space-y-2">
        {["Lena Hart Orvel Logistics recruiter", "orvel.com careers remote data entry"].map((q, i) => (
          <div
            key={q}
            className="flex animate-fade-up items-center gap-2.5 rounded-lg bg-black/25 px-3 py-2 text-[13px] text-bone-300"
            style={{ animationDelay: `${0.1 + i * 0.15}s` }}
          >
            <Search className="size-3.5 shrink-0 text-sand-300" aria-hidden />
            <span className="truncate">{q}</span>
          </div>
        ))}
      </div>
      <p className="mt-4 animate-fade-up rounded-xl border border-white/[0.06] bg-black/25 p-3 text-[13px] leading-relaxed text-bone-300" style={{ animationDelay: "0.45s" }}>
        <span className="text-bone-500">Best case against it: </span>a new recruiter might not be listed yet. Weak, because Orvel says it never sends
        equipment checks <span className="font-mono text-[10.5px] text-brand-300">S4</span>.
      </p>
      <div className="mt-3 flex animate-fade-up items-center gap-2 rounded-xl border border-caution-400/25 bg-caution-400/[0.05] px-3 py-2.5 text-[12.5px] text-bone-200" style={{ animationDelay: "0.65s" }}>
        <span className="min-w-0 flex-1">If Lena Hart is listed on orvel.com</span>
        <ArrowRight className="size-3.5 shrink-0 text-bone-500" aria-hidden />
        <span className="shrink-0 font-medium text-caution-300">Verify first</span>
      </div>
      <div className="mt-4 flex animate-fade-up items-center justify-between rounded-xl border border-stop-500/30 bg-stop-500/[0.06] px-4 py-3" style={{ animationDelay: "0.85s" }}>
        <span className="text-sm font-semibold text-stop-300">Verdict holds · Stop</span>
        <span className="font-mono text-[11px] text-bone-400">2 models agree</span>
      </div>
    </Frame>
  );
}

function Brief() {
  return (
    <Frame name="brief · nemotron-nano" badge={<TierBadge tier="nano" />}>
      <p className="text-[11px] text-bone-500">
        Subject: <span className="text-bone-100">Quick check before we continue</span>
      </p>
      <p className="mt-3 rounded-xl border border-white/[0.05] bg-black/25 p-4 text-[13px] leading-relaxed text-bone-300">
        Hi Lena, thanks for reaching out. Before we go further, could you email me from your orvel.com address and send the link to this
        role on Orvel&apos;s careers page? I&apos;m happy to do a video interview.
      </p>
      <div className="mt-4 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs text-brand-300">
          <CircleCheck className="size-3.5" aria-hidden /> Shares nothing about you
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-bone-200 ring-1 ring-white/10 ring-inset">
          <Copy className="size-3.5" aria-hidden /> Copy reply
        </span>
      </div>
    </Frame>
  );
}

const VISUALS: Record<StageKey, () => ReactNode> = {
  intake: Intake,
  research: Research,
  forensics: Forensics,
  verify: Verify,
  judge: Judge,
  challenge: Challenge,
  brief: Brief,
};

export function StageVisual({ stage }: { stage: StageKey }) {
  const Visual = VISUALS[stage];
  return <Visual />;
}
