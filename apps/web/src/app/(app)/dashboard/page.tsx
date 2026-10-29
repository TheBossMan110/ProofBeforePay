import type { Metadata } from "next";
import { Dashboard } from "@/features/dashboard/Dashboard";

export const metadata: Metadata = { title: "Dashboard · ProofBeforePay" };

export default function DashboardPage() {
  return <Dashboard />;
}
