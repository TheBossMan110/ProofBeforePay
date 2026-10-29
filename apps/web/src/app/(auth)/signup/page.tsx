import type { Metadata } from "next";
import { Suspense } from "react";
import { SignupForm } from "@/features/auth/SignupForm";

export const metadata: Metadata = { title: "Create an account · ProofBeforePay" };

export default function Page() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
