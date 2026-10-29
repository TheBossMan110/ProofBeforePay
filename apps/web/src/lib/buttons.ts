import { cx } from "./cx";

// Shared by the <Button> component and by links styled as buttons. No "use client": server pages call it too.
export const BUTTON_VARIANT = {
  primary: "bg-brand-500 text-ink-950 [--btn-fill:var(--color-bone-50)] shadow-[0_0_0_1px_rgba(118,185,0,0.45),0_10px_30px_-10px_rgba(118,185,0,0.65)]",
  secondary: "bg-white/[0.04] text-bone-100 ring-1 ring-inset ring-white/10 [--btn-fill:rgb(246_243_236/0.08)]",
  ghost: "text-bone-400 hover:text-bone-50 [--btn-fill:rgb(246_243_236/0.06)]",
} as const;

/** Button styles for links that should look like buttons (Next <Link>, plain <a>). */
export function buttonClasses(variant: keyof typeof BUTTON_VARIANT = "secondary", className?: string) {
  return cx(
    "btn inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-[transform,opacity] duration-300 active:scale-[0.97]",
    BUTTON_VARIANT[variant],
    className,
  );
}
