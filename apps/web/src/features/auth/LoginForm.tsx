"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FormAlert, PasswordField, TextField } from "@/components/ui/form";
import { ApiError, auth } from "@/lib/api-client";
import { check, loginSchema, type FieldErrors } from "@/lib/schemas";
import { setUser } from "@/stores/session";
import { AuthHeading, safeNext, stagger, SubmitButton } from "./shared";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [values, setValues] = useState({ email: params.get("email") ?? "", password: "" });
  const [errors, setErrors] = useState<FieldErrors<typeof values>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const result = check(loginSchema, values);
    if (result.errors) return setErrors(result.errors);
    setErrors({});
    setError(null);
    setBusy(true);
    try {
      const { user } = await auth.login(result.data);
      setUser(user);
      router.push(next);
    } catch (err) {
      if (err instanceof ApiError && err.code === "unverified") {
        router.push(`/verify?email=${encodeURIComponent(result.data.email)}&next=${encodeURIComponent(next)}`);
        return;
      }
      setError(err instanceof Error ? err.message : "Couldn't sign you in.");
      setBusy(false);
    }
  }

  return (
    <>
      <AuthHeading eyebrow="Welcome back" title="Sign in">
        See every check you&apos;ve run, with the full evidence trail and what each agent did.
      </AuthHeading>
      <form onSubmit={submit} className="space-y-4" noValidate>
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
        <motion.div {...stagger(1)}>
          <PasswordField
            label="Password"
            autoComplete="current-password"
            value={values.password}
            onChange={(e) => setValues({ ...values, password: e.target.value })}
            error={errors.password}
            hint={
              <Link href={`/forgot-password${values.email ? `?email=${encodeURIComponent(values.email)}` : ""}`} className="text-brand-300 hover:text-brand-200">
                Forgot it?
              </Link>
            }
          />
        </motion.div>
        <FormAlert message={error} />
        <motion.div {...stagger(2)} className="pt-2">
          <SubmitButton busy={busy}>Sign in</SubmitButton>
        </motion.div>
      </form>
      <motion.p {...stagger(3)} className="mt-8 text-center text-sm text-bone-500">
        New here?{" "}
        <Link href={`/signup${next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-bone-100 underline-offset-4 hover:underline">
          Create an account
        </Link>
      </motion.p>
    </>
  );
}
