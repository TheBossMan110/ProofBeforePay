"use client";

import { Cpu, Globe } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Ticker } from "@/components/motion/interactive";
import { duration, shortModel, tokens, usd } from "@/lib/formatters";
import type { LlmCall, TierName } from "@/types";
import { Card, CardHeader, cx, TIER_STYLE, TierBadge } from "@/components/ui";

const TIERS: TierName[] = ["ultra", "super", "nano"];

export interface TavilySummary {
  calls: number;
  credits: number;
  byKind: Record<string, number>;
}

/** Which Nemotron tier did what, and what it cost against sending every call to Ultra. */
export function RoutingPanel({ calls, tavily, live = false }: { calls: LlmCall[]; tavily: TavilySummary; live?: boolean }) {
  const totals = TIERS.map((tier) => {
    const tierCalls = calls.filter((c) => c.tier === tier);
    return {
      tier,
      model: tierCalls[0]?.model,
      calls: tierCalls.length,
      tokens: tierCalls.reduce((sum, c) => sum + c.prompt_tokens + c.completion_tokens, 0),
      cost: tierCalls.reduce((sum, c) => sum + c.cost_usd, 0),
      latency: tierCalls.reduce((sum, c) => sum + c.latency_ms, 0),
    };
  });
  const allTokens = totals.reduce((sum, t) => sum + t.tokens, 0);
  const cost = calls.reduce((sum, c) => sum + c.cost_usd, 0);
  const baseline = calls.reduce((sum, c) => sum + c.baseline_cost_usd, 0);
  const savings = baseline > 0 ? Math.max(0, (1 - cost / baseline) * 100) : 0;
  const estimated = calls.some((c) => c.estimated_usage);

  return (
    <Card spotlight>
      <CardHeader
        icon={<Cpu className="size-4" />}
        title="Model routing"
        subtitle="NVIDIA Nemotron on Nebius Token Factory"
        right={
          live && (
            <span className="flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.12em] text-brand-300 uppercase">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-400 opacity-70" />
                <span className="relative inline-flex size-1.5 rounded-full bg-brand-400" />
              </span>
              live
            </span>
          )
        }
      />
      <div className="space-y-5 p-5">
        <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-white/[0.05]" aria-label="Token share by model tier">
          {totals.map((t) => (
            <div
              key={t.tier}
              className={cx("h-full rounded-full transition-[flex-grow] duration-1000 ease-out-expo", TIER_STYLE[t.tier].bar)}
              style={{ flexGrow: t.tokens / Math.max(allTokens, 1), flexBasis: 0 }}
            />
          ))}
        </div>

        <ul className="space-y-3.5">
          {totals.map((t) => (
            <li key={t.tier} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <TierBadge tier={t.tier} />
                <p className="mt-1 truncate font-mono text-[10.5px] text-bone-600" title={t.model}>
                  {t.model ? shortModel(t.model) : roleOf(t.tier)}
                </p>
              </div>
              <div className="shrink-0 text-right font-mono text-xs">
                <p className="text-bone-100">
                  {t.calls} {t.calls === 1 ? "call" : "calls"} · {tokens(t.tokens)} tok
                </p>
                <p className="text-bone-500">
                  {usd(t.cost)}
                  {t.calls > 0 && ` · ${duration(t.latency / t.calls)} avg`}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <div className="relative overflow-hidden rounded-2xl border border-brand-500/20 bg-brand-500/[0.05] p-4">
          <div className="pointer-events-none absolute -top-10 -right-10 size-32 rounded-full bg-brand-500/20 blur-3xl" aria-hidden />
          <div className="relative flex items-end justify-between gap-3">
            <div>
              <p className="text-xs text-bone-400">Routing saved</p>
              <p className="text-4xl font-semibold tracking-[-0.04em] text-brand-300">
                <Ticker value={savings} startOnView={false} duration={1.2} format={(n) => `${n.toFixed(0)}%`} />
              </p>
            </div>
            <div className="text-right font-mono text-xs">
              <p className="text-bone-100">{usd(cost)} actual</p>
              <p className="text-bone-500 line-through decoration-bone-600">{usd(baseline)} all-Ultra</p>
            </div>
          </div>
          <p className="relative mt-2 text-[11px] leading-snug text-bone-500">
            The baseline prices the same tokens at Nemotron Ultra rates.{estimated ? " Some token counts are estimated." : ""}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
          <span className="flex items-center gap-2 text-xs text-bone-400">
            <Globe className="size-3.5" aria-hidden />
            Tavily
          </span>
          <span className="font-mono text-xs text-bone-300">
            {tavily.byKind.search ?? 0} search · {tavily.byKind.exact ?? 0} exact · {tavily.byKind.crawl ?? 0} crawl · {tavily.credits.toFixed(0)} cr
          </span>
        </div>

        {calls.length > 0 && (
          <div className="border-t border-white/[0.06] pt-4">
            <p className="mb-2 font-mono text-[10.5px] tracking-[0.16em] text-bone-600 uppercase">Recent calls</p>
            <ul className="space-y-1.5">
              <AnimatePresence initial={false}>
                {calls
                  .map((c, i) => ({ c, key: i }))
                  .slice(-6)
                  .reverse()
                  .map(({ c, key }) => (
                    <motion.li
                      key={key}
                      layout
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4 }}
                      className="flex items-center justify-between gap-2 font-mono text-[11px]"
                    >
                      <span className="flex min-w-0 items-center gap-2 text-bone-400">
                        <span className={cx("size-1.5 shrink-0 rounded-full", TIER_STYLE[c.tier].dot)} />
                        <span className="truncate">{c.step}</span>
                        {c.tier !== c.requested_tier && <span className="text-caution-300">rerouted</span>}
                      </span>
                      <span className="shrink-0 text-bone-600">
                        {tokens(c.prompt_tokens + c.completion_tokens)} · {duration(c.latency_ms)}
                      </span>
                    </motion.li>
                  ))}
              </AnimatePresence>
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}

function roleOf(tier: TierName): string {
  return { ultra: "final judgement", super: "escalated checks", nano: "extraction, first-pass checks, brief" }[tier];
}
