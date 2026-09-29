import type { CitizenReportRequest, CitizenReportResponse, CitizenStatusResponse } from "@cyberpulse/shared/citizen";

/** Carries the API's closed error code, so the page can say why, not just that
 *  something failed. Never carries server text (ADR-020). */
export class CitizenApiError extends Error {
  constructor(
    readonly code: string,
    readonly field?: string,
  ) {
    super(code);
  }
}

// /safety always calls as CITIZEN, whatever role cookie the browser holds
// (ADR-022) — a presenter switching the officer side never changes this side.
const HEADERS = { "content-type": "application/json", "x-cyberpulse-role": "CITIZEN" } as const;

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: HEADERS, body: JSON.stringify(body), cache: "no-store" });
  const json = (await res.json().catch(() => null)) as { error?: { code?: string; field?: string } } | null;
  if (!res.ok) throw new CitizenApiError(json?.error?.code ?? "UNKNOWN", json?.error?.field);
  return json as T;
}

export function submitReport(body: CitizenReportRequest): Promise<CitizenReportResponse> {
  return post("/api/citizen/reports", body);
}

export function fetchStatus(body: { complaintId: string; trackingCode: string }): Promise<CitizenStatusResponse> {
  return post("/api/citizen/reports/status", body);
}
