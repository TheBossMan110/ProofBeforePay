import type { Metadata } from "next";
import { InvestigatePage } from "@/features/investigations/InvestigatePage";

export const metadata: Metadata = { title: "New check · ProofBeforePay" };

export default function Page() {
  return <InvestigatePage />;
}
