import type { AlertSeverity, RiskLevel } from "@cyberpulse/shared/enums";

/**
 * FR-14.2 / TC-UNIT-021. Severity derives strictly from the prediction's risk level.
 * Takes no client input and provides no override parameter, guaranteeing that
 * an alert cannot misrepresent what the predictive model output.
 */
export function deriveSeverity(riskLevel: RiskLevel): AlertSeverity {
  switch (riskLevel) {
    case "HIGH":
      return "HIGH";
    case "MEDIUM":
      return "MEDIUM";
    case "LOW":
      return "LOW";
    default: {
      const _exhaustive: never = riskLevel;
      throw new Error(`Unhandled risk level: ${_exhaustive}`);
    }
  }
}
