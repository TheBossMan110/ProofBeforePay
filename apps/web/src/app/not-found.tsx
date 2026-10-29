import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[80svh] max-w-xl animate-page-in flex-col items-center justify-center px-5 text-center">
      <p className="font-mono text-[11px] tracking-[0.18em] text-bone-500 uppercase">404 · nothing to verify here</p>
      <h1 className="mt-5 text-5xl font-semibold tracking-[-0.05em] text-bone-50">
        This page doesn&apos;t <span className="font-serif font-normal text-brand-400 italic">exist.</span>
      </h1>
      <p className="mt-4 text-bone-400">The link may be old, or the address may have a typo.</p>
      <Link
        href="/"
        className="mt-8 inline-flex h-11 items-center rounded-xl bg-brand-500 px-5 text-sm font-semibold text-ink-950 transition hover:bg-brand-400"
      >
        Back to ProofBeforePay
      </Link>
    </div>
  );
}
