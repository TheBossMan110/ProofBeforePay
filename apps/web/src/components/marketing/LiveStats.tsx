"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import type { PublicStats } from "@/types";
import { Ticker } from "@/components/motion/interactive";

/** Real numbers from the checks people have run, pulled live. Hidden until there's something honest to show. */
export function LiveStats() {
  const [stats, setStats] = useState<PublicStats | null>(null);

  useEffect(() => {
    api
      .stats()
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  if (!stats || stats.checks < 1) return null;

  const items = [
    { value: stats.checks, format: (n: number) => String(Math.round(n)), label: stats.checks === 1 ? "check run" : "checks run" },
    { value: stats.avg_seconds, format: (n: number) => `${Math.round(n)}s`, label: "average time" },
    { value: stats.avg_cost_usd * 100, format: (n: number) => `${n.toFixed(1)}¢`, label: "average cost" },
    { value: stats.avg_savings_pct, format: (n: number) => `${Math.round(n)}%`, label: "cheaper than Ultra alone" },
  ].filter((item) => item.value > 0);

  return (
    <section aria-label="Live numbers" className="border-b border-white/[0.06]">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-10 gap-y-4 px-5 py-6 sm:px-8">
        <span className="flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] text-bone-500 uppercase">
          <span className="relative flex size-2">
            <span className="absolute inset-0 animate-ping rounded-full bg-brand-400/60" />
            <span className="relative size-2 rounded-full bg-brand-400" />
          </span>
          Live
        </span>
        {items.map((item) => (
          <span key={item.label} className="flex items-baseline gap-2">
            <Ticker value={item.value} format={item.format} className="text-xl font-semibold tracking-[-0.03em] text-bone-50 tabular-nums" />
            <span className="text-sm text-bone-500">{item.label}</span>
          </span>
        ))}
      </div>
    </section>
  );
}
