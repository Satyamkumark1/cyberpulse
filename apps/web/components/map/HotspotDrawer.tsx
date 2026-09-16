"use client"; // focus trap + client-side fetch

import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { StatePanel } from "@/components/common/StatePanel";
import { RiskBadge } from "@/components/common/RiskBadge";
import { useFocusTrap } from "@/components/common/useFocusTrap";
import { formatDistanceMeters, formatPaise, formatScorePercent, formatWindowIst } from "@/lib/formatters";
import type { HotspotDetail } from "./types";

async function fetchHotspotDetail(h3Index: string): Promise<HotspotDetail> {
  const res = await fetch(`/api/hotspots/${h3Index}`);
  if (!res.ok) {
    const body = (await res.json()) as { error: { message: string } };
    throw new Error(body.error.message);
  }
  return res.json();
}

// AC-010-03/04: opens within 300ms (the shell renders immediately; data
// fetches inside it) and shows every documented field in one screen.
export function HotspotDrawer({ h3Index, onClose }: { h3Index: string; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, true, onClose);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["hotspot-detail", h3Index],
    queryFn: () => fetchHotspotDetail(h3Index),
  });

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-900/30" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="hotspot-drawer-heading"
        className="fixed inset-y-0 right-0 z-50 w-full max-w-[480px] overflow-y-auto bg-white p-4 shadow-lg"
      >
        <div className="flex items-center justify-between">
          <h2 id="hotspot-drawer-heading" className="text-base font-semibold text-slate-800">
            {data ? data.name : "Hotspot"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close hotspot detail"
            className="rounded-sm px-2 py-1 text-slate-500 hover:text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sih-blue-600"
          >
            ✕
          </button>
        </div>

        {isLoading ? (
          <div className="mt-4">
            <StatePanel state="loading" title="Loading hotspot" message="Fetching prediction detail." />
          </div>
        ) : isError ? (
          <div className="mt-4">
            <StatePanel state="error" {...(error instanceof Error ? { message: error.message } : {})} onRetry={() => refetch()} />
          </div>
        ) : data ? (
          <div className="mt-4 space-y-4 text-sm">
            <div className="flex items-center gap-3">
              <RiskBadge level={data.riskLevel} />
              <span className="text-lg font-semibold text-slate-800">{formatScorePercent(data.riskScore)}</span>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Expected window</h3>
              <p className="mt-1 text-slate-700">
                {data.expectedStart && data.expectedEnd ? formatWindowIst(data.expectedStart, data.expectedEnd) : "—"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Predicted window based on temporal patterns in related transactions and withdrawals.
              </p>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nearby ATMs ({data.nearbyAtms.length})</h3>
              <ul className="mt-1 space-y-1">
                {data.nearbyAtms.map((a) => (
                  <li key={a.atmId} className="flex justify-between gap-2 text-slate-700">
                    <span>
                      {a.atmId} {a.bankName}
                    </span>
                    <span className="shrink-0 text-slate-500">{formatDistanceMeters(a.distance)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Top risk factors</h3>
              {data.topFactors.length === 0 ? (
                <p className="mt-1 text-slate-500">No explanation available for this cell.</p>
              ) : (
                <ul className="mt-1 space-y-1">
                  {data.topFactors.map((f) => (
                    <li key={f.name} className="flex justify-between text-slate-700">
                      <span>{f.name}</span>
                      <span className={f.direction === "INCREASES" ? "text-red-700" : "text-emerald-700"}>
                        {f.direction === "INCREASES" ? "▲ increases risk" : "▼ reduces risk"} {f.contribution.toFixed(1)}%
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Related complaints ({data.relatedComplaints.length})
              </h3>
              {data.relatedComplaints.length === 0 ? (
                <p className="mt-1 text-slate-500">None on record.</p>
              ) : (
                <ul className="mt-1 space-y-1">
                  {data.relatedComplaints.map((c) => (
                    <li key={c.complaintId} className="flex justify-between text-slate-700">
                      <span className="font-mono text-xs">{c.complaintId}</span>
                      <span>{formatPaise(c.amountPaise)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
