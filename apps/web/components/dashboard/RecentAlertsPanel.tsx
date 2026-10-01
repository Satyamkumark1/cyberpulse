"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import type { AlertSeverity, AlertStatus } from "@cyberpulse/shared/enums";
import { RiskBadge } from "@/components/common/RiskBadge";
import { StatePanel } from "@/components/common/StatePanel";
import { formatPaise, formatTimestampIst } from "@/lib/formatters";
import { apiFetch } from "@/lib/apiFetch";

interface RecentAlertItem {
  id: number;
  alertId: string;
  severity: AlertSeverity;
  locationName: string;
  exposurePaise: number;
  status: AlertStatus;
  createdAt: string;
  investigationCaseId?: string | null;
}

interface AlertListResponse {
  data: RecentAlertItem[];
  total: number;
}

async function fetchRecentAlerts(): Promise<AlertListResponse> {
  return apiFetch("/api/alerts?pageSize=5", undefined, "Failed to load alerts");
}

/**
 * Live recent-alerts panel with query invalidation (AC-011-05, T-5.10).
 * Displays recently dispatched alerts and updates live when an alert is created.
 */
export function RecentAlertsPanel() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["recent-alerts"],
    queryFn: fetchRecentAlerts,
    refetchInterval: 15_000,
  });

  const alerts = data?.data ?? [];

  return (
    <section aria-labelledby="recent-alerts-heading">
      <div className="flex items-center justify-between">
        <h2 id="recent-alerts-heading" className="text-base font-semibold text-slate-800">
          Recent alerts
        </h2>
        <Link href="/alerts" className="text-xs font-medium text-sih-blue-600 hover:underline">
          View all ({data?.total ?? 0}) →
        </Link>
      </div>

      <div className="mt-2">
        {isLoading ? (
          <StatePanel state="loading" title="Loading alerts" message="Fetching recent dispatches." />
        ) : isError ? (
          <StatePanel state="error" message="Unable to load alerts." onRetry={() => refetch()} />
        ) : alerts.length === 0 ? (
          <StatePanel state="empty" message="No alerts have been dispatched yet." />
        ) : (
          <ul className="space-y-2">
            {alerts.map((a) => (
              <li
                key={a.alertId}
                className="flex items-center justify-between gap-2 rounded-sm border border-slate-200 bg-white p-3 hover:border-slate-300"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/alerts/${a.alertId}`}
                      className="font-mono text-sm font-semibold text-sih-blue-600 hover:underline"
                    >
                      {a.alertId}
                    </Link>
                    <span
                      className={`rounded-xs px-1.5 py-0.5 text-2xs font-semibold uppercase ${
                        a.status === "ACKNOWLEDGED"
                          ? "bg-emerald-100 text-emerald-800"
                          : a.status === "SENT"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {a.status}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-700">{a.locationName}</p>
                  <p className="text-2xs text-slate-400">{formatTimestampIst(a.createdAt)}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <RiskBadge level={a.severity} />
                  <span className="font-mono text-xs font-medium text-slate-700">{formatPaise(a.exposurePaise)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
