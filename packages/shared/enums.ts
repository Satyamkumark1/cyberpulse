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

export const RECIPIENT_KINDS = ["LEA", "BANK", "I4C"] as const;
export type RecipientKind = (typeof RECIPIENT_KINDS)[number];

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

export const ACTOR_ROLES = ["LEA", "BANK", "ADMIN"] as const;
export type ActorRole = (typeof ACTOR_ROLES)[number];

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
