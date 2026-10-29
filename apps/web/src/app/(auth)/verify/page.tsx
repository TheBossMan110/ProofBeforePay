import type { Metadata } from "next";
import { Suspense } from "react";
import { VerifyForm } from "@/features/auth/VerifyForm";

export const metadata: Metadata = { title: "Verify your email · ProofBeforePay" };

export default function Page() {
  return (
    <Suspense>
      <VerifyForm />
    </Suspense>
  );
}
