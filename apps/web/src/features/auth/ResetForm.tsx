"use client";

import { KeyRound } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FormAlert, OtpInput, PasswordField, TextField } from "@/components/ui/form";
import { auth } from "@/lib/api-client";
import { check, emailSchema, resetSchema, type FieldErrors } from "@/lib/schemas";
import { setUser } from "@/stores/session";
import { AuthHeading, stagger, SubmitButton } from "./shared";

/** Forgotten password: email a code, then set a new password with it. Resetting signs out every other device. */
export function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [step, setStep] = useState<"email" | "code">("email");
  const [values, setValues] = useState({ email: params.get("email") ?? "", code: "", password: "" });
  const [errors, setErrors] = useState<FieldErrors<typeof values>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendCode(event: FormEvent) {
    event.preventDefault();
    const result = check(emailSchema, values);
    if (result.errors) return setErrors(result.errors);
    setErrors({});
    setError(null);
    setBusy(true);
    try {
      await auth.forgot(result.data);
      setValues({ ...values, email: result.data.email });
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send a code.");
    } finally {
      setBusy(false);
    }
  }

  async function reset(event: FormEvent) {
    event.preventDefault();
    const result = check(resetSchema, values);
    if (result.errors) return setErrors(result.errors);
    setErrors({});
    setError(null);
    setBusy(true);
    try {
      const { user } = await auth.reset(result.data);
      setUser(user);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't reset your password.");
      setBusy(false);
    }
  }

  return (
    <>
    <AnimatePresence mode="wait">
      {step === "email" ? (
        <motion.div key="email" exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
          <AuthHeading eyebrow="Reset password" title="Forgot your password?">
            Enter your email and we&apos;ll send a code you can use to set a new one.
          </AuthHeading>
          <form onSubmit={sendCode} className="space-y-4" noValidate>
            <motion.div {...stagger(0)}>
              <TextField
                label="Email"
                type="email"
                autoComplete="email"
                value={values.email}
                onChange={(e) => setValues({ ...values, email: e.target.value })}
                error={errors.email}
                placeholder="you@example.com"
              />
            </motion.div>
            <FormAlert message={error} />
            <motion.div {...stagger(1)} className="pt-2">
              <SubmitButton busy={busy}>Send me a code</SubmitButton>
            </motion.div>
          </form>
        </motion.div>
      ) : (
        <motion.div key="code" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
          <span className="mb-6 grid size-12 place-items-center rounded-2xl border border-brand-500/25 bg-brand-500/[0.08] text-brand-300">
            <KeyRound className="size-5" aria-hidden />
          </span>
          <AuthHeading eyebrow="Reset password" title="Choose a new password">
            If <span className="font-medium text-bone-100">{values.email}</span> has a verified account, a code is on its way.
          </AuthHeading>
          <form onSubmit={reset} className="space-y-5" noValidate>
            <div>
              <p className="mb-2 text-[13px] font-medium text-bone-300">Code from the email</p>
              <OtpInput value={values.code} onChange={(code) => setValues({ ...values, code })} />
              {errors.code && <p className="pt-1.5 text-[13px] text-stop-300">{errors.code}</p>}
            </div>
            <PasswordField
              label="New password"
              autoComplete="new-password"
              value={values.password}
              onChange={(e) => setValues({ ...values, password: e.target.value })}
              error={errors.password}
              showStrength
            />
            <FormAlert message={error} />
            <SubmitButton busy={busy}>Reset and sign in</SubmitButton>
          </form>
          <button type="button" onClick={() => setStep("email")} className="mt-6 text-sm text-bone-500 transition hover:text-bone-200">
            Use a different email
          </button>
        </motion.div>
      )}
    </AnimatePresence>
      <p className="mt-8 text-center text-sm text-bone-500">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-bone-100 underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
