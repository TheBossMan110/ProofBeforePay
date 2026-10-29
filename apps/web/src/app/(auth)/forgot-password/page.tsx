import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetForm } from "@/features/auth/ResetForm";

export const metadata: Metadata = { title: "Reset your password · ProofBeforePay" };

export default function Page() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
