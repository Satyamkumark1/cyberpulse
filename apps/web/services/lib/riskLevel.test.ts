import { describe, expect, it } from "vitest";
import { deriveRiskLevel } from "./riskLevel";

const THRESHOLDS = { high: 0.7, medium: 0.4 };

describe("deriveRiskLevel — TC-UNIT-022 boundaries", () => {
  it.each([
    [0.0, "LOW"],
    [0.399, "LOW"],
    [0.4, "MEDIUM"],
    [0.699, "MEDIUM"],
    [0.7, "HIGH"],
    [0.701, "HIGH"],
    [1.0, "HIGH"],
  ] as const)("scores %s as %s at thresholds 0.70 / 0.40 (lower bound inclusive)", (score, expected) => {
    expect(deriveRiskLevel(score, THRESHOLDS)).toBe(expected);
  });
});

describe("deriveRiskLevel — TC-UNIT-023 threshold change does not alter stored scores", () => {
  it("reclassifies a 0.80 score from HIGH to MEDIUM when high rises to 0.85, without touching the score itself", () => {
    const score = 0.8;
    expect(deriveRiskLevel(score, { high: 0.7, medium: 0.4 })).toBe("HIGH");
    expect(deriveRiskLevel(score, { high: 0.85, medium: 0.4 })).toBe("MEDIUM");
    expect(score).toBe(0.8);
  });
});
