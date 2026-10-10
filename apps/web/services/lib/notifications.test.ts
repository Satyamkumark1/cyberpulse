import { describe, expect, it } from "vitest";
import { buildNotificationPayload, HIGH_RISK_NOTICE_RECIPIENTS, recipientsVisibleTo } from "./notifications";

const PREDICTION = {
  predictionRef: "PRD-0042",
  complaintId: "C-10283",
  riskLevel: "HIGH" as const,
  riskScore: 0.812,
  predictedStart: "2026-10-10T08:30:00.000Z",
  predictedEnd: "2026-10-10T10:30:00.000Z",
  estimatedExposurePaise: 4_500_000,
};
const LOCATION = { name: "Connaught Place", district: "New Delhi", state: "Delhi", latitude: 28.63, longitude: 77.22 };

describe("recipientsVisibleTo (DEC-020)", () => {
  it("shows BANK the bank and ATM-site messages, as alert scope does", () => {
    expect(recipientsVisibleTo("BANK")).toEqual(["BANK", "ATM_SITE"]);
  });

  it("shows LEA only LEA messages and I4C only I4C messages", () => {
    expect(recipientsVisibleTo("LEA")).toEqual(["LEA"]);
    expect(recipientsVisibleTo("I4C")).toEqual(["I4C"]);
  });

  it("shows ADMIN every recipient group", () => {
    expect(recipientsVisibleTo("ADMIN")).toBeNull();
  });
});

describe("buildNotificationPayload (DEC-020)", () => {
  it("copies every figure from the persisted prediction and alert", () => {
    const payload = buildNotificationPayload({
      kind: "ALERT_DISPATCHED", alertId: "ALT-0007", recipient: "BANK", prediction: PREDICTION, location: LOCATION,
    });

    expect(payload).toMatchObject({
      event: "alert.dispatched",
      alertId: "ALT-0007",
      predictionRef: "PRD-0042",
      complaintId: "C-10283",
      riskLevel: "HIGH",
      riskScore: 0.812,
      window: { start: PREDICTION.predictedStart, end: PREDICTION.predictedEnd },
      estimatedExposurePaise: 4_500_000,
      location: { name: "Connaught Place", district: "New Delhi", state: "Delhi", lat: 28.63, lon: 77.22 },
      recipient: "BANK",
    });
  });

  it("marks an automatic notice as not an alert", () => {
    const payload = buildNotificationPayload({
      kind: "HIGH_RISK_NOTICE", alertId: null, recipient: "LEA", prediction: PREDICTION, location: LOCATION,
    });

    expect(payload.event).toBe("prediction.high_risk");
    expect(payload.alertId).toBeNull();
    expect(payload.note).toBe("Automatic notice, not an alert. An officer decides whether to queue one.");
  });

  it("carries no field that could hold a person's details", () => {
    const payload = buildNotificationPayload({
      kind: "ALERT_DISPATCHED", alertId: "ALT-0007", recipient: "LEA", prediction: PREDICTION, location: LOCATION,
    });
    const keys = (value: object): string[] =>
      Object.entries(value).flatMap(([k, v]) => [k.toLowerCase(), ...(v && typeof v === "object" ? keys(v) : [])]);

    for (const forbidden of ["phone", "mobile", "email", "aadhaar", "pan", "address", "accountnumber"]) {
      expect(keys(payload)).not.toContain(forbidden);
    }
  });
});

describe("HIGH_RISK_NOTICE_RECIPIENTS", () => {
  it("notifies LEA and I4C, not BANK, which sees only cases alerted to it", () => {
    expect(HIGH_RISK_NOTICE_RECIPIENTS).toEqual(["LEA", "I4C"]);
  });
});
