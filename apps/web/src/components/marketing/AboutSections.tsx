"use client";

import { ArrowUpRight, BriefcaseBusiness, Cpu, Database, GraduationCap, Mail, Palette, Search, Server, Zap } from "lucide-react";
import { GithubMark } from "@/components/layout/Logo";
import { Ticker, Tilt } from "@/components/motion/interactive";
import { Reveal, TextScrub } from "@/components/motion/reveal";
import { FTC_URL, REPO_URL } from "@/lib/site";
import { Accent, SectionHeading } from "./Section";

export function AboutStory() {
  return (
    <section className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <TextScrub
          className="text-[clamp(1.6rem,3.4vw,2.7rem)] leading-[1.18] font-semibold tracking-[-0.035em]"
          text="The recruiter writes from a domain registered last week. The company's own careers page says it never asks candidates for money. The same message is already on a scam forum. *The evidence is out there.* It just takes an hour to find, and the offer *expires tomorrow.* So we built agents that do the digging in under a minute, and show every piece of their work."
        />
      </div>
    </section>
  );
}

const NUMBERS = [
  { value: 501, format: (n: number) => `$${Math.round(n)}M`, label: "lost to job scams in the US in 2024", source: true },
  { value: 7, format: (n: number) => String(Math.round(n)), label: "steps in every check, from reading the message to arguing with the verdict" },
  { value: 3, format: (n: number) => String(Math.round(n)), label: "NVIDIA Nemotron models, each given the work that fits its size" },
  { value: 2, format: (n: number) => `${Math.round(n)}¢`, label: "in model costs for a full check, measured on every run" },
  { value: 59, format: (n: number) => `${Math.round(n)}%`, label: "cheaper than sending everything to the largest model" },
];

export function AboutNumbers() {
  return (
    <section className="relative border-y border-white/[0.06] bg-ink-900/40 py-20">
      <Reveal as="div" selector="[data-num]" stagger={0.08} className="mx-auto grid max-w-7xl gap-10 px-5 sm:grid-cols-2 sm:px-8 lg:grid-cols-5">
        {NUMBERS.map((n) => (
          <div key={n.label} data-num>
            <p className="text-[clamp(2.4rem,4vw,3.4rem)] leading-none font-semibold tracking-[-0.05em] text-bone-50 tabular-nums">
              <Ticker value={n.value} format={n.format} />
            </p>
            <p className="mt-3 text-sm leading-relaxed text-bone-400">
              {n.label}
              {n.source && (
                <>
                  {" "}
                  <a href={FTC_URL} target="_blank" rel="noreferrer" className="whitespace-nowrap text-bone-500 underline underline-offset-4 hover:text-bone-200">
                    (FTC)
                  </a>
                </>
              )}
            </p>
          </div>
        ))}
      </Reveal>
    </section>
  );
}

const AUDIENCE = [
  { icon: BriefcaseBusiness, title: "Job seekers", body: "Remote roles that pay too well, recruiters who only talk on Telegram, onboarding fees that are \"refundable\". Check before you reply." },
  { icon: Palette, title: "Freelancers", body: "Clients who overpay by cheque and ask for the difference back, or want you to buy software from their vendor. Check before you start work." },
  { icon: GraduationCap, title: "Students and first jobs", body: "The people targeted most, and the least likely to know what a real hiring process looks like. Every report explains its reasoning." },
];

export function AboutAudience() {
  return (
    <section className="relative py-28 sm:py-36">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          index="01"
          label="Who it's for"
          title={
            <>
              For anyone with a message that feels a bit <Accent>off.</Accent>
            </>
          }
        />
        <Reveal as="div" selector="[data-aud]" stagger={0.1} className="mt-14 grid gap-4 md:grid-cols-3">
          {AUDIENCE.map(({ icon: Icon, title, body }) => (
            <div key={title} data-aud>
              <Tilt max={6} className="spot panel h-full p-7">
                <span className="grid size-12 place-items-center rounded-2xl border border-white/[0.08] bg-white/[0.03] text-brand-300">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-6 text-xl font-semibold tracking-[-0.03em] text-bone-50">{title}</h3>
                <p className="mt-2.5 text-[15px] leading-relaxed text-bone-400">{body}</p>
              </Tilt>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

const STACK = [
  { icon: Cpu, name: "NVIDIA Nemotron 3", role: "Nano reads and checks, Super re-checks and challenges, Ultra weighs everything once." },
  { icon: Zap, name: "Nebius Token Factory", role: "Runs all three Nemotron models behind one OpenAI-compatible API, metered per call." },
  { icon: Search, name: "Tavily", role: "Search, exact-phrase search, careers-site crawling, and reading pages so we never open them ourselves." },
  { icon: Database, name: "Supabase", role: "Postgres for accounts, saved investigations, the evidence trail and the spending ledger." },
  { icon: Mail, name: "Resend", role: "Delivers the one-time codes that verify your email and reset your password." },
  { icon: Server, name: "Next.js and FastAPI", role: "One container: the site you're reading, and the API that runs the agents and streams them live." },
];

export function AboutStack() {
  return (
    <section className="relative py-28 sm:py-36">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          index="03"
          label="Under the hood"
          title={
            <>
              Built on tools that <Accent>show</Accent> their work too.
            </>
          }
          lede="Every model call is metered, every web call is counted, and every report shows both. Nothing here is a black box."
        />
        <Reveal as="div" selector="[data-stack]" stagger={0.07} className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-white/[0.07] bg-white/[0.06] sm:grid-cols-2 lg:grid-cols-3">
          {STACK.map(({ icon: Icon, name, role }) => (
            <div key={name} data-stack className="group bg-ink-950 p-7 transition-colors duration-500 hover:bg-ink-900">
              <Icon className="size-5 text-bone-500 transition-all duration-500 group-hover:scale-110 group-hover:text-brand-300" aria-hidden />
              <h3 className="mt-4 text-lg font-semibold tracking-[-0.02em] text-bone-50">{name}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-bone-400">{role}</p>
            </div>
          ))}
        </Reveal>

        <Reveal y={20} className="mt-6">
          <div className="panel flex flex-col items-start justify-between gap-5 p-7 sm:flex-row sm:items-center">
            <div>
              <p className="text-lg font-semibold tracking-[-0.02em] text-bone-50">Open source, MIT licensed</p>
              <p className="mt-1 text-[15px] text-bone-400">Built during the Nebius × NVIDIA Global AI Hackathon, October 2026. Read the code, run it yourself, or improve it.</p>
            </div>
            {REPO_URL && (
              <a
                href={REPO_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-bone-50 px-4 py-2.5 text-sm font-semibold text-ink-950 transition hover:bg-brand-300"
              >
                <GithubMark className="size-4" /> View on GitHub <ArrowUpRight className="size-3.5" aria-hidden />
              </a>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
