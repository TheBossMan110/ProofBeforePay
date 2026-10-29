"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);
}

/**
 * Motion follows the device's reduced-motion setting unless the visitor picks otherwise on the site. Windows turns
 * "Animation effects" off on many machines without people knowing, so the site offers a visible switch.
 */
export type MotionChoice = "system" | "full" | "reduced";
export const MOTION_KEY = "pbp:motion";

export function motionChoice(): MotionChoice {
  if (typeof window === "undefined") return "system";
  try {
    const value = window.localStorage.getItem(MOTION_KEY);
    return value === "full" || value === "reduced" ? value : "system";
  } catch {
    return "system";
  }
}

export function setMotionChoice(choice: MotionChoice): void {
  try {
    if (choice === "system") window.localStorage.removeItem(MOTION_KEY);
    else window.localStorage.setItem(MOTION_KEY, choice);
  } catch {
    // Storage blocked: the choice lasts for this page only.
  }
  // Every animation reads the choice when it's set up, so a reload applies it everywhere at once.
  window.location.reload();
}

export const systemPrefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const choice = motionChoice();

/** Media query for animations that should only run when motion is wanted ("all" always matches, "not all" never does). */
export const MOTION_OK = choice === "full" ? "all" : choice === "reduced" ? "not all" : "(prefers-reduced-motion: no-preference)";

export const prefersReducedMotion = () => (choice === "full" ? false : choice === "reduced" ? true : systemPrefersReducedMotion());

export const finePointer = () => typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

export { gsap, ScrollTrigger, SplitText, useGSAP };
