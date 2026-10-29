"use client";

import { Check, MessageSquareHeart, Star } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Card, CardHeader, Spinner } from "@/components/ui";
import { api } from "@/lib/api-client";
import { cx } from "@/lib/cx";

const WORDS = ["", "Not useful", "A little useful", "Useful", "Very useful", "Exactly what I needed"];

/** "Was this check useful?": a rating, then an optional comment. It goes to the admin dashboard. */
export function FeedbackWidget({ runId }: { runId: string }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const shown = hover || rating;

  async function send() {
    setState("sending");
    setError(null);
    try {
      await api.feedback({ investigation_id: runId, rating, comment: comment.trim() });
      setState("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send that.");
      setState("idle");
    }
  }

  return (
    <Card>
      <CardHeader icon={<MessageSquareHeart className="size-4" />} title="Was this check useful?" subtitle="Your rating helps tune the agents" />
      <AnimatePresence mode="wait" initial={false}>
        {state === "sent" ? (
          <motion.div key="sent" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-3 p-5">
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 380, damping: 18 }}
              className="grid size-9 place-items-center rounded-full bg-brand-500 text-ink-950"
            >
              <Check className="size-4" strokeWidth={3} aria-hidden />
            </motion.span>
            <p className="text-sm text-bone-200">Thanks. That goes straight to the people tuning the agents.</p>
          </motion.div>
        ) : (
          <motion.div key="form" exit={{ opacity: 0 }} className="space-y-4 p-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex gap-1" onPointerLeave={() => setHover(0)} role="radiogroup" aria-label="Rating">
                {[1, 2, 3, 4, 5].map((n) => (
                  <motion.button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={rating === n}
                    aria-label={`${n} of 5: ${WORDS[n]}`}
                    onPointerEnter={() => setHover(n)}
                    onClick={() => setRating(n)}
                    whileTap={{ scale: 0.8 }}
                    animate={rating === n ? { scale: [1, 1.3, 1] } : { scale: 1 }}
                    className="grid size-10 place-items-center rounded-xl transition-colors hover:bg-white/[0.05]"
                  >
                    <Star className={cx("size-6 transition-colors", n <= shown ? "fill-sand-300 text-sand-300" : "text-bone-600")} aria-hidden />
                  </motion.button>
                ))}
              </div>
              <span className="text-sm text-bone-400">{WORDS[shown] || "Pick a rating"}</span>
            </div>
            <AnimatePresence>
              {rating > 0 && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-3 overflow-hidden">
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    maxLength={2000}
                    rows={3}
                    placeholder="Anything we got wrong, or missed? (optional)"
                    className="w-full resize-none rounded-xl border border-white/[0.08] bg-ink-900/80 px-4 py-3 text-sm text-bone-50 placeholder:text-bone-600 focus:border-brand-500/60 focus:outline-none"
                  />
                  {error && <p className="text-sm text-stop-300">{error}</p>}
                  <button
                    type="button"
                    onClick={send}
                    disabled={state === "sending"}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-bone-50 px-4 text-sm font-semibold text-ink-950 transition hover:bg-brand-300 disabled:opacity-60"
                  >
                    {state === "sending" && <Spinner className="size-4" />}
                    Send feedback
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
