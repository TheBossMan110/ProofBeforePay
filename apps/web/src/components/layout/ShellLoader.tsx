import { LogoMark } from "@/components/layout/Logo";

/** The branded loading state: the seal turning while a page or the session loads. */
export function ShellLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div className="grid min-h-[60svh] place-items-center" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-5">
        <div className="relative grid size-20 place-items-center">
          <span className="ring-spin absolute inset-0 rounded-full" aria-hidden />
          <span className="absolute inset-2 animate-pulse rounded-full bg-brand-500/10" aria-hidden />
          <LogoMark className="relative size-9 text-bone-300" />
        </div>
        <p className="font-mono text-[11px] tracking-[0.18em] text-bone-500 uppercase">
          {label}
          <span className="dots" aria-hidden>
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </span>
        </p>
      </div>
    </div>
  );
}
