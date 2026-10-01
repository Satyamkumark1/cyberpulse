import pino from "pino";
import { env } from "./env";

// engineering/logging-monitoring.md §5. Redaction is configured at the
// logger, not left to call sites, so a body cannot be logged even by a
// developer who forgets. No complaintId, no alertId, no note text — subject
// identifiers live in audit_events, not logs.
export const logger = pino({
  level: env.LOG_LEVEL,
  base: { service: "web", appVersion: env.APP_VERSION },
  redact: { paths: ["req.body", "res.body", "*.notes", "*.body"], remove: true },
  formatters: { level: (label) => ({ level: label }) },
  timestamp: pino.stdTimeFunctions.isoTime,
});
