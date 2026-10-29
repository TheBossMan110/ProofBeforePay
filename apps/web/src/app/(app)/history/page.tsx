import type { Metadata } from "next";
import { HistoryPage } from "@/features/investigations/HistoryPage";

export const metadata: Metadata = { title: "Your checks · ProofBeforePay" };

export default function Page() {
  return <HistoryPage />;
}
