import type Lenis from "lenis";

let lenis: Lenis | null = null;

export function setLenis(instance: Lenis | null): void {
  lenis = instance;
}

export function getLenis(): Lenis | null {
  return lenis;
}

/** Smooth-scrolls to an element or selector, through Lenis when it is running. */
export function scrollToTarget(target: string | HTMLElement, { offset = -96, center = false } = {}): void {
  const el = typeof target === "string" ? document.querySelector<HTMLElement>(target) : target;
  if (!el) return;
  const shift = center ? -(window.innerHeight / 2 - el.getBoundingClientRect().height / 2) : offset;
  if (lenis) {
    lenis.scrollTo(el, { offset: shift, duration: 1.4 });
    return;
  }
  const top = el.getBoundingClientRect().top + window.scrollY + shift;
  window.scrollTo({ top, behavior: "smooth" });
}
