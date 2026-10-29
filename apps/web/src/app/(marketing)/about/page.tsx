import type { Metadata } from "next";
import Link from "next/link";
import { AboutAudience, AboutNumbers, AboutStack, AboutStory } from "@/components/marketing/AboutSections";
import { FinalCta } from "@/components/marketing/FinalCta";
import { PageHero } from "@/components/marketing/PageHero";
import { Principles } from "@/components/marketing/Principles";
import { Accent } from "@/components/marketing/Section";
import { buttonClasses } from "@/lib/buttons";

export const metadata: Metadata = {
  title: "About · ProofBeforePay",
  description: "Why ProofBeforePay exists, who it's for, and the tools it's built on: NVIDIA Nemotron on Nebius Token Factory, Tavily, Supabase and Resend.",
};

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About"
        title={
          <>
            Built for the offer that <Accent>expires</Accent> tonight.
          </>
        }
        lede="Most job and client scams can be caught with public evidence. Nobody has time to find it at 11pm, so ProofBeforePay sends seven agents to find it for you, and shows you every piece."
      >
        <Link href="/#try" className={buttonClasses("primary", "h-12 px-6")}>
          Check an offer
        </Link>
        <Link href="/how-it-works" className={buttonClasses("secondary", "h-12 px-6")}>
          See how it works
        </Link>
      </PageHero>
      <AboutStory />
      <AboutNumbers />
      <AboutAudience />
      <Principles index="02" />
      <AboutStack />
      <FinalCta />
    </>
  );
}
