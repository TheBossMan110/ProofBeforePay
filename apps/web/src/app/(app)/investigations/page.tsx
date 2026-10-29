import type { Metadata } from "next";
import { Suspense } from "react";
import { InvestigationView, PageSkeleton } from "@/components/investigation/InvestigationView";

export const metadata: Metadata = { title: "Investigation · ProofBeforePay" };

// The investigation id lives in the query string (/investigations?id=…), so this page exports as one static file
// that FastAPI serves for every investigation.
export default function InvestigationPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 pt-28 pb-16 sm:px-6 sm:pt-32">
          <PageSkeleton />
        </div>
      }
    >
      <InvestigationView />
    </Suspense>
  );
}
