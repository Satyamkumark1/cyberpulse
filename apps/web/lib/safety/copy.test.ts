import { describe, expect, it } from "vitest";
import { CITIZEN_STAGES, COMPLAINT_STATUSES, INVESTIGATION_STATUSES } from "@cyberpulse/shared/enums";
import { CitizenStatusRequest, CitizenStatusResponse, citizenStageOf } from "@cyberpulse/shared/citizen";
import { COPY, REPORT_NOTICE, langFrom, withLang } from "./copy";

function leafPaths(value: unknown, prefix = ""): string[] {
  if (typeof value === "string" || typeof value === "function") return [prefix];
  if (Array.isArray(value)) return value.flatMap((v, i) => leafPaths(v, `${prefix}[${i}]`));
  return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) => leafPaths(v, prefix ? `${prefix}.${k}` : k));
}

describe("Scam Shield copy — TC-SAFE-007", () => {
  it("has a Hindi string for every English string, arrays included", () => {
    expect(leafPaths(COPY.hi)).toEqual(leafPaths(COPY.en));
  });

  it("keeps the report notice fixed string exact (CLAUDE.md)", () => {
    expect(COPY.en.shell.reportNotice).toBe(
      "This prototype does not send your report to police or banks. To report, call 1930 or use cybercrime.gov.in.",
    );
    expect(REPORT_NOTICE).toBe(COPY.en.shell.reportNotice);
  });

  it("reads the language from the query string and defaults to English", () => {
    expect(langFrom("hi")).toBe("hi");
    expect(langFrom(undefined)).toBe("en");
    expect(langFrom(["hi", "en"])).toBe("en");
    expect(withLang("/safety/check", "hi")).toBe("/safety/check?lang=hi");
    expect(withLang("/safety/status?id=C-90001", "hi")).toBe("/safety/status?id=C-90001&lang=hi");
    expect(withLang("/safety", "en")).toBe("/safety");
  });
});

describe("citizen contract — TC-SAFE-006", () => {
  it("maps every complaint and investigation status to a citizen stage", () => {
    for (const status of COMPLAINT_STATUSES) expect(CITIZEN_STAGES).toContain(citizenStageOf(status, null));
    for (const status of INVESTIGATION_STATUSES) expect(CITIZEN_STAGES).toContain(citizenStageOf("OPEN", status));
  });

  it("prefers the investigation status over the complaint status", () => {
    expect(citizenStageOf("OPEN", "ALERT_SENT")).toBe("ALERT_SENT");
    expect(citizenStageOf("RESOLVED", null)).toBe("RESOLVED");
  });

  it("normalises a tracking code typed in lower case with spaces", () => {
    const parsed = CitizenStatusRequest.parse({ complaintId: "C-90001", trackingCode: "abcd efgh-ijkl mnop" });
    expect(parsed.trackingCode).toBe("ABCDEFGHIJKLMNOP");
  });

  it("rejects a status response that carries any extra field", () => {
    const base = { complaintId: "C-90001", stage: "RECEIVED", updatedAt: "2026-09-24T10:00:00.000Z" };
    expect(CitizenStatusResponse.safeParse(base).success).toBe(true);
    expect(CitizenStatusResponse.safeParse({ ...base, riskScore: 0.5 }).success).toBe(false);
  });
});
