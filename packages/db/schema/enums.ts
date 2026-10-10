import { pgEnum } from "drizzle-orm/pg-core";
import {
  FRAUD_TYPES,
  COMPLAINT_STATUSES,
  ACCOUNT_TYPES,
  ACCOUNT_STATUSES,
  TXN_CHANNELS,
  RISK_INDICATORS,
  RISK_LEVELS,
  CONFIDENCE_LEVELS,
  FACTOR_DIRECTIONS,
  ALERT_STATUSES,
  ALERT_SEVERITIES,
  RECIPIENT_KINDS,
  INVESTIGATION_STATUSES,
  PRIORITY_LEVELS,
  ACTOR_ROLES,
  RECORD_ORIGINS,
  ATM_STATUSES,
  NOTIFICATION_KINDS,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_STATUSES,
} from "@cyberpulse/shared/enums";

// Postgres enums so an invalid value cannot be written by any client
// (architecture/database-design.md Design Rule 7). Values come from the one
// shared definition — never restated by hand.
export const fraudType = pgEnum("fraud_type", FRAUD_TYPES);
export const complaintStatus = pgEnum("complaint_status", COMPLAINT_STATUSES);
export const accountType = pgEnum("account_type", ACCOUNT_TYPES);
export const accountStatus = pgEnum("account_status", ACCOUNT_STATUSES);
export const txnChannel = pgEnum("txn_channel", TXN_CHANNELS);
export const riskIndicator = pgEnum("risk_indicator", RISK_INDICATORS);
export const riskLevel = pgEnum("risk_level", RISK_LEVELS);
export const confidenceLevel = pgEnum("confidence_level", CONFIDENCE_LEVELS);
export const factorDirection = pgEnum("factor_direction", FACTOR_DIRECTIONS);
export const alertStatus = pgEnum("alert_status", ALERT_STATUSES);
export const alertSeverity = pgEnum("alert_severity", ALERT_SEVERITIES);
export const recipientKind = pgEnum("recipient_kind", RECIPIENT_KINDS);
export const investigationStatus = pgEnum("investigation_status", INVESTIGATION_STATUSES);
export const priorityLevel = pgEnum("priority_level", PRIORITY_LEVELS);
export const actorRole = pgEnum("actor_role", ACTOR_ROLES);
export const recordOrigin = pgEnum("record_origin", RECORD_ORIGINS);
export const atmStatus = pgEnum("atm_status", ATM_STATUSES);
export const notificationKind = pgEnum("notification_kind", NOTIFICATION_KINDS);
export const notificationChannel = pgEnum("notification_channel", NOTIFICATION_CHANNELS);
export const notificationStatus = pgEnum("notification_status", NOTIFICATION_STATUSES);
