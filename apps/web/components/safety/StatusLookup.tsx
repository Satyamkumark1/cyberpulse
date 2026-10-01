"use client"; // mutation with in-flight state: the lookup posts the tracking code in a body, never a URL

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { formatTimestampIst } from "@/lib/formatters";
import { COPY, type Lang } from "@/lib/safety/copy";
import { loadLastReport, type LastReport } from "@/lib/safety/lastReport";
import { fetchStatus } from "./citizenApi";
import { ApiError } from "@/lib/apiFetch";
import { StatusTimeline } from "./StatusTimeline";

/** FEAT-17 status lookup (FR-29, AC-017-07, AC-017-10). Never cached: the
 *  stage shown is the one this request returned. */
export function StatusLookup({ lang, initialComplaintId }: { lang: Lang; initialComplaintId: string | null }) {
  const t = COPY[lang].status;
  const mutation = useMutation({ mutationFn: fetchStatus, retry: false });
  const idRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  // Browser API: session storage exists only after mount, never on the server.
  const [last, setLast] = useState<LastReport | null>(null);
  useEffect(() => setLast(loadLastReport()), []);

  const fillLastReport = () => {
    if (!last) return;
    if (idRef.current) idRef.current.value = last.complaintId;
    if (codeRef.current) codeRef.current.value = last.trackingCode;
    mutation.mutate(last);
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    mutation.mutate({
      complaintId: String(form.get("complaintId") ?? "").trim().toUpperCase(),
      trackingCode: String(form.get("trackingCode") ?? ""),
    });
  };

  const errorText =
    mutation.error instanceof ApiError
      ? mutation.error.code === "NOT_FOUND"
        ? t.notFound
        : mutation.error.code === "VALIDATION_ERROR"
          ? t.invalid
          : t.generic
      : mutation.isError
        ? t.generic
        : null;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
        <div className="space-y-1">
          <label htmlFor="status-complaintId" className="block text-sm font-semibold text-slate-800">
            {t.idLabel}
          </label>
          <p id="status-complaintId-hint" className="text-xs text-slate-600">
            {t.idHint}
          </p>
          <input
            id="status-complaintId"
            ref={idRef}
            name="complaintId"
            defaultValue={initialComplaintId ?? ""}
            aria-describedby="status-complaintId-hint"
            autoComplete="off"
            spellCheck={false}
            className="min-h-11 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-800"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="status-trackingCode" className="block text-sm font-semibold text-slate-800">
            {t.codeLabel}
          </label>
          <p id="status-trackingCode-hint" className="text-xs text-slate-600">
            {t.codeHint}
          </p>
          <input
            id="status-trackingCode"
            ref={codeRef}
            name="trackingCode"
            aria-describedby="status-trackingCode-hint"
            autoComplete="off"
            spellCheck={false}
            className="min-h-11 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm uppercase text-slate-800"
          />
        </div>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="min-h-11 rounded-md bg-sih-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-sih-blue-500 disabled:opacity-60"
        >
          {mutation.isPending ? t.submitting : t.submit}
        </button>
        {last ? (
          <button
            type="button"
            onClick={fillLastReport}
            disabled={mutation.isPending}
            className="ml-3 min-h-11 rounded-md border border-sih-blue-600 px-4 py-2 text-sm font-semibold text-sih-blue-600 hover:bg-slate-50 disabled:opacity-60"
          >
            {t.useLast}: <span className="font-mono">{last.complaintId}</span>
          </button>
        ) : null}
      </form>

      <section aria-labelledby="status-progress-heading" className="space-y-4">
        <div role="status" aria-live="polite" className="space-y-4">
          {errorText ? (
            <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">
              <span aria-hidden="true">▲ </span>
              {errorText}
            </p>
          ) : null}
          {mutation.data ? (
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h2 id="status-progress-heading" className="text-base font-semibold text-slate-800">
                {t.progress} · <span className="font-mono">{mutation.data.complaintId}</span>
              </h2>
              <div className="mt-4">
                <StatusTimeline lang={lang} stage={mutation.data.stage} />
              </div>
              <p className="mt-4 text-xs text-slate-600">
                {t.updated}: {formatTimestampIst(mutation.data.updatedAt)}
              </p>
            </div>
          ) : (
            <h2 id="status-progress-heading" className="sr-only">
              {t.progress}
            </h2>
          )}
        </div>
        <p className="rounded-md bg-slate-100 p-3 text-sm text-slate-600">{t.note}</p>
      </section>
    </div>
  );
}
