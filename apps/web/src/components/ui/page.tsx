"use client";

import type { LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { Ticker } from "@/components/motion/interactive";
import { cx } from "@/lib/cx";

/** Title row for app pages: an eyebrow, a headline that rises in, a line of context, and actions on the right. */
export function PageHeader({ eyebrow, title, children, actions }: { eyebrow?: string; title: ReactNode; children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
      <div className="min-w-0">
        {eyebrow && (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="font-mono text-[11px] tracking-[0.16em] text-brand-300 uppercase"
          >
            {eyebrow}
          </motion.p>
        )}
        <motion.h1
          initial={{ opacity: 0, y: 14, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mt-2 text-[clamp(1.8rem,3.4vw,2.6rem)] leading-[1.05] font-semibold tracking-[-0.045em] text-bone-50"
        >
          {title}
        </motion.h1>
        {children && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15, duration: 0.6 }} className="mt-2 max-w-2xl text-[15px] leading-relaxed text-bone-400">
            {children}
          </motion.p>
        )}
      </div>
      {actions && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }} className="flex flex-wrap items-center gap-2">
          {actions}
        </motion.div>
      )}
    </div>
  );
}

export function StatTile({
  icon: Icon,
  label,
  value,
  format,
  hint,
  index = 0,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: number | null;
  format?: (n: number) => string;
  hint?: ReactNode;
  index?: number;
  tone?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 * index, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="panel group relative overflow-hidden p-5"
    >
      <div className="pointer-events-none absolute -top-10 -right-10 size-32 rounded-full bg-brand-500/[0.07] blur-2xl transition-opacity duration-700 group-hover:opacity-100 md:opacity-0" aria-hidden />
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-bone-400">{label}</p>
        <Icon className="size-4 text-bone-600 transition-colors group-hover:text-brand-300" aria-hidden />
      </div>
      <p className={cx("mt-3 text-[2rem] leading-none font-semibold tracking-[-0.04em] text-bone-50 tabular-nums", tone)}>
        {value === null ? "—" : <Ticker value={value} format={format} duration={1.2} />}
      </p>
      {hint && <p className="mt-2 text-xs text-bone-500">{hint}</p>}
    </motion.div>
  );
}

export function EmptyState({ icon: Icon, title, children, action }: { icon: LucideIcon; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-white/[0.09] px-6 py-14 text-center">
      <motion.span
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        className="grid size-14 place-items-center rounded-2xl border border-white/[0.08] bg-white/[0.03] text-bone-400"
      >
        <Icon className="size-6" aria-hidden />
      </motion.span>
      <p className="mt-4 text-lg font-semibold tracking-[-0.02em] text-bone-50">{title}</p>
      {children && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-bone-400">{children}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
