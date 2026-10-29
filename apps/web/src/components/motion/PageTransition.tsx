"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Entrance for every new page (used by the route groups' template.tsx, which remounts on navigation).
 * Opacity only by default, so scroll-pinned sections measure from their real position; `lift` adds a small rise.
 * A fade is gentle enough to keep when reduced motion is on, and keeping it avoids a server/client mismatch.
 */
export function PageTransition({ children, lift = false }: { children: ReactNode; lift?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: lift ? 12 : 0 }}
      animate={{ opacity: 1, y: 0, transitionEnd: { transform: "none" } }}
      transition={{ duration: lift ? 0.5 : 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
