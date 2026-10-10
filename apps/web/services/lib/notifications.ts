import type { ActorRole, NotificationKind, RecipientKind, RiskLevel } from "@cyberpulse/shared/enums";
import type { NotificationPayload } from "@cyberpulse/shared/notifications";
import { BANK_VISIBLE_RECIPIENTS } from "./scope";

export type { NotificationPayload };

// DEC-020. Pure rules for notifications: who sees which recipient group, and
// what a message carries. No database access here, so it is unit-tested alone.

// BANK sees only cases alerted to it (services/lib/scope.ts), and a new
// HIGH-risk prediction has no alert yet, so automatic notices go to the two
// unscoped recipient groups.
export const HIGH_RISK_NOTICE_RECIPIENTS = ["LEA", "I4C"] as const satisfies readonly RecipientKind[];

const AUTO_NOTICE_NOTE = "Automatic notice, not an alert. An officer decides whether to queue one.";
const ALERT_NOTE = "Alert queued by an officer.";

/** The recipient groups a role may read, or null for every group (ADMIN).
 * Roles without alerts:read never reach this: the capability check stops them. */
export function recipientsVisibleTo(role: ActorRole): readonly RecipientKind[] | null {
  if (role === "ADMIN") return null;
  if (role === "BANK") return BANK_VISIBLE_RECIPIENTS;
  if (role === "LEA" || role === "I4C") return [role];
  return [];
}


/** The exact body shown on the dashboard and recorded for the webhook. Every
 * figure is copied from persisted rows, never computed here. */
export function buildNotificationPayload(input: {
  kind: NotificationKind;
  alertId: string | null;
  recipient: RecipientKind;
  prediction: {
    predictionRef: string;
    complaintId: string;
    riskLevel: RiskLevel;
    riskScore: number;
    predictedStart: string;
    predictedEnd: string;
    estimatedExposurePaise: number;
  };
  location: { name: string; district: string; state: string; latitude: number; longitude: number };
}): NotificationPayload {
  const { prediction: p, location: l } = input;
  return {
    event: input.kind === "ALERT_DISPATCHED" ? "alert.dispatched" : "prediction.high_risk",
    alertId: input.alertId,
    predictionRef: p.predictionRef,
    complaintId: p.complaintId,
    riskLevel: p.riskLevel,
    riskScore: p.riskScore,
    window: { start: p.predictedStart, end: p.predictedEnd },
    estimatedExposurePaise: p.estimatedExposurePaise,
    location: { name: l.name, district: l.district, state: l.state, lat: l.latitude, lon: l.longitude },
    recipient: input.recipient,
    note: input.kind === "ALERT_DISPATCHED" ? ALERT_NOTE : AUTO_NOTICE_NOTE,
  };
}
