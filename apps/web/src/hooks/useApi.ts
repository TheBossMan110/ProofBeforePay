"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Loads data from the API on mount (and on `reload`), keeping the last good result while refreshing. */
export function useApi<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const latest = useRef(fetcher);
  latest.current = fetcher;

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await latest.current());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load this.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error, loading, reload };
}
