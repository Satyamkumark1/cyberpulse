import type { ErrorEnvelope } from "@cyberpulse/shared/zod/error";

type ErrorCode = ErrorEnvelope["error"]["code"];

/** Carries the API's closed error code so the UI can say *why*, not just that
 *  something failed (an ordinary 403 used to read as a broken server). */
export class ApiError extends Error {
  constructor(
    readonly code: ErrorCode | "UNKNOWN",
    message: string,
    readonly field?: string,
  ) {
    super(message);
  }
}

/** The one client-side reader of the single error serialiser's envelope.
 *  `fallbackMessage` is used only when the body is not an envelope. */
export async function apiFetch<T>(url: string, init?: RequestInit, fallbackMessage = "Request failed."): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as Partial<ErrorEnvelope> | null;
    throw new ApiError(body?.error?.code ?? "UNKNOWN", body?.error?.message ?? fallbackMessage, body?.error?.field);
  }
  return res.json() as Promise<T>;
}

/** JSON body helper for POST/PATCH calls. */
export function jsonInit(method: "POST" | "PATCH", body: unknown, headers?: HeadersInit): RequestInit {
  const merged = new Headers(headers);
  merged.set("Content-Type", "application/json");
  return { method, headers: merged, body: JSON.stringify(body) };
}
