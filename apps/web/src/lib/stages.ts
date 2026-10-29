import type { StageKey, TierName } from "@/types";

export interface StageMeta {
  key: StageKey;
  title: string;
  engine: string;
  detail: string;
  /** The Nemotron tier doing the model work in this step, if any. */
  tier?: TierName;
}

export const STAGES: StageMeta[] = [
  {
    key: "intake",
    title: "Read the offer",
    engine: "Nano + rules",
    tier: "nano",
    detail: "Pulls out who is offering what, the pay, and every claim that can be checked. Rules in code flag payment and pressure patterns.",
  },
  {
    key: "research",
    title: "Investigate the web",
    engine: "Tavily",
    detail: "Finds the official site, crawls its careers pages, and searches for fraud warnings and reused copies of the same script.",
  },
  {
    key: "forensics",
    title: "Domain forensics",
    engine: "RDAP + Tavily Extract",
    detail: "Reads the registry record for every domain in the message, opens each link through Tavily to see what the page asks for, and compares the sender with the company's real website.",
  },
  {
    key: "verify",
    title: "Check every claim",
    engine: "Nano → Super",
    tier: "super",
    detail: "Nano checks each claim against the sources. Anything it's unsure about goes to Super with a fresh search.",
  },
  {
    key: "judge",
    title: "Weigh the evidence",
    engine: "Nemotron Ultra",
    tier: "ultra",
    detail: "One long reasoning pass over every signal, claim and source, ending in a decision with citations.",
  },
  {
    key: "challenge",
    title: "Argue against it",
    engine: "Super + Tavily",
    tier: "super",
    detail: "A second model runs its own searches to prove the verdict wrong, then lists exactly what evidence would change it. Code decides what a disagreement changes.",
  },
  {
    key: "brief",
    title: "Write the brief",
    engine: "Nemotron Nano",
    tier: "nano",
    detail: "A plain-language summary and a polite reply that asks the sender to prove who they are.",
  },
];
