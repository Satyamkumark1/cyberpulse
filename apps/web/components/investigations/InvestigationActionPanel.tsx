"use client";

import { useState } from "react";
import { ApiError, apiFetch, jsonInit } from "@/lib/apiFetch";

interface Props {
  caseId: string;
  currentStatus: string;
  currentUpdatedAt: string;
  // Decided server-side from the capability matrix; the API still enforces it.
  canTransition: boolean;
  canNote: boolean;
}

// Complete UI transition map mirrors investigationStateMachine.ts, including
// permitted one-step backward moves.
const NEXT_STATUSES: Record<string, string[]> = {
  NEW: ["ANALYZING"],
  ANALYZING: ["UNDER_REVIEW"],
  UNDER_REVIEW: ["ALERT_SENT", "ANALYZING"],
  ALERT_SENT: ["MONITORING", "UNDER_REVIEW"],
  MONITORING: ["RESOLVED", "ALERT_SENT"],
  RESOLVED: [],
};

const NOTE_REQUIRED: Record<string, string[]> = {
  UNDER_REVIEW: ["ANALYZING"],
  ALERT_SENT: ["UNDER_REVIEW"],
  MONITORING: ["ALERT_SENT", "RESOLVED"],
};

export function InvestigationActionPanel({ caseId, currentStatus, currentUpdatedAt, canTransition, canNote }: Props) {
  const [targetStatus, setTargetStatus] = useState<string>("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [addingNote, setAddingNote] = useState(false);
  const [noteBody, setNoteBody] = useState("");
  const [noteLoading, setNoteLoading] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  const nextStatuses = NEXT_STATUSES[currentStatus] ?? [];

  async function handleTransition(e: React.FormEvent) {
    e.preventDefault();
    if (!targetStatus || (noteRequiredForTarget && !note.trim())) return;
    setLoading(true);
    setError(null);
    try {
      await apiFetch(
        `/api/investigations/${encodeURIComponent(caseId)}`,
        jsonInit("PATCH", { status: targetStatus, expectedUpdatedAt: currentUpdatedAt, note: note.trim() || undefined }),
        "Failed to update investigation.",
      );
      window.location.reload();
    } catch (e) {
      if (e instanceof ApiError && e.code === "CONFLICT") {
        setError("The record changed since you loaded this page. Please refresh and try again.");
      } else {
        setError(e instanceof ApiError ? e.message : "Network error — please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteBody.trim()) return;
    setNoteLoading(true);
    setNoteError(null);
    try {
      await apiFetch(`/api/investigations/${encodeURIComponent(caseId)}/notes`, jsonInit("POST", { body: noteBody.trim() }), "Failed to add note.");
      setNoteBody("");
      setAddingNote(false);
      window.location.reload();
    } catch (e) {
      setNoteError(e instanceof ApiError ? e.message : "Network error — please try again.");
    } finally {
      setNoteLoading(false);
    }
  }

  const noteRequiredForTarget = targetStatus
    ? (NOTE_REQUIRED[currentStatus] ?? []).includes(targetStatus)
    : false;

  return (
    <div className="flex flex-col gap-3 min-w-[240px]">
      {canTransition && nextStatuses.length > 0 && (
        <form onSubmit={handleTransition} className="rounded-sm border border-slate-200 bg-white p-3 space-y-2">
          <p className="text-xs font-semibold text-slate-700">Advance status</p>
          <select
            value={targetStatus}
            onChange={(e) => setTargetStatus(e.target.value)}
            className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-sih-blue-500"
          >
            <option value="">Select next status…</option>
            {nextStatuses.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
            ))}
          </select>
          {targetStatus && (
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={noteRequiredForTarget ? "Note required…" : "Optional note…"}
              rows={3}
              required={noteRequiredForTarget}
              className="w-full resize-none rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sih-blue-500"
            />
          )}
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={!targetStatus || loading || (noteRequiredForTarget && !note.trim())}
            className="w-full rounded border border-sih-blue-600 bg-sih-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sih-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sih-blue-600 disabled:opacity-50"
          >
            {loading ? "Saving…" : "Save"}
          </button>
        </form>
      )}

      {canNote && (
        <div className="rounded-sm border border-slate-200 bg-white p-3">
          {!addingNote ? (
            <button
              type="button"
              onClick={() => setAddingNote(true)}
              className="w-full rounded border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sih-blue-600"
            >
              + Add note
            </button>
          ) : (
            <form onSubmit={handleAddNote} className="space-y-2">
              <p className="text-xs font-semibold text-slate-700">New note</p>
              <textarea
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                placeholder="Enter note…"
                rows={3}
                required
                className="w-full resize-none rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sih-blue-500"
              />
              {noteError && <p className="text-xs text-red-600">{noteError}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={noteLoading || !noteBody.trim()}
                  className="rounded border border-sih-blue-600 bg-sih-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sih-blue-700 disabled:opacity-50"
                >
                  {noteLoading ? "Saving…" : "Post"}
                </button>
                <button
                  type="button"
                  onClick={() => { setAddingNote(false); setNoteBody(""); setNoteError(null); }}
                  className="rounded border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
