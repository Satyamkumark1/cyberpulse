import type { RiskLevel } from "@cyberpulse/shared/enums";

export interface RiskThresholds {
  high: number;
  medium: number;
}

/**
 * FR-22 / TC-UNIT-022, 023. A pure mapping from a stored `riskScore` to a
 * display-only `RiskLevel`, driven by the current settings thresholds. The
 * stored score itself is never touched — only this derivation moves when a
 * threshold changes (AC-015-03). Lower bound inclusive at each cut.
 */
export function deriveRiskLevel(score: number, thresholds: RiskThresholds): RiskLevel {
  if (score >= thresholds.high) return "HIGH";
  if (score >= thresholds.medium) return "MEDIUM";
  return "LOW";
}
