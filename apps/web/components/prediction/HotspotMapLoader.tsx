"use client";

import dynamic from "next/dynamic";
import type { HotspotMapProps } from "./HotspotMap";

const HotspotMap = dynamic(
  () => import("./HotspotMap").then((m) => m.HotspotMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[420px] w-full animate-pulse items-center justify-center rounded-xl border border-slate-200 bg-slate-100">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <svg className="h-4 w-4 animate-spin text-blue-600" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          Loading hotspot map…
        </div>
      </div>
    ),
  }
);

export function HotspotMapLazy(props: HotspotMapProps) {
  return <HotspotMap {...props} />;
}
