import type { Metadata } from "next";
import { ComparePage } from "@/features/investigations/ComparePage";

export const metadata: Metadata = { title: "Compare checks · ProofBeforePay" };

export default function Page() {
  return <ComparePage />;
}
