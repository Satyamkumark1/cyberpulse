"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RECIPIENT_KINDS, RECIPIENT_LABELS, type RecipientKind, type RiskLevel } from "@cyberpulse/shared/enums";
import { RiskBadge } from "@/components/common/RiskBadge";
import { useFocusTrap } from "@/components/common/useFocusTrap";
import { formatPaise, formatScorePercent, formatWindowIst } from "@/lib/formatters";
import { apiFetch, jsonInit } from "@/lib/apiFetch";

interface GuardPostCoverageRow {
  postId: string;
  atmId: string;
  bankName: string;
  shiftStartHourIst: number;
  shiftEndHourIst: number;
}

function formatShiftIst(startHour: number, endHour: number): string {
  const pad = (h: number) => `${String(h).padStart(2, "0")}:00`;
  return `${pad(startHour)} – ${pad(endHour)} IST`;
}

function SiteCoverage({ h3Index }: { h3Index: string }) {
  const coverage = useQuery({
    queryKey: ["guard-posts", h3Index],
    queryFn: () =>
      apiFetch<{ posts: GuardPostCoverageRow[] }>(`/api/guard-posts?h3Index=${encodeURIComponent(h3Index)}`, undefined, "coverage unavailable"),
  });

  // Coverage is supporting context, never a precondition for sending the
  // alert — a failure or an uncovered cell renders nothing at all rather than
  // an empty scaffold or a fabricated post.
  if (!coverage.data?.posts.length) return null;

  const byAtm = new Map<string, GuardPostCoverageRow[]>();
  for (const post of coverage.data.posts) {
    byAtm.set(post.atmId, [...(byAtm.get(post.atmId) ?? []), post]);
  }

  return (
    <div>
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Site Coverage</span>
      <p className="mt-1 text-xs text-slate-500">
        Staffed duty posts at ATMs in this cell. Posts are positions, not people — the operating bank holds the roster.
      </p>
      <ul className="mt-2 space-y-2">
        {[...byAtm.entries()].map(([atmId, posts]) => (
          <li key={atmId} className="text-xs text-slate-700">
            <span className="font-mono font-medium">{atmId}</span>
            <span className="text-slate-500"> · {posts[0]!.bankName}</span>
            <ul className="mt-0.5 space-y-0.5 pl-3">
              {posts.map((post) => (
                <li key={post.postId} className="flex justify-between gap-3">
                  <span className="font-mono text-slate-500">{post.postId}</span>
                  <span className="text-slate-600">{formatShiftIst(post.shiftStartHourIst, post.shiftEndHourIst)}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}

export interface AlertModalPredictionData {
  predictionRef: string;
  location: {
    name: string;
    district: string;
    state: string;
    h3Index: string;
  };
  window: {
    start: string;
    end: string;
  };
  riskScore: number;
  riskLevel: RiskLevel;
  estimatedExposurePaise: number;
  factors: {
    name: string;
    contribution: number;
    direction: "INCREASES" | "REDUCES";
  }[];
}

interface AlertModalProps {
  prediction: AlertModalPredictionData;
  onClose: () => void;
  onSuccess?: (alertId: string) => void;
  /** /demo passes `{ "x-cyberpulse-origin": "DEMO" }` so a demo-generated
   * alert lands in `origin = 'DEMO'` and is scoped by demo reset (FR-18.1). */
  headers?: HeadersInit;
}

interface CreateAlertResponse {
  alertId: string;
  status: string;
  severity: string;
  predictionRef: string;
  investigationCaseId: string;
  recipients: RecipientKind[];
  createdAt: string;
}

export function AlertModal({ prediction, onClose, onSuccess, headers }: AlertModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, true, onClose);

  const queryClient = useQueryClient();
  // The duty post at the predicted ATM is addressed by default: a predicted
  // cash-out location with nobody told about it is the case this feature
  // exists for. Site Coverage below shows which posts that reaches, and
  // renders nothing when the cell has none.
  const [recipients, setRecipients] = useState<RecipientKind[]>(["LEA", "BANK", "ATM_SITE"]);
  const [notes, setNotes] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch<CreateAlertResponse>(
        "/api/alerts",
        jsonInit("POST", { predictionRef: prediction.predictionRef, recipients, notes: notes.trim() || undefined }, headers),
        "Failed to queue internal alert",
      ),
    onSuccess: (data) => {
      // Invalidate queries so dashboard, alerts list, and investigation timeline reflect the alert
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      queryClient.invalidateQueries({ queryKey: ["investigations"] });
      queryClient.invalidateQueries({ queryKey: ["complaint"] });
      queryClient.invalidateQueries({ queryKey: ["recent-alerts"] });

      setToastMessage(`Internal alert ${data.alertId} queued for the selected prototype roles`);
      if (onSuccess) {
        onSuccess(data.alertId);
      }
      setTimeout(() => {
        onClose();
      }, 1200);
    },
  });

  const toggleRecipient = (kind: RecipientKind) => {
    setRecipients((prev) =>
      prev.includes(kind) ? prev.filter((r) => r !== kind) : [...prev, kind],
    );
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (recipients.length === 0 || mutation.isPending) return;
    mutation.mutate();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs" onClick={onClose} aria-hidden="true" />
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="alert-modal-title"
        className="fixed inset-x-4 top-1/2 z-50 mx-auto max-h-[90vh] w-full max-w-xl -translate-y-1/2 overflow-y-auto rounded-sm border border-slate-200 bg-white p-6 shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 id="alert-modal-title" className="text-base font-bold tracking-tight text-slate-900 uppercase">
            INTERNAL HIGH-RISK ALERT
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-sm p-1 text-slate-400 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sih-blue-600"
          >
            ✕
          </button>
        </div>

        {toastMessage ? (
          <div className="mt-4 rounded-sm bg-emerald-50 p-3 text-sm font-medium text-emerald-800" role="status">
            ✓ {toastMessage}
          </div>
        ) : null}

        <form onSubmit={handleSend} className="mt-4 space-y-5">
          {/* Read-Only Intelligence Block (FR-13.1, TC-UI-041, TC-UX-017) */}
          <div className="space-y-3 rounded-sm border border-slate-200 bg-slate-50/60 p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Risk Assessment</span>
              <div className="flex items-center gap-2">
                <RiskBadge level={prediction.riskLevel} />
                <span className="font-semibold text-slate-800">{formatScorePercent(prediction.riskScore)}</span>
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Predicted Hotspot</span>
              <p className="font-medium text-slate-800">
                {prediction.location.name}, {prediction.location.district}, {prediction.location.state}
              </p>
              <p className="font-mono text-xs text-slate-400">{prediction.location.h3Index}</p>
            </div>

            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Expected Withdrawal Window
              </span>
              <p className="font-medium text-slate-800">
                {formatWindowIst(prediction.window.start, prediction.window.end)}
              </p>
            </div>

            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Estimated Exposure</span>
              <p className="font-semibold text-slate-900">{formatPaise(prediction.estimatedExposurePaise)}</p>
            </div>

            {prediction.factors.length > 0 ? (
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Top Factors</span>
                <ul className="mt-1 space-y-1 text-xs">
                  {prediction.factors.slice(0, 5).map((f) => (
                    <li key={f.name} className="flex justify-between text-slate-700">
                      <span>{f.name}</span>
                      <span className={f.direction === "INCREASES" ? "text-red-700" : "text-emerald-700"}>
                        {f.direction === "INCREASES" ? "▲" : "▼"} {f.contribution.toFixed(1)}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <SiteCoverage h3Index={prediction.location.h3Index} />
          </div>

          {/* Recipient Selection Controls */}
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-slate-800">Recipients *</legend>
            <div className="flex flex-wrap gap-4">
              {RECIPIENT_KINDS.map((kind) => (
                <label key={kind} className="flex items-start gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={recipients.includes(kind)}
                    onChange={() => toggleRecipient(kind)}
                    className="mt-0.5 h-4 w-4 rounded-xs border-slate-300 text-sih-blue-600 focus:ring-sih-blue-500"
                  />
                  <span>
                    <span className="block font-medium">{RECIPIENT_LABELS[kind].label}</span>
                    <span className="block text-xs text-slate-500">{RECIPIENT_LABELS[kind].detail}</span>
                  </span>
                </label>
              ))}
            </div>

            {/* Validation message visible when 0 recipients selected (AC-011-03 / TC-UI-042) */}
            {recipients.length === 0 ? (
              <p className="text-xs font-medium text-red-600" role="alert">
                Select at least one recipient
              </p>
            ) : null}
          </fieldset>

          {/* Notes Input Control */}
          <div>
            <label htmlFor="alert-notes" className="block text-sm font-semibold text-slate-800">
              Operational Notes (optional)
            </label>
            <textarea
              id="alert-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Briefed district nodal officer."
              className="mt-1 block w-full rounded-sm border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-sih-blue-600 focus:outline-none"
            />
          </div>

          {mutation.isError ? (
            <div className="rounded-sm bg-red-50 p-2 text-xs font-medium text-red-700">
              {mutation.error.message}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-sm px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={recipients.length === 0 || mutation.isPending}
              className="rounded-sm bg-red-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {mutation.isPending ? "Queueing…" : "Queue Internal Alert"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
