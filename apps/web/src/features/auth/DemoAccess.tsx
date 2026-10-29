"use client";

import { Gavel, ShieldCheck, UserRound } from "lucide-react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Spinner } from "@/components/ui";
import { auth } from "@/lib/api-client";
import { cx } from "@/lib/cx";
import { setUser } from "@/stores/session";

const OPTIONS = [
  { kind: "judge" as const, icon: UserRound, title: "Demo account", body: "Dashboard, history, agent pipeline" },
  { kind: "admin" as const, icon: ShieldCheck, title: "Demo admin", body: "Admin dashboard, details masked" },
];

/** One-click sign-in to the shared demo accounts, so judges can try the signed-in app without an email code. */
export function DemoAccess({ next }: { next?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"judge" | "admin" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function enter(kind: "judge" | "admin") {
    setBusy(kind);
    setError(null);
    try {
      const { user } = await auth.demo(kind);
      setUser(user);
      router.push(kind === "admin" ? "/admin" : next || "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "The demo isn't available right now.");
      setBusy(null);
    }
  }

  return (
    <motion.div
      id="demo"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative mt-8 overflow-hidden rounded-2xl border border-brand-500/25 bg-brand-500/[0.05] p-4"
    >
      <div className="pointer-events-none absolute -top-12 -right-12 size-32 rounded-full bg-brand-500/15 blur-2xl" aria-hidden />
      <p className="relative flex items-center gap-2 text-sm font-semibold text-bone-50">
        <Gavel className="size-4 text-brand-300" aria-hidden />
        Judging? Skip sign-up.
      </p>
      <p className="relative mt-1 text-xs leading-relaxed text-bone-400">
        Open a shared demo account in one click. Checks you run there are visible to other judges.
      </p>
      <div className="relative mt-3 grid gap-2 sm:grid-cols-2">
        {OPTIONS.map(({ kind, icon: Icon, title, body }) => (
          <button
            key={kind}
            type="button"
            onClick={() => enter(kind)}
            disabled={busy !== null}
            className={cx(
              "group flex items-center gap-3 rounded-xl border border-white/[0.08] bg-ink-900/80 px-3 py-2.5 text-left transition hover:-translate-y-0.5 hover:border-brand-500/40 disabled:opacity-60",
              busy === kind && "border-brand-500/50",
            )}
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/[0.04] text-bone-300 transition-colors group-hover:text-brand-300">
              {busy === kind ? <Spinner className="size-4" /> : <Icon className="size-4" aria-hidden />}
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-semibold text-bone-50">{title}</span>
              <span className="block truncate text-[11.5px] text-bone-500">{body}</span>
            </span>
          </button>
        ))}
      </div>
      {error && <p className="relative mt-2 text-xs text-stop-300">{error}</p>}
    </motion.div>
  );
}
