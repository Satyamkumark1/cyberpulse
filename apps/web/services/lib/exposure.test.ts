import { describe, expect, it } from "vitest";
import { isEligibleForExposure, HORIZON_HOURS } from "./exposure";

describe("exposure calculation logic — TC-UNIT-020", () => {
  const referenceTime = "2026-09-15T12:00:00.000Z";

  it("includes unresolved complaints within the 24-hour horizon", () => {
    const complaint = {
      status: "OPEN",
      complaintTimestamp: "2026-09-15T06:00:00.000Z", // 6 hours prior
      amountPaise: 500000,
    };
    expect(isEligibleForExposure(complaint, referenceTime)).toBe(true);
  });

  it("excludes complaints with status RESOLVED even if within horizon", () => {
    const resolvedComplaint = {
      status: "RESOLVED",
      complaintTimestamp: "2026-09-15T10:00:00.000Z",
      amountPaise: 300000,
    };
    expect(isEligibleForExposure(resolvedComplaint, referenceTime)).toBe(false);
  });

  it("excludes complaints outside the 24-hour horizon (earlier or later)", () => {
    const pastComplaint = {
      status: "OPEN",
      complaintTimestamp: "2026-09-14T11:00:00.000Z", // 25 hours prior
      amountPaise: 200000,
    };
    const futureComplaint = {
      status: "OPEN",
      complaintTimestamp: "2026-09-16T13:00:00.000Z", // 25 hours future
      amountPaise: 200000,
    };

    expect(isEligibleForExposure(pastComplaint, referenceTime)).toBe(false);
    expect(isEligibleForExposure(futureComplaint, referenceTime)).toBe(false);
  });

  it("sums only the unresolved in-horizon complaints in integer paise", () => {
    const complaints = [
      { status: "OPEN", complaintTimestamp: "2026-09-15T10:00:00.000Z", amountPaise: 50000 },
      { status: "UNDER_REVIEW", complaintTimestamp: "2026-09-15T14:00:00.000Z", amountPaise: 75000 },
      { status: "RESOLVED", complaintTimestamp: "2026-09-15T11:00:00.000Z", amountPaise: 100000 },
      { status: "OPEN", complaintTimestamp: "2026-09-14T08:00:00.000Z", amountPaise: 80000 }, // outside 24h
    ];

    const eligibleTotal = complaints
      .filter((c) => isEligibleForExposure(c, referenceTime))
      .reduce((sum, c) => sum + c.amountPaise, 0);

    expect(eligibleTotal).toBe(125000);
    expect(Number.isInteger(eligibleTotal)).toBe(true);
    expect(HORIZON_HOURS).toBe(24);
  });
});
