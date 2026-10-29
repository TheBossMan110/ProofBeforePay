import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/features/auth/LoginForm";

export const metadata: Metadata = { title: "Sign in · ProofBeforePay" };

export default function Page() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
