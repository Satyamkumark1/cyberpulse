"use client";

import { useMutation } from "@tanstack/react-query";
import type { PredictionResponse } from "@cyberpulse/shared/zod/prediction";

interface ApiError {
  error: { code: string; message: string };
}

async function requestPrediction(complaintId: string, forceRefresh: boolean, headers?: HeadersInit): Promise<PredictionResponse> {
  const requestHeaders = new Headers(headers);
  requestHeaders.set("content-type", "application/json");
  const res = await fetch("/api/predict", {
    method: "POST",
    headers: requestHeaders,
    body: JSON.stringify({ complaintId, forceRefresh }),
  });
  if (!res.ok) {
    const body = (await res.json()) as ApiError;
    throw new Error(body.error.message);
  }
  return res.json();
}

/**
 * The single path to `POST /api/predict`. Both the complaint detail page's
 * `PredictionPanel` and the `/demo` walkthrough call this same hook — the
 * guard the phase risk register names against a scripted demo (TC-INT-012,
 * TC-FAB-008): there is no second, demo-only way to obtain a prediction.
 *
 * `headers` lets a caller tag the request `x-cyberpulse-origin: DEMO` so a
 * demo run's alert lands in `origin = 'DEMO'` and is scoped by demo reset.
 */
export function usePrediction(complaintId: string, headers?: HeadersInit) {
  return useMutation({
    mutationFn: (forceRefresh: boolean) => requestPrediction(complaintId, forceRefresh, headers),
  });
}
