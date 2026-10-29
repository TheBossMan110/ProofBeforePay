"use client";

import { ArrowUpRight } from "lucide-react";
import { useRef, useState } from "react";
import { Ticker } from "@/components/motion/interactive";
import { Reveal, TextScrub } from "@/components/motion/reveal";
import { cx } from "@/lib/cx";
import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";
import { FTC_URL } from "@/lib/site";
import { SectionHeading } from "@/components/marketing/Section";

// FTC press release, March 2025: reported losses to job and fake-employment-agency scams.
const BARS = [
  { year: "2020", value: 90, label: "$90M" },
  { year: "2024", value: 501, label: "$501M" },
];
const MAX = 501;
const CHART_HEIGHT = 260;

/** Two bars, one series: the same hue for both, labelled directly, with a hover readout. */
function LossChart() {
  const root = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  useGSAP(
    () => {
      gsap.matchMedia().add(MOTION_OK, () => {
        gsap.from("[data-bar]", {
          scaleY: 0,
          transformOrigin: "bottom",
          duration: 1.8,
          ease: "expo.out",
          stagger: 0.18,
          scrollTrigger: { trigger: root.current, start: "top 82%", once: true },
        });
        gsap.from("[data-bar-label]", {
          autoAlpha: 0,
          y: 10,
          duration: 0.9,
          delay: 0.6,
          stagger: 0.18,
          scrollTrigger: { trigger: root.current, start: "top 82%", once: true },
        });
      });
    },
    { scope: root },
  );

  return (
    <figure ref={root} className="w-full">
      <div className="relative flex items-end justify-center gap-6 border-b border-white/15 sm:gap-10" style={{ height: CHART_HEIGHT + 36 }}>
        {BARS.map((bar, i) => (
          <button
            key={bar.year}
            type="button"
            onPointerEnter={() => setHover(i)}
            onPointerLeave={() => setHover(null)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            className="group relative flex w-24 flex-col items-center justify-end focus-visible:outline-offset-8 sm:w-28"
            style={{ height: CHART_HEIGHT + 36 }}
            aria-label={`${bar.year}: ${bar.label} reported lost`}
          >
            <span data-bar-label className="mb-2 text-lg font-semibold tracking-[-0.02em] text-bone-50">
              {bar.label}
            </span>
            <span
              data-bar
              className={cx(
                "block w-full rounded-t-[4px] bg-stop-400 transition-[filter,opacity] duration-300",
                hover !== null && hover !== i ? "opacity-45" : "opacity-90",
                hover === i && "brightness-110",
              )}
              style={{ height: Math.max(4, (bar.value / MAX) * CHART_HEIGHT) }}
            />
            {hover === i && (
              <span className="glass absolute -top-2 left-1/2 z-10 -translate-x-1/2 -translate-y-full rounded-lg px-3 py-2 text-left text-xs whitespace-nowrap shadow-xl">
                <span className="block font-mono text-[10px] text-bone-500">{bar.year}</span>
                <span className="text-bone-50">{bar.label}</span> <span className="text-bone-400">reported lost</span>
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="mt-3 flex justify-center gap-6 sm:gap-10">
        {BARS.map((bar) => (
          <span key={bar.year} className="w-24 text-center font-mono text-xs text-bone-500 sm:w-28">
            {bar.year}
          </span>
        ))}
      </div>
      <figcaption className="mt-4 text-center text-xs text-bone-500">Reported losses to job and fake-employment-agency scams, US</figcaption>
      <table className="sr-only">
        <caption>Reported losses to job scams in the US</caption>
        <tbody>
          {BARS.map((bar) => (
            <tr key={bar.year}>
              <th scope="row">{bar.year}</th>
              <td>{bar.label}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

export function StatSection() {
  return (
    <section className="relative overflow-hidden py-28 sm:py-36">
      <div className="pointer-events-none absolute top-1/3 -left-40 size-[38rem] rounded-full bg-stop-500/[0.06] blur-[140px]" aria-hidden />
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading index="02" label="Why it matters" title="Fake jobs are a half-billion-dollar problem." />

        <div className="mt-16 grid items-end gap-16 lg:grid-cols-[1.15fr_0.85fr]">
          <Reveal>
            <p className="text-sm text-bone-400">Lost to job scams in the US in 2024, as reported to the FTC</p>
            <p className="mt-3 text-[clamp(5rem,14vw,12rem)] leading-[0.82] font-semibold tracking-[-0.065em] text-bone-50">
              $<Ticker from={90} value={501} duration={2.4} />M
            </p>
            <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px] text-bone-300">
              <span className="rounded-md bg-stop-500/10 px-2 py-0.5 font-medium text-stop-300 ring-1 ring-stop-500/25 ring-inset">
                ↑ $411M since 2020
              </span>
              Reports nearly tripled over the same four years.
            </p>
            <a
              href={FTC_URL}
              target="_blank"
              rel="noreferrer"
              className="group mt-6 inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.12em] text-bone-500 uppercase transition-colors hover:text-bone-100"
            >
              Source: FTC, March 2025
              <ArrowUpRight className="size-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
            </a>
          </Reveal>
          <Reveal delay={0.1}>
            <LossChart />
          </Reveal>
        </div>

        <TextScrub
          className="mt-28 max-w-5xl text-[clamp(1.6rem,3.3vw,2.9rem)] leading-[1.15] font-medium tracking-[-0.035em] text-bone-50"
          text="Scammers don't need you to believe everything. They need *one small step:* reply on Telegram, deposit the check, buy the laptop. ProofBeforePay checks the offer before you take it."
        />
      </div>
    </section>
  );
}
