"use client";

import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Reveal, SplitReveal } from "@/components/motion/reveal";

/** Shared section heading: a numbered mono eyebrow, a split-reveal title and an optional lede. */
export function SectionHeading({
  index,
  label,
  title,
  lede,
  className,
  align = "left",
}: {
  index: string;
  label: string;
  title: ReactNode;
  lede?: ReactNode;
  className?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={cx("max-w-3xl", align === "center" && "mx-auto text-center", className)}>
      <Reveal y={12}>
        <p className={cx("flex items-center gap-3 font-mono text-[11px] tracking-[0.18em] text-bone-500 uppercase", align === "center" && "justify-center")}>
          <span className="text-brand-400">[{index}]</span>
          <span className="h-px w-8 bg-white/15" />
          {label}
        </p>
      </Reveal>
      <SplitReveal className="mt-5 text-[clamp(2.1rem,4.6vw,3.9rem)] leading-[1] font-semibold tracking-[-0.045em] text-balance text-bone-50">
        {title}
      </SplitReveal>
      {lede && (
        <Reveal delay={0.15} y={18}>
          <p className={cx("mt-5 max-w-2xl text-[17px] leading-relaxed text-pretty text-bone-400", align === "center" && "mx-auto")}>{lede}</p>
        </Reveal>
      )}
    </div>
  );
}

/** Serif italic accent for a word inside a heading. */
export function Accent({ children }: { children: ReactNode }) {
  return <span className="font-serif font-normal tracking-[-0.01em] text-brand-400 italic">{children}</span>;
}
