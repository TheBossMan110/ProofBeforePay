"use client";

import { ArrowRight, CircleCheck, Link2, Search, Swords, TriangleAlert, Undo2 } from "lucide-react";
import { motion } from "motion/react";
import type { Challenge, Decision, LinkCheck } from "@/types";
import { Card, CardHeader, cx, DECISION_STYLE, DecisionBadge, RefChip, RefText, SectionLabel } from "@/components/ui";

const OUTCOME = {
  holds: { label: "Verdict holds", icon: CircleCheck, chip: "bg-brand-500/10 text-brand-300 ring-brand-500/30" },
  weakened: { label: "Verdict weakened", icon: TriangleAlert, chip: "bg-caution-400/10 text-caution-300 ring-caution-400/30" },
  overturned: { label: "Verdict changed", icon: Undo2, chip: "bg-caution-400/10 text-caution-300 ring-caution-400/30" },
} as const;

/** The counter-evidence pass: what a second model found when it tried to prove the verdict wrong. */
export function ChallengePanel({ challenge, decision }: { challenge: Challenge; decision: Decision }) {
  const outcome = OUTCOME[challenge.outcome];
  const OutcomeIcon = outcome.icon;
  return (
    <Card spotlight id="challenge">
      <CardHeader
        icon={<Swords className="size-4" />}
        title="We tried to prove this wrong"
        subtitle="Nemotron Super ran its own searches against the verdict"
        right={
          <span className={cx("inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset", outcome.chip)}>
            <OutcomeIcon className="size-3.5" aria-hidden />
            {outcome.label}
          </span>
        }
      />
      <div className="space-y-6 p-5">
        {challenge.searches.length > 0 && (
          <div>
            <SectionLabel>Counter-searches</SectionLabel>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {challenge.searches.map((q, i) => (
                <motion.span
                  key={q}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="inline-flex max-w-full items-center gap-2 rounded-lg bg-black/25 px-3 py-1.5 text-[13px] text-bone-300 ring-1 ring-white/[0.06] ring-inset"
                >
                  <Search className="size-3.5 shrink-0 text-sand-300" aria-hidden />
                  <span className="truncate">{q}</span>
                </motion.span>
              ))}
              {challenge.sources.length > 0 && (
                <span className="self-center font-mono text-[11px] text-bone-500">{challenge.sources.length} pages read</span>
              )}
            </div>
          </div>
        )}

        <div>
          <SectionLabel>Best case against “{DECISION_STYLE[decision].label}”</SectionLabel>
          <p className="mt-2.5 rounded-xl border border-white/[0.06] bg-black/25 p-4 text-[15px] leading-relaxed text-bone-200">
            {challenge.strongest_counterpoint ? (
              <RefText text={challenge.strongest_counterpoint} />
            ) : (
              <span className="text-bone-400">No credible argument against this verdict turned up.</span>
            )}
          </p>
          {challenge.effect && (
            <p className="mt-3 flex items-start gap-2 rounded-xl border border-caution-400/25 bg-caution-400/[0.06] px-3 py-2.5 text-sm text-caution-200">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                <RefText text={challenge.effect} />
              </span>
            </p>
          )}
        </div>

        {challenge.would_change.length > 0 && (
          <div>
            <SectionLabel>What would change this verdict</SectionLabel>
            <ul className="mt-3 space-y-2.5">
              {challenge.would_change.map((w, i) => (
                <motion.li
                  key={w.if}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.08, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
                >
                  <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
                    <p className="min-w-0 flex-1 text-[15px] leading-snug text-bone-100">
                      <span className="text-bone-500">If </span>
                      <RefText text={w.if.replace(/^if\s+/i, "")} />
                    </p>
                    <span className="flex shrink-0 items-center gap-2">
                      <ArrowRight className="size-4 text-bone-500" aria-hidden />
                      <DecisionBadge decision={w.then} />
                    </span>
                  </div>
                  {w.check && (
                    <p className="mt-2 text-[13px] leading-relaxed text-bone-400">
                      <span className="font-medium text-bone-300">How to check: </span>
                      <RefText text={w.check} />
                    </p>
                  )}
                </motion.li>
              ))}
            </ul>
          </div>
        )}

        {(challenge.alternative_explanations.length > 0 || challenge.unresolved.length > 0) && (
          <div className="grid gap-6 md:grid-cols-2">
            {challenge.alternative_explanations.length > 0 && (
              <div>
                <SectionLabel>Other explanations that fit</SectionLabel>
                <ul className="mt-2.5 space-y-2 text-sm text-bone-300">
                  {challenge.alternative_explanations.map((a) => (
                    <li key={a} className="flex gap-2.5">
                      <span className="mt-2 size-1 shrink-0 rounded-full bg-sand-300" aria-hidden />
                      <span>
                        <RefText text={a} />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {challenge.unresolved.length > 0 && (
              <div>
                <SectionLabel>Still unknown</SectionLabel>
                <ul className="mt-2.5 space-y-2 text-sm text-bone-300">
                  {challenge.unresolved.map((u) => (
                    <li key={u} className="flex gap-2.5">
                      <span className="mt-2 size-1 shrink-0 rounded-full bg-bone-500" aria-hidden />
                      <span>
                        <RefText text={u} />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

function LinkStatus({ link }: { link: LinkCheck }) {
  const chips: { label: string; tone: string }[] = [];
  if (link.official) chips.push({ label: "Official site", tone: "bg-brand-500/10 text-brand-300 ring-brand-500/30" });
  if (link.unregistered) chips.push({ label: "Domain not registered", tone: "bg-stop-500/10 text-stop-300 ring-stop-500/30" });
  else if (!link.reachable) chips.push({ label: "Couldn't open", tone: "bg-caution-400/10 text-caution-300 ring-caution-400/30" });
  if (link.presents_as) chips.push({ label: `Uses ${link.presents_as}'s name`, tone: "bg-stop-500/10 text-stop-300 ring-stop-500/30" });
  for (const ask of link.asks_for) chips.push({ label: `Asks for ${ask.label}`, tone: "bg-stop-500/10 text-stop-300 ring-stop-500/30" });
  if (!chips.length) chips.push({ label: "Opened, nothing risky found", tone: "bg-white/[0.05] text-bone-300 ring-white/10" });
  return (
    <span className="flex flex-wrap gap-1.5">
      {chips.map((c) => (
        <span key={c.label} className={cx("rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset", c.tone)}>
          {c.label}
        </span>
      ))}
    </span>
  );
}

/** Pages the message links to, as opened by Tavily Extract (never by the user's browser or our server). */
export function LinksPanel({ links }: { links: LinkCheck[] }) {
  if (!links.length) return null;
  return (
    <Card>
      <CardHeader icon={<Link2 className="size-4" />} title="Links in the message" subtitle="Opened through Tavily, so you don't have to click them" />
      <ul className="divide-y divide-white/[0.05]">
        {links.map((link) => (
          <li key={link.url} className="space-y-2 px-5 py-4">
            <p className="flex items-start justify-between gap-3">
              <span className="min-w-0 font-mono text-[12px] break-all text-bone-200">{link.url}</span>
              {link.source_id && <RefChip id={link.source_id} />}
            </p>
            <LinkStatus link={link} />
            {link.reachable && (link.title || link.snippet) && (
              <p className="line-clamp-2 text-xs leading-relaxed text-bone-500">{link.title && link.title !== link.domain ? link.title : link.snippet}</p>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
