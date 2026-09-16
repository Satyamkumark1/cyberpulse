"use client"; // next/dynamic with ssr:false requires a client boundary

import dynamic from "next/dynamic";
import { StatePanel } from "@/components/common/StatePanel";

// RULE-frontend.md §Performance: graph/map/charts are dynamically imported,
// never in the initial route bundle — @xyflow/react only loads once this
// component actually mounts on the client.
const MoneyTrailGraph = dynamic(() => import("./MoneyTrailGraph").then((m) => m.MoneyTrailGraph), {
  ssr: false,
  loading: () => <StatePanel state="loading" title="Loading money trail" message="Tracing the transaction chain." />,
});

export function MoneyTrailGraphLazy({ complaintId }: { complaintId: string }) {
  return <MoneyTrailGraph complaintId={complaintId} />;
}
