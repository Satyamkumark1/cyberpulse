// FR-19.1 / AC-014-01: the one-click scenario plays the walkthrough through
// without a click per step. The decision of *what to do next* is pure so it
// can be tested without a DOM — the component only wires it to a timer.

/** Step 3 runs the model. It never advances on a clock (AC-P7-04). */
export const ANALYSIS_STEP = 3;

/**
 * The run ends on step 6, which carries the alert controls and the run
 * summary. Arriving there queues nothing: an internal alert is created only by
 * pressing Queue Internal Alert, so the scenario *enables* alert queueing exactly
 * as FR-19.1 words it, and the run finishes on the summary rather than one
 * click short of it. Nothing here may ever advance past this step into an
 * action — this prototype is decision support, never automated enforcement.
 */
export const AUTO_LAST_STEP = 6;

/**
 * Long enough to read a step aloud. Presentation pacing, not a measurement.
 * Four dwelling steps at this length leave the whole scenario inside the 15 s
 * budget in AC-014-01 once the model's own time is added.
 */
export const AUTO_DWELL_MS = 2500;

export type AutoAdvance =
  | { kind: "wait" }
  | { kind: "advance"; step: number; dwellMs: number }
  | { kind: "stop" };

export interface AutoAdvanceInput {
  step: number;
  complaintReady: boolean;
  predictionSettled: boolean;
  predictionFailed: boolean;
}

export function nextAutoStep({
  step,
  complaintReady,
  predictionSettled,
  predictionFailed,
}: AutoAdvanceInput): AutoAdvance {
  // Nothing is on screen to advance through until the complaint resolves, and
  // step 3 cannot have fired its prediction yet either.
  if (!complaintReady) return { kind: "wait" };

  if (step === ANALYSIS_STEP) {
    // A failed prediction stops the run where it stands. The degraded panel
    // is the honest end state, and the remaining steps stay navigable by hand
    // (TC-E2E-023).
    if (predictionFailed) return { kind: "stop" };
    // Advance the moment the real response lands — no padding to look busier.
    if (predictionSettled) return { kind: "advance", step: step + 1, dwellMs: 0 };
    return { kind: "wait" };
  }

  if (step >= AUTO_LAST_STEP) return { kind: "stop" };

  return { kind: "advance", step: step + 1, dwellMs: AUTO_DWELL_MS };
}
