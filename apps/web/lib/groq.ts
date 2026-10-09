import { env } from "@/lib/env";

const GROQ_BASE = "https://api.groq.com/openai/v1";

// DEC-016: a response that is about this key, not this request, moves on to the
// next key. Any other status — including a 400 — is returned as is.
const KEY_FAILURES = new Set([401, 403, 429, 500, 502, 503, 504]);

/** Sends one request, trying each key in order until one is not refused for a
 *  key-level reason. A network error or timeout throws without trying the next
 *  key, since it says nothing about the key. Returns the last response otherwise. */
export async function groqFetchWith(keys: readonly string[], path: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  let last: Response | undefined;
  for (const key of keys) {
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${key}`);
    last = await fetch(`${GROQ_BASE}/${path}`, { ...init, headers, cache: "no-store", signal: AbortSignal.timeout(timeoutMs) });
    if (!KEY_FAILURES.has(last.status)) return last;
  }
  if (!last) throw new Error("No Groq key configured");
  return last;
}

const KEYS = [...new Set([env.GROQ_API_KEY, env.GROQ_API_KEY_FALLBACK].filter((key): key is string => Boolean(key)))];

export const groqConfigured = KEYS.length > 0;

export function groqFetch(path: string, init: RequestInit, timeoutMs = 15_000): Promise<Response> {
  return groqFetchWith(KEYS, path, init, timeoutMs);
}
