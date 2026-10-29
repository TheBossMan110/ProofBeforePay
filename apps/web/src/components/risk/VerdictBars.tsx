"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { DECISION_STYLE } from "@/components/ui";
import type { Decision } from "@/types";

const ORDER: Decision[] = ["PROCEED", "VERIFY_FIRST", "STOP"];
const FILL: Record<Decision, string> = { PROCEED: "bg-brand-400", VERIFY_FIRST: "bg-caution-400", STOP: "bg-stop-400" };

/**
 * How many checks ended in each decision. One bar per decision, each labelled with its name, icon and count, so
 * the colour is never the only cue; hovering a bar shows its share. A visually hidden table carries the same numbers.
 */
export function VerdictBars({ counts }: { counts: Partial<Record<Decision, number>> }) {
  const [hover, setHover] = useState<Decision | null>(null);
  const total = ORDER.reduce((n, d) => n + (counts[d] ?? 0), 0);
  const max = Math.max(1, ...ORDER.map((d) => counts[d] ?? 0));

  return (
    <div>
      <ul className="space-y-3.5" aria-hidden>
        {ORDER.map((d, i) => {
          const n = counts[d] ?? 0;
          const style = DECISION_STYLE[d];
          const Icon = style.icon;
          return (
            <li key={d} className="relative" onPointerEnter={() => setHover(d)} onPointerLeave={() => setHover(null)}>
              <div className="mb-1.5 flex items-center justify-between text-[13px]">
                <span className="flex items-center gap-1.5 text-bone-300">
                  <Icon className={`size-3.5 ${style.text}`} />
                  {style.label}
                </span>
                <span className="font-mono text-bone-100 tabular-nums">{n}</span>
              </div>
              <div className="h-2 rounded-full bg-white/[0.05]">
                <motion.div
                  className={`h-full rounded-full ${FILL[d]}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${(n / max) * 100}%` }}
                  transition={{ delay: 0.15 + i * 0.1, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                  style={{ minWidth: n ? 6 : 0 }}
                />
              </div>
              {hover === d && total > 0 && (
                <motion.span
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute -top-8 right-0 rounded-lg border border-white/[0.1] bg-ink-850 px-2.5 py-1 font-mono text-[11px] text-bone-100 shadow-lg"
                >
                  {n} of {total} · {Math.round((n / total) * 100)}%
                </motion.span>
              )}
            </li>
          );
        })}
      </ul>
      <table className="sr-only">
        <caption>Checks by decision</caption>
        <tbody>
          {ORDER.map((d) => (
            <tr key={d}>
              <th scope="row">{DECISION_STYLE[d].label}</th>
              <td>{counts[d] ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
