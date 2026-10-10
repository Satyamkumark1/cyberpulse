import type { NotificationChannel, NotificationKind, NotificationStatus, RecipientKind, RiskLevel } from "./enums";

// DEC-020, architecture/api-design.md API-110. The body of one notification:
// shown on the dashboard, and recorded as the webhook that would be POSTed.
// Every figure is copied from persisted rows. Addressed to a recipient
// group, never a person — there is no field for a person's details.
export interface NotificationPayload {
  event: "alert.dispatched" | "prediction.high_risk";
  alertId: string | null;
  predictionRef: string;
  complaintId: string;
  riskLevel: RiskLevel;
  riskScore: number;
  window: { start: string; end: string };
  estimatedExposurePaise: number;
  location: { name: string; district: string; state: string; lat: number; lon: number };
  recipient: RecipientKind;
  note: string;
}

export interface NotificationItem {
  notificationId: string;
  kind: NotificationKind;
  channel: NotificationChannel;
  recipient: RecipientKind;
  status: NotificationStatus;
  payload: NotificationPayload;
  createdAt: string;
}

export interface NotificationListResponse {
  data: NotificationItem[];
}
