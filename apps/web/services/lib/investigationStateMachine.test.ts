import { describe, expect, it } from "vitest";
import { INVESTIGATION_STATUSES, type InvestigationStatus } from "@cyberpulse/shared/enums";
import {
  isBackwardTransition,
  isValidTransition,
  requiresNoteForTransition,
} from "./investigationStateMachine";

describe("investigationStateMachine — TC-UNIT-025", () => {
  const validForwardPairs: [InvestigationStatus, InvestigationStatus][] = [
    ["NEW", "ANALYZING"],
    ["ANALYZING", "UNDER_REVIEW"],
    ["UNDER_REVIEW", "ALERT_SENT"],
    ["ALERT_SENT", "MONITORING"],
    ["MONITORING", "RESOLVED"],
  ];

  const validBackwardPairs: [InvestigationStatus, InvestigationStatus][] = [
    ["UNDER_REVIEW", "ANALYZING"],
    ["ALERT_SENT", "UNDER_REVIEW"],
    ["MONITORING", "ALERT_SENT"],
  ];

  it("permits every valid forward transition", () => {
    for (const [from, to] of validForwardPairs) {
      expect(isValidTransition(from, to)).toBe(true);
      expect(isBackwardTransition(from, to)).toBe(false);
    }
  });

  it("permits valid 1-step backward transitions", () => {
    for (const [from, to] of validBackwardPairs) {
      expect(isValidTransition(from, to)).toBe(true);
      expect(isBackwardTransition(from, to)).toBe(true);
      expect(requiresNoteForTransition(from, to)).toBe(true);
    }
  });

  it("requires a note for transition to RESOLVED", () => {
    expect(requiresNoteForTransition("MONITORING", "RESOLVED")).toBe(true);
  });

  it("rejects multi-step backward moves (e.g. MONITORING -> ANALYZING)", () => {
    expect(isValidTransition("MONITORING", "ANALYZING")).toBe(false);
    expect(isValidTransition("MONITORING", "NEW")).toBe(false);
    expect(isValidTransition("ALERT_SENT", "NEW")).toBe(false);
  });

  it("rejects skips in forward moves (e.g. NEW -> RESOLVED, NEW -> ALERT_SENT)", () => {
    expect(isValidTransition("NEW", "RESOLVED")).toBe(false);
    expect(isValidTransition("NEW", "UNDER_REVIEW")).toBe(false);
    expect(isValidTransition("ANALYZING", "RESOLVED")).toBe(false);
  });

  it("rejects moves out of terminal state RESOLVED", () => {
    for (const status of INVESTIGATION_STATUSES) {
      expect(isValidTransition("RESOLVED", status)).toBe(false);
    }
  });

  it("rejects identical state self-transitions", () => {
    for (const status of INVESTIGATION_STATUSES) {
      expect(isValidTransition(status, status)).toBe(false);
    }
  });
});
