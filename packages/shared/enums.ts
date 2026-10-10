// The single definition of every enumerated value in the system
// (architecture/database-design.md §3). packages/db's pgEnum columns and
// every Zod enum derive from these arrays — never restate a value by hand.

export const FRAUD_TYPES = [
  "UPI_FRAUD",
  "INVESTMENT_SCAM",
  "PHISHING",
  "JOB_SCAM",
  "QR_FRAUD",
  "CARD_FRAUD",
] as const;
export type FraudType = (typeof FRAUD_TYPES)[number];

export const COMPLAINT_STATUSES = [
  "OPEN",
  "ANALYZING",
  "UNDER_REVIEW",
  "ALERT_SENT",
  "MONITORING",
  "RESOLVED",
] as const;
export type ComplaintStatus = (typeof COMPLAINT_STATUSES)[number];

export const ACCOUNT_TYPES = ["VICTIM", "MULE", "SUSPICIOUS", "MERCHANT", "NORMAL"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const ACCOUNT_STATUSES = ["ACTIVE", "DORMANT", "FROZEN_SIMULATED", "CLOSED"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const TXN_CHANNELS = ["UPI", "IMPS", "NEFT", "RTGS", "CARD", "ATM", "WALLET"] as const;
export type TxnChannel = (typeof TXN_CHANNELS)[number];

export const RISK_INDICATORS = ["NONE", "LOW", "MEDIUM", "HIGH"] as const;
export type RiskIndicator = (typeof RISK_INDICATORS)[number];

export const RISK_LEVELS = ["LOW", "MEDIUM", "HIGH"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const CONFIDENCE_LEVELS = ["LOW", "MEDIUM", "HIGH"] as const;
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

export const FACTOR_DIRECTIONS = ["INCREASES", "REDUCES"] as const;
export type FactorDirection = (typeof FACTOR_DIRECTIONS)[number];

export const ALERT_STATUSES = ["DRAFT", "SENT", "ACKNOWLEDGED", "CLOSED"] as const;
export type AlertStatus = (typeof ALERT_STATUSES)[number];

export const ALERT_SEVERITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export type AlertSeverity = (typeof ALERT_SEVERITIES)[number];

export const RECIPIENT_KINDS = ["LEA", "BANK", "I4C", "ATM_SITE"] as const;
export type RecipientKind = (typeof RECIPIENT_KINDS)[number];

// DEC-020: what a notification is about, where it goes, and what happened to
// it. WEBHOOK messages are always SIMULATED in the prototype — built exactly
// as they would be sent and recorded in the outbox, never sent.
export const NOTIFICATION_KINDS = ["ALERT_DISPATCHED", "HIGH_RISK_NOTICE"] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export const NOTIFICATION_CHANNELS = ["DASHBOARD", "WEBHOOK"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_STATUSES = ["DELIVERED", "SIMULATED"] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

/**
 * How each destination reads to an officer. Held here, not in a component, so
 * the alert modal and the alert detail page cannot drift apart.
 *
 * `ATM_SITE` addresses the staffed duty **post** at the predicted ATM, never a
 * named individual: this schema holds no guard identity or contact number, and
 * the operating bank cascades to whoever is on shift (see DEC-010).
 */
export const RECIPIENT_LABELS: Record<RecipientKind, { label: string; detail: string }> = {
  LEA: { label: "Local Police — Cyber Crime Cell", detail: "District cyber crime unit for the predicted area" },
  BANK: { label: "Bank Cyber Cell — Fraud Desk", detail: "Reviews the linked accounts in the money trail" },
  I4C: { label: "I4C — Cybercrime Coordination Centre", detail: "National coordination" },
  ATM_SITE: {
    label: "ATM Site Security — Duty Post",
    detail: "The staffed post at the predicted ATM; the operating bank cascades to whoever is on shift",
  },
};

export const INVESTIGATION_STATUSES = [
  "NEW",
  "ANALYZING",
  "UNDER_REVIEW",
  "ALERT_SENT",
  "MONITORING",
  "RESOLVED",
] as const;
export type InvestigationStatus = (typeof INVESTIGATION_STATUSES)[number];

export const PRIORITY_LEVELS = ["LOW", "MEDIUM", "HIGH"] as const;
export type PriorityLevel = (typeof PRIORITY_LEVELS)[number];

// GUARD (ATM Site Guard) and I4C (Intelligence Analyst, I4C CIS Division —
// PER-02) extend the same asserted-not-verified role model ADR-019 already
// uses for LEA/BANK/ADMIN — see ADR-021 and decision-log DEC-011. Neither
// stores or implies a real identity; GUARD's dashboard content stays
// positional/duty-post data only, never a specific assignment.
// CITIZEN (ADR-022, DEC-013) is the public Scam Shield caller: no officer
// capability, and it stores no identity either.
export const ACTOR_ROLES = ["LEA", "BANK", "ADMIN", "GUARD", "I4C", "CITIZEN"] as const;
export type ActorRole = (typeof ACTOR_ROLES)[number];

// FEAT-17. The only progress a citizen ever sees for their own report —
// derived from the investigation (or complaint) status, never from a prediction.
export const CITIZEN_STAGES = ["RECEIVED", "UNDER_REVIEW", "ALERT_SENT", "RESOLVED"] as const;
export type CitizenStage = (typeof CITIZEN_STAGES)[number];

export const RECORD_ORIGINS = ["SEED", "USER", "DEMO"] as const;
export type RecordOrigin = (typeof RECORD_ORIGINS)[number];

export const ATM_STATUSES = ["ACTIVE", "INACTIVE", "MAINTENANCE"] as const;
export type AtmStatus = (typeof ATM_STATUSES)[number];

// FEATURE_SPECIFICATIONS.md FEAT-09 §Mapping / app/engine/explain.py FACTOR_MAP.
// A raw feature identifier (e.g. "txn_velocity_1h") cannot pass this enum —
// that closure is what makes FR-10.2 a runtime guarantee, not a convention.
export const FACTOR_NAMES = [
  "Transaction Velocity",
  "Historical Hotspot",
  "Linked Account Pattern",
  "ATM Proximity",
  "Time Pattern",
  "Amount / Frequency",
  "Account Age",
  "Withdrawal History",
  "Other factors",
] as const;
export type FactorNameValue = (typeof FACTOR_NAMES)[number];

export const ERROR_CODES = [
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "INVALID_TRANSITION",
  "CONFLICT",
  "RATE_LIMITED",
  "INTERNAL_ERROR",
  "ML_UNAVAILABLE",
  "TIMEOUT",
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];
