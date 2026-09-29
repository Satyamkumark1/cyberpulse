import { describe, expect, it } from "vitest";
import { ANALYSIS_STEP, AUTO_DWELL_MS, AUTO_LAST_STEP, nextAutoStep } from "./autoAdvance";

const base = { step: 1, complaintReady: true, predictionSettled: false, predictionFailed: false };

describe("nextAutoStep", () => {
  it("waits while the complaint is still loading", () => {
    expect(nextAutoStep({ ...base, complaintReady: false })).toEqual({ kind: "wait" });
  });

  it("dwells on a presentation step before advancing", () => {
    expect(nextAutoStep(base)).toEqual({ kind: "advance", step: 2, dwellMs: AUTO_DWELL_MS });
  });

  it("waits on the analysis step while the prediction is in flight", () => {
    expect(nextAutoStep({ ...base, step: ANALYSIS_STEP })).toEqual({ kind: "wait" });
  });

  it("leaves the analysis step with no dwell once the prediction resolves", () => {
    expect(nextAutoStep({ ...base, step: ANALYSIS_STEP, predictionSettled: true })).toEqual({
      kind: "advance",
      step: ANALYSIS_STEP + 1,
      dwellMs: 0,
    });
  });

  it("stops the run when the prediction fails", () => {
    expect(nextAutoStep({ ...base, step: ANALYSIS_STEP, predictionFailed: true })).toEqual({ kind: "stop" });
  });

  it("stops at the last auto step so the alert stays a human decision", () => {
    expect(nextAutoStep({ ...base, step: AUTO_LAST_STEP })).toEqual({ kind: "stop" });
  });

  it("stops rather than advancing if the run somehow starts past the last auto step", () => {
    expect(nextAutoStep({ ...base, step: AUTO_LAST_STEP + 1 })).toEqual({ kind: "stop" });
  });

  it("advances to the final step rather than stopping one short of the summary", () => {
    expect(nextAutoStep({ ...base, step: AUTO_LAST_STEP - 1 })).toEqual({
      kind: "advance",
      step: AUTO_LAST_STEP,
      dwellMs: AUTO_DWELL_MS,
    });
  });

  it("completes the dwelling steps within the 15 s scenario budget", () => {
    // AC-014-01. Steps 1, 2, 4 and 5 dwell; step 3 waits on the real model.
    const dwells = [1, 2, 4, 5].map((step) => nextAutoStep({ ...base, step }));
    const total = dwells.reduce((sum, a) => sum + (a.kind === "advance" ? a.dwellMs : 0), 0);
    expect(total).toBeLessThan(15_000);
  });
});
