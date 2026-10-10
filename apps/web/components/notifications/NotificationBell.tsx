"use client"; // interaction: polls for new notifications and opens a panel

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import type { ActorRole } from "@cyberpulse/shared/enums";
import type { NotificationItem, NotificationListResponse } from "@cyberpulse/shared/notifications";
import { RiskBadge } from "@/components/common/RiskBadge";
import { StatePanel } from "@/components/common/StatePanel";
import { apiFetch } from "@/lib/apiFetch";
import { formatRiskScore, formatTimestampIst, formatWindowIst } from "@/lib/formatters";

// DEC-020. Live dashboard notifications for LEA, BANK, I4C and ADMIN: alerts
// queued to the tab's recipient group and automatic HIGH-risk notices. Polls
// every 10 s. "New" is per browser and role, kept in localStorage — a
// per-viewer convenience, so the page works the same when storage is blocked.
const POLL_MS = 10_000;
const TOAST_MS = 8_000;
const seenKey = (role: ActorRole) => `cyberpulse.notifications.seen.${role}`;

function readSeen(role: ActorRole): string | null {
  try {
    return window.localStorage.getItem(seenKey(role));
  } catch {
    return null;
  }
}

function writeSeen(role: ActorRole, value: string) {
  try {
    window.localStorage.setItem(seenKey(role), value);
  } catch {
    // Storage blocked: everything stays "new" for this viewer, nothing breaks.
  }
}

function title(n: NotificationItem): string {
  return n.kind === "ALERT_DISPATCHED" ? `Alert ${n.payload.alertId}` : "Automatic HIGH-risk notice";
}

export function NotificationBell({ role }: { role: ActorRole }) {
  const [open, setOpen] = useState(false);
  const [seenAt, setSeenAt] = useState<string | null>(null);
  const [toast, setToast] = useState<NotificationItem | null>(null);
  const newestShown = useRef<string | null | undefined>(undefined);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const query = useQuery({
    queryKey: ["notifications", role],
    queryFn: () => apiFetch<NotificationListResponse>("/api/notifications?channel=DASHBOARD&limit=20", undefined, "Notifications unavailable."),
    refetchInterval: POLL_MS,
  });
  const items = query.data?.data ?? [];

  useEffect(() => setSeenAt(readSeen(role)), [role]);

  // Toast only for messages that arrive while the tab is open, not for the
  // backlog present on first load.
  const newest = query.data?.data[0] ?? null;
  useEffect(() => {
    if (!query.isSuccess) return;
    const newestId = newest?.notificationId ?? null;
    if (newestShown.current !== undefined && newestId !== null && newestId !== newestShown.current) setToast(newest);
    newestShown.current = newestId;
  }, [newest, query.isSuccess]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  const unread = items.filter((n) => seenAt === null || n.createdAt > seenAt).length;

  // While the panel is open, everything in it counts as seen — including a
  // first load that arrives after the panel was opened.
  useEffect(() => {
    if (!open || !newest) return;
    setSeenAt(newest.createdAt);
    writeSeen(role, newest.createdAt);
  }, [open, newest, role]);

  const toggle = () => setOpen((wasOpen) => !wasOpen);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape" && open) {
      setOpen(false);
      buttonRef.current?.focus();
    }
  };

  return (
    <div className="relative" onKeyDown={onKeyDown}>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls="notification-panel"
        className="relative rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-100"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="inline h-4 w-4 align-[-3px]"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4" /></svg>
        <span className="ml-1">Notifications</span>
        {unread > 0 && (
          <span className="ml-1.5 rounded-full bg-sih-blue-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">{unread} new</span>
        )}
      </button>

      {open && (
        <div id="notification-panel" role="region" aria-label="Notifications" className="absolute right-0 z-40 mt-2 w-96 max-w-[90vw] rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
          {query.isPending ? (
            <StatePanel state="loading" title="Loading notifications" />
          ) : query.isError ? (
            <StatePanel state="error" title="Notifications unavailable" message="Retry." />
          ) : items.length === 0 ? (
            <StatePanel state="empty" title="No notifications" message="Queued alerts and HIGH-risk forecasts for this role appear here." />
          ) : (
            <ul className="max-h-[60vh] divide-y divide-slate-100 overflow-y-auto">
              {items.map((n) => (
                <li key={n.notificationId} className="py-2.5 text-sm">
                  <div className="flex items-center gap-2">
                    <RiskBadge level={n.payload.riskLevel} />
                    <span className="font-medium text-slate-800">{title(n)}</span>
                  </div>
                  <p className="mt-1 text-slate-700">
                    {n.payload.location.name}, {n.payload.location.district} · <span className="whitespace-nowrap">Risk score {formatRiskScore(n.payload.riskScore)}</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    Window {formatWindowIst(n.payload.window.start, n.payload.window.end)} · {formatTimestampIst(n.createdAt)}
                  </p>
                  {n.kind === "HIGH_RISK_NOTICE" && <p className="text-xs text-slate-500">{n.payload.note}</p>}
                  <Link
                    href={n.kind === "ALERT_DISPATCHED" ? `/alerts/${n.payload.alertId}` : `/complaints/${n.payload.complaintId}`}
                    className="text-xs font-medium text-sih-blue-600 underline"
                  >
                    {n.kind === "ALERT_DISPATCHED" ? "Open alert" : "Open complaint"}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div role="status" aria-live="polite" className="sr-only">
        {toast ? `New notification: ${title(toast)}, ${toast.payload.location.name}` : ""}
      </div>
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 w-80 rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-lg">
          <div className="flex items-center gap-2">
            <RiskBadge level={toast.payload.riskLevel} />
            <span className="font-medium text-slate-800">{title(toast)}</span>
          </div>
          <p className="mt-1 text-slate-700">{toast.payload.location.name}, {toast.payload.location.district}</p>
        </div>
      )}
    </div>
  );
}
