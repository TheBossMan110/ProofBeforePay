import type { Metadata } from "next";
import Link from "next/link";
import { ChallengeRules } from "@/components/marketing/ChallengeRules";
import { FinalCta } from "@/components/marketing/FinalCta";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { PageHero } from "@/components/marketing/PageHero";
import { RoutingSection } from "@/components/marketing/RoutingSection";
import { Accent } from "@/components/marketing/Section";
import { buttonClasses } from "@/lib/buttons";

export const metadata: Metadata = {
  title: "How it works · ProofBeforePay",
  description: "Seven steps, three NVIDIA Nemotron models on Nebius Token Factory, Tavily web research, and a verdict that has to survive a second opinion.",
};

export default function HowItWorksPage() {
  return (
    <>
      <PageHero
        eyebrow="How it works"
        title={
          <>
            Seven agents, one <Accent>straight</Accent> answer.
          </>
        }
        lede="Code finds the hard facts, Tavily brings in the web, three NVIDIA Nemotron models each do the work that fits their size, and a second model tries to prove the first one wrong."
      >
        <Link href="/#try" className={buttonClasses("primary", "h-12 px-6")}>
          Check an offer
        </Link>
        <Link href="/investigations?id=remote-job-telegram&replay=1" className={buttonClasses("secondary", "h-12 px-6")}>
          Watch a replay
        </Link>
      </PageHero>
      <HowItWorks />
      <RoutingSection />
      <ChallengeRules />
      <FinalCta />
    </>
  );
}
