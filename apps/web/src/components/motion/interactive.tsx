"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import { finePointer, gsap, MOTION_OK, prefersReducedMotion, ScrollTrigger, useGSAP } from "@/lib/gsap";

/** Stores the pointer position on the element as --mx/--my, which drives the `.spot` border light. */
export function trackPointer(event: ReactPointerEvent<HTMLElement>): void {
  const el = event.currentTarget;
  const rect = el.getBoundingClientRect();
  el.style.setProperty("--mx", `${event.clientX - rect.left}px`);
  el.style.setProperty("--my", `${event.clientY - rect.top}px`);
}

/** Stores where the pointer entered as --fx/--fy, so a `.btn` fill grows from that point. */
export function trackFillOrigin(event: ReactPointerEvent<HTMLElement>): void {
  const el = event.currentTarget;
  const rect = el.getBoundingClientRect();
  el.style.setProperty("--fx", `${event.clientX - rect.left}px`);
  el.style.setProperty("--fy", `${event.clientY - rect.top}px`);
}

/** Pulls its child toward the cursor. A descendant marked [data-magnetic-inner] moves a little further, for depth. */
export function Magnetic({ children, strength = 0.32, className }: { children: ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useGSAP(
    (_context, contextSafe) => {
      const el = ref.current;
      if (!el || !contextSafe || !finePointer() || prefersReducedMotion()) return;
      const inner = el.querySelector<HTMLElement>("[data-magnetic-inner]");
      const ease = { duration: 0.7, ease: "power3.out" };
      const xTo = gsap.quickTo(el, "x", ease);
      const yTo = gsap.quickTo(el, "y", ease);
      const ixTo = inner ? gsap.quickTo(inner, "x", ease) : null;
      const iyTo = inner ? gsap.quickTo(inner, "y", ease) : null;
      const move = contextSafe((event: PointerEvent) => {
        const rect = el.getBoundingClientRect();
        const dx = event.clientX - (rect.left + rect.width / 2);
        const dy = event.clientY - (rect.top + rect.height / 2);
        xTo(dx * strength);
        yTo(dy * strength);
        ixTo?.(dx * strength * 0.45);
        iyTo?.(dy * strength * 0.45);
      });
      const leave = contextSafe(() => {
        xTo(0);
        yTo(0);
        ixTo?.(0);
        iyTo?.(0);
      });
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerleave", leave);
      return () => {
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerleave", leave);
      };
    },
    { scope: ref },
  );

  return (
    <span ref={ref} className={cx("inline-flex will-change-transform", className)}>
      {children}
    </span>
  );
}

/** Tilts in 3D toward the cursor, with a sheen that follows it. */
export function Tilt({
  children,
  className,
  max = 7,
  onPointerMove,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
  onPointerMove?: (event: ReactPointerEvent<HTMLDivElement>) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const rx = useRef<((value: number) => void) | null>(null);
  const ry = useRef<((value: number) => void) | null>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || !finePointer() || prefersReducedMotion()) return;
      gsap.set(el, { transformPerspective: 1000 });
      rx.current = gsap.quickTo(el, "rotationX", { duration: 0.8, ease: "power3.out" });
      ry.current = gsap.quickTo(el, "rotationY", { duration: 0.8, ease: "power3.out" });
    },
    { scope: ref },
  );

  return (
    <div
      ref={ref}
      className={cx("will-change-transform", className)}
      onPointerMove={(event) => {
        trackPointer(event);
        onPointerMove?.(event);
        if (!rx.current || !ry.current) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width - 0.5;
        const py = (event.clientY - rect.top) / rect.height - 0.5;
        rx.current(-py * max);
        ry.current(px * max);
      }}
      onPointerLeave={() => {
        rx.current?.(0);
        ry.current?.(0);
      }}
    >
      {children}
    </div>
  );
}

/** Counts to `value`: once when first seen (`startOnView`), then from the previous value whenever it changes. */
export function Ticker({
  value,
  from = 0,
  format = (n: number) => String(Math.round(n)),
  duration = 1.8,
  startOnView = true,
  className,
}: {
  value: number;
  from?: number;
  format?: (n: number) => string;
  duration?: number;
  startOnView?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const current = useRef(startOnView ? from : value);
  const seen = useRef(!startOnView);
  const formatRef = useRef(format);
  formatRef.current = format;
  // React renders the first value only; later values are written straight to the DOM by the tween.
  const [initial] = useState(() => format(startOnView ? from : value));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      current.current = value;
      el.textContent = formatRef.current(value);
      return;
    }
    let tween: gsap.core.Tween | null = null;
    const animate = () => {
      const state = { v: current.current };
      tween = gsap.to(state, {
        v: value,
        duration,
        ease: "expo.out",
        onUpdate: () => {
          current.current = state.v;
          el.textContent = formatRef.current(state.v);
        },
      });
    };
    if (seen.current) {
      animate();
      return () => {
        tween?.kill();
      };
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        seen.current = true;
        observer.disconnect();
        animate();
      },
      { threshold: 0.35 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      tween?.kill();
    };
  }, [value, duration]);

  return (
    <span ref={ref} className={className}>
      {initial}
    </span>
  );
}

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=/<>";

/** Monospace label that decodes itself from random glyphs on hover. */
export function ScrambleText({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const frame = useRef(0);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  function scramble() {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    cancelAnimationFrame(frame.current);
    const start = performance.now();
    const length = 420;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / length);
      const settled = Math.floor(progress * text.length);
      let out = "";
      for (let i = 0; i < text.length; i++) {
        const ch = text[i] ?? "";
        out += i < settled || ch === " " ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      el.textContent = out;
      if (progress < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }

  return (
    <span className={className} onPointerEnter={scramble} aria-label={text}>
      <span ref={ref} aria-hidden>
        {text}
      </span>
    </span>
  );
}

/** Label that rolls up to an identical copy on hover of the nearest `.roll-host`. */
export function RollText({ text, className }: { text: string; className?: string }) {
  return (
    <span className={cx("roll", className)}>
      <span data-text={text}>{text}</span>
    </span>
  );
}

/** Endless marquee that speeds up while the page is being scrolled. */
export function VelocityMarquee({
  children,
  reverse = false,
  seconds = 48,
  className,
}: {
  children: ReactNode;
  reverse?: boolean;
  seconds?: number;
  className?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = track.current;
      if (!el) return;
      gsap.matchMedia().add(MOTION_OK, () => {
        const loop = gsap.fromTo(el, { xPercent: reverse ? -50 : 0 }, { xPercent: reverse ? 0 : -50, duration: seconds, ease: "none", repeat: -1 });
        let settle: gsap.core.Tween | null = null;
        ScrollTrigger.create({
          trigger: root.current,
          start: "top bottom",
          end: "bottom top",
          onUpdate(self) {
            const boost = 1 + Math.min(Math.abs(self.getVelocity()) / 220, 7);
            settle?.kill();
            gsap.to(loop, { timeScale: boost, duration: 0.25, overwrite: true });
            settle = gsap.to(loop, { timeScale: 1, duration: 1.4, delay: 0.25, ease: "power2.out" });
          },
        });
      });
    },
    { scope: root },
  );

  return (
    <div ref={root} className={cx("overflow-hidden", className)}>
      <div ref={track} className="flex w-max will-change-transform">
        <div className="flex shrink-0 items-center">{children}</div>
        <div className="flex shrink-0 items-center" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}
