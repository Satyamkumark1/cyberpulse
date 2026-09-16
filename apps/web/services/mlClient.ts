import { MlHealthResponse } from "@cyberpulse/shared/zod/ml-health";
import { MlPredictRequest } from "@cyberpulse/shared/zod/ml-predict-request";
import { MlPredictResponse } from "@cyberpulse/shared/zod/ml-predict-response";
import { env } from "@/lib/env";
import { MlInferenceError, MlTimeoutError, MlUnavailableError } from "@/lib/errors";
import { logger } from "@/lib/logger";

// RULE-backend.md §ML client: 8-second timeout via AbortController; the
// response is validated against the shared schema on arrival — a malformed
// ML response becomes a typed error, never a database row.
const ML_CLIENT_TIMEOUT_MS = 8_000;

/**
 * ML-001 (architecture/api-design.md §9). One retry on connection error
 * only — never on a 4xx, never on a timeout, since a retried timeout
 * doubles the caller's wait to reach the same failure
 * (low-level-design.md §5.1).
 */
export async function callPredict(
  payload: MlPredictRequest,
  requestId: string,
): Promise<MlPredictResponse> {
  try {
    return await doCallPredict(payload, requestId);
  } catch (e) {
    if (e instanceof TypeError) {
      // fetch's own network-level failure (connection refused/reset) —
      // the one case worth a single retry.
      return await doCallPredict(payload, requestId);
    }
    throw e;
  }
}

async function doCallPredict(payload: MlPredictRequest, requestId: string): Promise<MlPredictResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ML_CLIENT_TIMEOUT_MS);

  try {
    const res = await fetch(`${env.ML_SERVICE_URL}/predict`, {
      method: "POST",
      signal: controller.signal,
      headers: { "content-type": "application/json", "x-request-id": requestId },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (res.status === 503) throw new MlUnavailableError();
    if (!res.ok) throw new MlInferenceError(`ML service returned ${res.status}`);

    const parsed = MlPredictResponse.safeParse(await res.json());
    if (!parsed.success) {
      // A malformed ML response becomes a typed error, never a database
      // row (RULE-backend.md §ML client — this is a security control).
      logger.error({ requestId, issues: parsed.error.issues }, "malformed ML response");
      throw new MlInferenceError("ML response failed schema validation");
    }
    return parsed.data;
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw new MlTimeoutError();
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

export interface MlHealthCheck {
  status: "up" | "degraded" | "down";
  latencyMs: number;
  modelVersion: string | null;
  modelLoaded: boolean;
}

export async function checkMlHealth(): Promise<MlHealthCheck> {
  const start = performance.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ML_CLIENT_TIMEOUT_MS);

  try {
    const res = await fetch(`${env.ML_SERVICE_URL}/health`, { signal: controller.signal, cache: "no-store" });
    const latencyMs = Math.round(performance.now() - start);

    if (!res.ok) {
      return { status: "down", latencyMs, modelVersion: null, modelLoaded: false };
    }

    const parsed = MlHealthResponse.safeParse(await res.json());
    if (!parsed.success) {
      // A malformed response is reported as down, never trusted partially.
      return { status: "down", latencyMs, modelVersion: null, modelLoaded: false };
    }

    return {
      status: parsed.data.status === "healthy" ? "up" : parsed.data.status === "degraded" ? "degraded" : "down",
      latencyMs,
      modelVersion: parsed.data.modelVersion,
      modelLoaded: parsed.data.modelLoaded,
    };
  } catch {
    // Health never throws (API-080) — timeout, connection refused and any
    // other fetch failure are all reported as the component being down.
    const latencyMs = Math.round(performance.now() - start);
    return { status: "down", latencyMs, modelVersion: null, modelLoaded: false };
  } finally {
    clearTimeout(timeout);
  }
}
