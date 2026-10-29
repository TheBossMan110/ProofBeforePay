"use client";

import { useEffect } from "react";

/** Old report links (/check?id=…) keep working: they forward to /investigations with the same query. */
export default function LegacyCheckPage() {
  useEffect(() => {
    window.location.replace(`/investigations${window.location.search}`);
  }, []);
  return null;
}
