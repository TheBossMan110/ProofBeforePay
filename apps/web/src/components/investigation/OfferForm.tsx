"use client";

import { ArrowRight, FlaskConical, ImageUp, Lock, ScanText } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useRef, useState, type ClipboardEvent, type DragEvent, type FormEvent, type KeyboardEvent } from "react";
import { Magnetic, RollText, trackFillOrigin } from "@/components/motion/interactive";
import { api } from "@/lib/api-client";
import { imageToDataUrl } from "@/lib/images";
import { SAMPLES } from "@/lib/samples";
import { cx, Spinner } from "@/components/ui";

const CHANNELS = ["Email", "LinkedIn", "Telegram", "WhatsApp", "Upwork / Fiverr", "SMS", "Other"];
const MIN_LENGTH = 40;
const MAX_LENGTH = 8000;

export function OfferForm({ live }: { live: boolean | null }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [sender, setSender] = useState("");
  const [channel, setChannel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState<string | null>(null); // the screenshot being read, as a data URL
  const [fromImage, setFromImage] = useState(false);
  const [dragging, setDragging] = useState(false);
  const picker = useRef<HTMLInputElement>(null);

  /** A screenshot of the message: a small vision model reads the text, and the person checks it before investigating. */
  async function readScreenshot(file: File | undefined) {
    if (!file || reading) return;
    setError(null);
    try {
      const image = await imageToDataUrl(file);
      setReading(image);
      const { text } = await api.transcribe(image);
      setMessage(text.slice(0, MAX_LENGTH));
      const email = text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/)?.[0];
      if (email && !sender) setSender(email);
      setFromImage(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't read that screenshot. Paste the text instead.");
    } finally {
      setReading(null);
    }
  }

  function onPaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const file = Array.from(event.clipboardData.files).find((f) => f.type.startsWith("image/"));
    if (file) {
      event.preventDefault();
      void readScreenshot(file);
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    void readScreenshot(Array.from(event.dataTransfer.files).find((f) => f.type.startsWith("image/")));
  }

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    if (busy) return;
    if (message.trim().length < MIN_LENGTH) {
      setError("Paste the whole message you received. A couple of sentences at least.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { id } = await api.create({ message: message.trim(), sender: sender.trim(), channel });
      router.push(`/investigations?id=${encodeURIComponent(id)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) void submit();
  }

  const disabled = busy || live === false;
  const fill = Math.min(1, message.length / MAX_LENGTH);

  return (
    <form onSubmit={submit} className="glass rounded-[26px] p-2 shadow-[0_40px_100px_-40px_rgba(0,0,0,0.9)]">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cx(
          "group/field relative overflow-hidden rounded-[20px] border bg-ink-900/90 transition-colors duration-500 focus-within:border-brand-500/45",
          dragging ? "border-brand-400/70" : "border-white/[0.06]",
        )}
      >
        <AnimatePresence>
          {(reading || dragging) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 flex items-center justify-center gap-4 bg-ink-950/85 backdrop-blur-sm"
            >
              {reading ? (
                <>
                  <span className="relative h-28 w-20 overflow-hidden rounded-lg border border-white/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={reading} alt="" className="size-full object-cover object-top opacity-80" />
                    <span className="scan-line absolute inset-x-0 h-8" />
                  </span>
                  <span className="text-left">
                    <span className="flex items-center gap-2 text-sm font-semibold text-bone-50">
                      <ScanText className="size-4 text-brand-300" aria-hidden /> Reading your screenshot…
                    </span>
                    <span className="mt-1 block max-w-56 text-xs text-bone-400">A vision model copies out the text. You&apos;ll check it before anything is investigated.</span>
                  </span>
                </>
              ) : (
                <span className="flex items-center gap-2 text-sm font-semibold text-bone-50">
                  <ImageUp className="size-5 text-brand-300" aria-hidden /> Drop the screenshot to read it
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-brand-400/70 to-transparent opacity-0 transition-opacity duration-500 group-focus-within/field:opacity-100" />
        <label htmlFor="message" className="sr-only">
          Message you received
        </label>
        <textarea
          id="message"
          value={message}
          onChange={(e) => {
            setMessage(e.target.value.slice(0, MAX_LENGTH));
            setFromImage(false);
          }}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          placeholder="Paste the job offer, recruiter message or client email you received…"
          rows={8}
          className="scroll-slim block w-full resize-y rounded-[20px] bg-transparent px-5 pt-4 pb-2 text-[15px] leading-relaxed text-bone-50 placeholder:text-bone-600 focus:outline-none"
        />
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => picker.current?.click()}
              disabled={Boolean(reading)}
              onPointerEnter={trackFillOrigin}
              className="btn mr-1 inline-flex items-center gap-1.5 rounded-full bg-brand-500/10 px-2.5 py-1 text-xs font-medium text-brand-200 ring-1 ring-brand-500/30 ring-inset transition active:scale-95 disabled:opacity-60"
            >
              <ImageUp className="size-3.5" aria-hidden /> Upload screenshot
            </button>
            <input
              ref={picker}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                void readScreenshot(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <FlaskConical className="size-3.5 text-bone-500" aria-hidden />
            <span className="text-xs text-bone-500">Try a sample:</span>
            {SAMPLES.map((sample) => (
              <button
                key={sample.label}
                type="button"
                onPointerEnter={trackFillOrigin}
                onClick={() => {
                  setMessage(sample.message);
                  setSender(sample.sender);
                  setChannel(sample.channel);
                  setError(null);
                }}
                className="btn rounded-full bg-white/[0.035] px-2.5 py-1 text-xs text-bone-200 ring-1 ring-white/[0.08] ring-inset transition active:scale-95"
              >
                {sample.label}
              </button>
            ))}
          </div>
          <span className="flex items-center gap-2 font-mono text-[11px] text-bone-600">
            <span className="h-1 w-12 overflow-hidden rounded-full bg-white/[0.06]">
              <span
                className={cx("block h-full origin-left rounded-full transition-transform duration-300", fill > 0.9 ? "bg-caution-400" : "bg-bone-500")}
                style={{ transform: `scaleX(${fill})` }}
              />
            </span>
            {message.length.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_170px_auto]">
        <label className="sr-only" htmlFor="sender">
          Sender email or profile
        </label>
        <input
          id="sender"
          value={sender}
          onChange={(e) => setSender(e.target.value.slice(0, 200))}
          placeholder="Sender's email or profile link (optional)"
          className="h-12 rounded-2xl border border-white/[0.06] bg-ink-900/90 px-4 text-sm text-bone-50 transition-colors placeholder:text-bone-600 focus:border-brand-500/45 focus:outline-none"
        />
        <label className="sr-only" htmlFor="channel">
          Where you received it
        </label>
        <select
          id="channel"
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          className="h-12 rounded-2xl border border-white/[0.06] bg-ink-900/90 px-3 text-sm text-bone-200 transition-colors focus:border-brand-500/45 focus:outline-none"
        >
          <option value="">Received via…</option>
          {CHANNELS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <Magnetic strength={0.18} className="w-full sm:w-auto">
          <button
            type="submit"
            disabled={disabled}
            onPointerEnter={trackFillOrigin}
            className="btn roll-host inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand-500 px-6 text-sm font-semibold text-ink-950 shadow-[0_0_0_1px_rgba(118,185,0,0.5),0_14px_34px_-12px_rgba(118,185,0,0.7)] transition-[opacity,transform] [--btn-fill:var(--color-bone-50)] active:scale-[0.97] disabled:opacity-50"
          >
            <span data-magnetic-inner className="inline-flex items-center gap-2">
              {busy ? <Spinner className="size-4" /> : null}
              {busy ? "Starting…" : <RollText text="Investigate" />}
              {!busy && <ArrowRight className="size-4" aria-hidden />}
            </span>
          </button>
        </Magnetic>
      </div>

      <div className="flex min-h-10 flex-wrap items-center justify-between gap-2 px-3 pt-2 text-xs">
        {error ? (
          <p role="alert" className="text-stop-300">
            {error}
          </p>
        ) : fromImage ? (
          <p className="flex items-center gap-1.5 text-brand-200">
            <ScanText className="size-3" aria-hidden />
            Read from your screenshot. Check the text matches before you investigate.
          </p>
        ) : live === false ? (
          <p className="text-caution-300">Live checks are paused on this server right now. The recorded investigations below still work.</p>
        ) : (
          <p className="flex items-center gap-1.5 text-bone-500">
            <Lock className="size-3" aria-hidden />
            Leave out passwords and bank details. The message is saved only so your report link works.
          </p>
        )}
        <span className="hidden font-mono text-[10.5px] text-bone-600 sm:block">Ctrl + Enter to send</span>
      </div>
    </form>
  );
}
