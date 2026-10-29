"use client";

import { ShieldAlert } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { Polarity, Signal } from "@/types";
import { Card, CardHeader, cx, POLARITY_STYLE, Spinner } from "@/components/ui";

const POLARITY_ORDER: Record<Polarity, number> = { red: 0, amber: 1, green: 2 };
const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 } as const;
const ENTER = { opacity: 0, x: -14, filter: "blur(6px)" };
const SHOWN = { opacity: 1, x: 0, filter: "blur(0px)" };

export function SignalList({
  signals,
  sorted = false,
  waiting = false,
  compact = false,
}: {
  signals: Signal[];
  sorted?: boolean;
  waiting?: boolean;
  compact?: boolean;
}) {
  const items = sorted
    ? [...signals].sort((a, b) => POLARITY_ORDER[a.polarity] - POLARITY_ORDER[b.polarity] || SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
    : signals;
  const counts = (["red", "amber", "green"] as const).map((p) => [p, signals.filter((s) => s.polarity === p).length] as const);
  return (
    <Card>
      <CardHeader
        icon={<ShieldAlert className="size-4" />}
        title="Hard signals"
        subtitle="Found by code: message patterns, domain registry records, official-site matching"
        right={
          <div className="flex shrink-0 items-center gap-2.5">
            {counts.map(([polarity, count]) => (
              <span key={polarity} className="flex items-center gap-1 font-mono text-xs text-bone-400" title={POLARITY_STYLE[polarity].label}>
                <span className={cx("size-2 rounded-full", POLARITY_STYLE[polarity].dot)} />
                {count}
              </span>
            ))}
          </div>
        }
      />
      <ul className="grid gap-2 p-3">
        <AnimatePresence initial={!sorted}>
          {items.map((signal, index) => (
            <motion.li
              key={signal.id}
              id={`ref-${signal.id}`}
              layout
              initial={ENTER}
              animate={SHOWN}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: sorted ? index * 0.04 : 0 }}
              className={cx("scroll-mt-28 rounded-xl border px-4", compact ? "py-2.5" : "py-3", POLARITY_STYLE[signal.polarity].card)}
            >
              <div className="flex items-start gap-3">
                <span className={cx("mt-1.5 size-2 shrink-0 rounded-full", POLARITY_STYLE[signal.polarity].dot)} aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-mono text-[10.5px] text-bone-500">{signal.id}</span>
                    <p className={cx("text-sm font-semibold", POLARITY_STYLE[signal.polarity].text)}>{signal.title}</p>
                    {signal.severity === "high" && signal.polarity === "red" && (
                      <span className="rounded-md bg-stop-500/15 px-1.5 py-px text-[10px] font-semibold tracking-wide text-stop-300 uppercase">
                        High risk
                      </span>
                    )}
                  </div>
                  <p className={cx("mt-1 text-sm break-words text-bone-300", compact && "line-clamp-1")}>{signal.detail}</p>
                  {signal.why && !compact && <p className="mt-1 text-xs text-bone-500">{signal.why}</p>}
                </div>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
        {waiting && (
          <li className="relative flex items-center gap-2 overflow-hidden rounded-xl border border-dashed border-white/[0.08] px-4 py-3 text-sm text-bone-500">
            <span className="scan-line absolute inset-x-0 bottom-0 h-px" aria-hidden />
            <Spinner className="size-3.5" /> Looking for more signals…
          </li>
        )}
        {!waiting && items.length === 0 && (
          <li className="rounded-xl border border-dashed border-white/[0.08] px-4 py-3 text-sm text-bone-500">
            No hard signals were triggered for this message.
          </li>
        )}
      </ul>
    </Card>
  );
}
