import type { CitizenReportRequest, CitizenReportResponse, CitizenStatusResponse } from "@cyberpulse/shared/citizen";
import { apiFetch, jsonInit } from "@/lib/apiFetch";

// /safety always calls as CITIZEN, whatever role cookie the browser holds
// (ADR-022) — a presenter switching the officer side never changes this side.
const HEADERS = { "content-type": "application/json", "x-cyberpulse-role": "CITIZEN" } as const;

// Failures throw ApiError; the pages render by its closed `code` and `field`,
// never its message (ADR-020).
function post<T>(url: string, body: unknown): Promise<T> {
  return apiFetch(url, { ...jsonInit("POST", body, HEADERS), cache: "no-store" });
}

export function submitReport(body: CitizenReportRequest): Promise<CitizenReportResponse> {
  return post("/api/citizen/reports", body);
}

export function fetchStatus(body: { complaintId: string; trackingCode: string }): Promise<CitizenStatusResponse> {
  return post("/api/citizen/reports/status", body);
}
