"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import type { Health, InvestigationSummary } from "@/types";

// One request per page load, shared by every section that needs it.
let healthRequest: Promise<Health | null> | null = null;
let examplesRequest: Promise<InvestigationSummary[]> | null = null;

/** `undefined` while loading, `null` if the backend is unreachable. */
export function useHealth(): Health | null | undefined {
  const [health, setHealth] = useState<Health | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    healthRequest ??= api.health().catch(() => null);
    healthRequest.then((value) => alive && setHealth(value));
    return () => {
      alive = false;
    };
  }, []);
  return health;
}

/** `null` while loading. */
export function useExamples(): InvestigationSummary[] | null {
  const [examples, setExamples] = useState<InvestigationSummary[] | null>(null);
  useEffect(() => {
    let alive = true;
    examplesRequest ??= api.examples().catch(() => []);
    examplesRequest.then((value) => alive && setExamples(value));
    return () => {
      alive = false;
    };
  }, []);
  return examples;
}
