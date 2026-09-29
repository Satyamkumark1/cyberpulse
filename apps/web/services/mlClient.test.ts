import { afterEach, describe, expect, it, vi } from "vitest";
import type { MlPredictRequest } from "@cyberpulse/shared/zod/ml-predict-request";
import { MlUnavailableError } from "@/lib/errors";
import { callPredict } from "./mlClient";

const payload = {} as MlPredictRequest;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("callPredict — RULE-backend.md §ML client (connection-error retry)", () => {
  it("classifies a connection failure that persists through the one retry as MlUnavailableError, not a raw TypeError (AC-P7-08)", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(callPredict(payload, "req_test")).rejects.toBeInstanceOf(MlUnavailableError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("never retries a non-network error", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({}), { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(callPredict(payload, "req_test")).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
