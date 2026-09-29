import { describe, expect, it } from "vitest";
import { ADVISORY_SOURCES, SCENARIO_IDS, SCENARIOS, evaluateAnswers } from "./scamRules";

describe("Scam Check rules — TC-SAFE-001", () => {
  it.each(SCENARIO_IDS)("%s has exactly four questions, each with text, reason and a named source in both languages", (id) => {
    const scenario = SCENARIOS[id];
    expect(scenario.questions).toHaveLength(4);
    for (const q of scenario.questions) {
      for (const lang of ["en", "hi"] as const) {
        expect(q.text[lang].trim()).not.toBe("");
        expect(q.reason[lang].trim()).not.toBe("");
      }
      expect(ADVISORY_SOURCES[q.source]).toBeTruthy();
    }
  });

  it.each(SCENARIO_IDS)("%s ends its next steps with a 1930 instruction", (id) => {
    const last = SCENARIOS[id].steps.at(-1)!;
    expect(last.en).toContain("1930");
    expect(last.hi).toContain("1930");
  });
});

describe("evaluateAnswers — TC-SAFE-002 (AC-017-02)", () => {
  it.each([
    [0, "NONE"],
    [1, "CAUTION"],
    [2, "STOP"],
    [4, "STOP"],
  ] as const)("returns %s matched → %s", (matched, verdict) => {
    expect(evaluateAnswers(matched)).toBe(verdict);
  });
});
