"use client";

import { Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Reveal } from "@/components/motion/reveal";
import { cx } from "@/lib/cx";
import { Accent, SectionHeading } from "./Section";

const QUESTIONS = [
  {
    q: "Is it free?",
    a: "Yes. Each check costs us about two cents in model time on Nebius Token Factory, and the public demo has a daily limit so it stays that way.",
  },
  {
    q: "Can it prove a message is a scam?",
    a: "No, and it never claims to. It finds risk signals in public evidence: registry records, the company's own pages, reports and the message itself. That's why there are three answers, and why every report tells you what to check yourself.",
  },
  {
    q: "Do you keep the message I paste?",
    a: "It's saved so your report link keeps working. If you're signed in, it's tied to your account and you can delete it, with everything else, from Settings. Leave out passwords, ID numbers and bank details; they're never needed.",
  },
  {
    q: "Why did a genuine offer get Verify first?",
    a: "Usually because something important couldn't be confirmed, like the recruiter's name. Verify first means \"probably fine, check this one thing\". The report's \"What would change this verdict\" section says exactly what.",
  },
  {
    q: "Which AI models does it use?",
    a: "Three NVIDIA Nemotron 3 models on Nebius Token Factory: Nano for reading and first checks, Super for harder claims and for challenging the verdict, and Ultra once per check for the final judgement.",
  },
  {
    q: "Can I use it on messages that aren't about jobs?",
    a: "It's tuned for job offers, recruiter messages and freelance clients. Other messages will work, but the checks are built around how hiring scams operate.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="relative py-24 sm:py-32">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[0.8fr_1.2fr]">
        <SectionHeading
          index="02"
          label="Questions"
          title={
            <>
              Asked <Accent>often.</Accent>
            </>
          }
          lede="If yours isn't here, the form above reaches a person."
        />
        <Reveal as="div" selector="[data-faq]" stagger={0.06} className="divide-y divide-white/[0.07] border-y border-white/[0.07]">
          {QUESTIONS.map((item, i) => (
            <div key={item.q} data-faq>
              <button
                type="button"
                onClick={() => setOpen(open === i ? null : i)}
                aria-expanded={open === i}
                className="group flex w-full items-center justify-between gap-6 py-5 text-left"
              >
                <span className={cx("text-lg font-semibold tracking-[-0.02em] transition-colors", open === i ? "text-bone-50" : "text-bone-200 group-hover:text-bone-50")}>{item.q}</span>
                <motion.span animate={{ rotate: open === i ? 45 : 0 }} transition={{ type: "spring", stiffness: 400, damping: 24 }} className="grid size-8 shrink-0 place-items-center rounded-full border border-white/[0.1] text-bone-300">
                  <Plus className="size-4" aria-hidden />
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {open === i && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }} className="overflow-hidden">
                    <p className="max-w-2xl pb-6 text-[15px] leading-relaxed text-bone-400">{item.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
