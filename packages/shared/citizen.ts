import { z } from "zod";
import { CITIZEN_AMOUNT_MAX_PAISE, CITIZEN_AMOUNT_MIN_PAISE } from "./constants";
import {
  CITIZEN_STAGES,
  FRAUD_TYPES,
  type CitizenStage,
  type ComplaintStatus,
  type InvestigationStatus,
} from "./enums";

// FEAT-17 (Scam Shield) contracts — architecture/api-design.md API-100, API-101.
// Hand-written rather than generated from schemas/*.schema.json because that
// codegen also emits ML-service models, and nothing here crosses into ML.

const COMPLAINT_ID = z.string().regex(/^C-\d{5}$/, "complaintId must look like C-12345");

// 80 random bits as 16 RFC 4648 base32 characters, shown in four groups.
const TRACKING_CODE_DISPLAY = /^[A-Z2-7]{4}(-[A-Z2-7]{4}){3}$/;
const TRACKING_CODE_BARE = /^[A-Z2-7]{16}$/;

/** Accepts the code however the citizen typed it: any case, with or without
 *  the group dashes or spaces. */
export function normaliseTrackingCode(raw: string): string {
  return raw.toUpperCase().replace(/[\s-]/g, "");
}

export const CitizenReportRequest = z
  .object({
    fraudType: z.enum(FRAUD_TYPES),
    amountPaise: z.number().int().min(CITIZEN_AMOUNT_MIN_PAISE).max(CITIZEN_AMOUNT_MAX_PAISE),
    city: z.string().trim().min(1).max(64),
  })
  .strict();
export type CitizenReportRequest = z.infer<typeof CitizenReportRequest>;

export const CitizenReportResponse = z
  .object({
    complaintId: COMPLAINT_ID,
    trackingCode: z.string().regex(TRACKING_CODE_DISPLAY),
  })
  .strict();
export type CitizenReportResponse = z.infer<typeof CitizenReportResponse>;

export const CitizenStatusRequest = z
  .object({
    complaintId: COMPLAINT_ID,
    trackingCode: z
      .string()
      .max(32)
      .transform(normaliseTrackingCode)
      .pipe(z.string().regex(TRACKING_CODE_BARE, "trackingCode is 16 letters and digits")),
  })
  .strict();
export type CitizenStatusRequest = z.infer<typeof CitizenStatusRequest>;

/** Strict: no prediction field can ride along on this response (AC-017-08). */
export const CitizenStatusResponse = z
  .object({
    complaintId: COMPLAINT_ID,
    stage: z.enum(CITIZEN_STAGES),
    updatedAt: z.string().datetime(),
  })
  .strict();
export type CitizenStatusResponse = z.infer<typeof CitizenStatusResponse>;

/** Fields the server derives; a client that sends one gets a 400, never a
 *  silent ignore (.claude/rules/backend.md §Validation). */
export const CITIZEN_REPORT_DERIVED_FIELDS = [
  "complaintId",
  "status",
  "origin",
  "victimLat",
  "victimLon",
  "victimH3R8",
  "district",
  "state",
  "complaintTimestamp",
] as const;

const STAGE_OF: Record<ComplaintStatus | InvestigationStatus, CitizenStage> = {
  OPEN: "RECEIVED",
  NEW: "RECEIVED",
  ANALYZING: "UNDER_REVIEW",
  UNDER_REVIEW: "UNDER_REVIEW",
  ALERT_SENT: "ALERT_SENT",
  MONITORING: "ALERT_SENT",
  RESOLVED: "RESOLVED",
};

/** The investigation status wins when one exists: alert dispatch advances the
 *  investigation to ALERT_SENT and leaves `complaints.status` alone. */
export function citizenStageOf(
  complaintStatus: ComplaintStatus,
  investigationStatus: InvestigationStatus | null,
): CitizenStage {
  return STAGE_OF[investigationStatus ?? complaintStatus];
}
