"use client";

import { BadgeCheck, LogOut, Sparkles, Trash2, UserRound } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { MotionToggle } from "@/components/layout/MotionNotice";
import { Avatar } from "@/components/layout/UserMenu";
import { Button, Card, CardHeader, Spinner } from "@/components/ui";
import { FormAlert, TextField } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/page";
import { me } from "@/lib/api-client";
import { check, profileSchema } from "@/lib/schemas";
import { setUser, signOut, useSession } from "@/stores/session";

export function SettingsPage() {
  const { user } = useSession();
  const router = useRouter();
  const [name, setName] = useState(user?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => setName(user?.name ?? ""), [user?.name]);
  if (!user) return null;

  async function save(event: FormEvent) {
    event.preventDefault();
    const result = check(profileSchema, { name });
    if (result.errors) return setError(result.errors.name ?? "Check your name.");
    setSaving(true);
    setError(null);
    setSaved(null);
    try {
      const { user: updated } = await me.rename(result.data.name);
      setUser(updated);
      setSaved("Saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setDeleting(true);
    try {
      await me.remove();
      setUser(null);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete your account.");
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow="Settings" title="Your account" />
      <div className="space-y-6">
        <Card>
          <CardHeader icon={<UserRound className="size-4" />} title="Profile" />
          <form onSubmit={save} className="space-y-5 p-5">
            <div className="flex items-center gap-4">
              <Avatar user={user} className="size-14 text-base" />
              <div className="min-w-0">
                <p className="truncate font-semibold text-bone-50">{user.name}</p>
                <p className="flex items-center gap-1.5 truncate text-sm text-bone-400">
                  {user.email}
                  {user.verified && <BadgeCheck className="size-4 shrink-0 text-brand-300" aria-label="Verified email" />}
                </p>
              </div>
            </div>
            <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" disabled={user.demo} />
            {user.demo && <p className="text-sm text-bone-500">This is the shared demo account, so its name and password can&apos;t be changed and it can&apos;t be deleted.</p>}
            <FormAlert message={error} />
            <FormAlert message={saved} tone="success" />
            <Button type="submit" variant="primary" disabled={user.demo || saving || name.trim() === user.name}>
              {saving && <Spinner className="size-4" />} Save changes
            </Button>
          </form>
        </Card>

        <Card>
          <CardHeader icon={<Sparkles className="size-4" />} title="Animations" subtitle="Smooth scrolling, transitions and the 3D scene" />
          <div className="space-y-3 p-5">
            <p className="text-sm leading-relaxed text-bone-400">
              &ldquo;Device&rdquo; follows your system&apos;s reduced-motion setting. On Windows that&apos;s Settings → Accessibility → Visual effects →
              Animation effects. Choose On to see the animations here whatever your device says.
            </p>
            <MotionToggle />
          </div>
        </Card>

        <Card>
          <CardHeader icon={<LogOut className="size-4" />} title="Session" />
          <div className="flex flex-wrap items-center justify-between gap-3 p-5">
            <p className="text-sm text-bone-400">You stay signed in on this device for 30 days.</p>
            <Button
              variant="secondary"
              onClick={async () => {
                await signOut();
                router.push("/");
              }}
            >
              <LogOut className="size-4" aria-hidden /> Sign out
            </Button>
          </div>
        </Card>

        <Card className="border-stop-500/25">
          <CardHeader icon={<Trash2 className="size-4 text-stop-300" />} title="Delete account" subtitle="Removes your account, your checks and your feedback" />
          <div className="space-y-3 p-5">
            <p className="text-sm leading-relaxed text-bone-400">
              This can&apos;t be undone. Your saved reports, their evidence trails and any feedback you left are deleted with it. Type{" "}
              <span className="font-mono text-bone-100">delete</span> to confirm.
            </p>
            <div className="flex flex-wrap gap-2">
              <input
                disabled={user.demo}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="delete"
                aria-label="Type delete to confirm"
                className="h-10 w-40 rounded-xl border border-white/[0.08] bg-ink-900 px-3 text-sm text-bone-50 placeholder:text-bone-700 focus:border-stop-400 focus:outline-none"
              />
              <AnimatePresence>
                {confirm.trim().toLowerCase() === "delete" && (
                  <motion.button
                    type="button"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    onClick={remove}
                    disabled={deleting}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-stop-500 px-4 text-sm font-semibold text-bone-50 transition hover:bg-stop-400 disabled:opacity-60"
                  >
                    {deleting ? <Spinner className="size-4" /> : <Trash2 className="size-4" aria-hidden />}
                    Delete everything
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
