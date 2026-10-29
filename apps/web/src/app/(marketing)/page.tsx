import { CatchMarquee } from "@/components/marketing/CatchMarquee";
import { Examples } from "@/components/marketing/Examples";
import { FinalCta } from "@/components/marketing/FinalCta";
import { Hero } from "@/components/marketing/Hero";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { Outcomes } from "@/components/marketing/Outcomes";
import { Principles } from "@/components/marketing/Principles";
import { RoutingSection } from "@/components/marketing/RoutingSection";
import { StatSection } from "@/components/marketing/StatSection";
import { TrySection } from "@/components/marketing/TrySection";

export default function Home() {
  return (
    <>
      <Hero />
      <CatchMarquee />
      <TrySection />
      <StatSection />
      <HowItWorks />
      <RoutingSection />
      <Outcomes />
      <Principles />
      <Examples />
      <FinalCta />
    </>
  );
}
