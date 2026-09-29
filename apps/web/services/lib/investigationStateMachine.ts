import type { InvestigationStatus } from "@cyberpulse/shared/enums";

// UF-04 / FEATURE_SPECIFICATIONS.md FEAT-12: The 6 lifecycle states and valid transitions.
const FORWARD_TRANSITIONS: Readonly<Record<InvestigationStatus, InvestigationStatus | null>> = {
  NEW: "ANALYZING",
  ANALYZING: "UNDER_REVIEW",
  UNDER_REVIEW: "ALERT_SENT",
  ALERT_SENT: "MONITORING",
  MONITORING: "RESOLVED",
  RESOLVED: null,
};

const BACKWARD_TRANSITIONS: Readonly<Record<InvestigationStatus, InvestigationStatus | null>> = {
  NEW: null,
  ANALYZING: null,
  UNDER_REVIEW: "ANALYZING",
  ALERT_SENT: "UNDER_REVIEW",
  MONITORING: "ALERT_SENT",
  RESOLVED: null,
};

/**
 * Returns true if moving from `from` to `to` is permitted by the state machine.
 */
export function isValidTransition(from: InvestigationStatus, to: InvestigationStatus): boolean {
  if (from === to) return false;
  return FORWARD_TRANSITIONS[from] === to || BACKWARD_TRANSITIONS[from] === to;
}

/**
 * Returns true if the transition is backward (limited to exactly one step).
 */
export function isBackwardTransition(from: InvestigationStatus, to: InvestigationStatus): boolean {
  return BACKWARD_TRANSITIONS[from] === to;
}

/**
 * AC-P5-12 / AC-P5-13: Backward transitions and transitions to RESOLVED require a note.
 */
export function requiresNoteForTransition(from: InvestigationStatus, to: InvestigationStatus): boolean {
  if (to === "RESOLVED") return true;
  return isBackwardTransition(from, to);
}
