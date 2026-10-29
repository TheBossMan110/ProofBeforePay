"use client";

import { useEffect, useRef, useState } from "react";
import { AgentPipeline } from "@/components/investigation/AgentPipeline";
import { Skeleton } from "@/components/ui";
import { useInvestigationStream } from "@/features/investigations/useInvestigationStream";

/** A finished report's agent pipeline, loaded from its event log when it scrolls near the screen. */
export function AgentTrace({ runId }: { runId: string }) {
  const root = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const state = useInvestigationStream(runId, near ? "instant" : null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => entry?.isIntersecting && setNear(true), { rootMargin: "400px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={root} id="agent-trace">
      {near && state.status === "done" ? (
        <AgentPipeline state={state} running={false} title="How the agents worked" />
      ) : (
        <Skeleton className="h-[420px] rounded-2xl" />
      )}
    </div>
  );
}
