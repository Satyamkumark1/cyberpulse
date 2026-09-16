import { sql } from "drizzle-orm";
import { bigserial, check, index, pgTable, real, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { accountStatus, accountType } from "./enums";

// architecture/database-design.md §4.2. No name, address or contact column,
// by design (FR-01.7, CR-01) — the schema cannot hold personal data because
// no column exists for it.
export const accounts = pgTable(
  "accounts",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    accountId: text("account_id").notNull(),
    accountType: accountType("account_type").notNull(),
    bankName: text("bank_name").notNull(),
    riskScore: real("risk_score").notNull().default(0),
    openedAt: timestamp("opened_at", { withTimezone: true, mode: "string" }).notNull(),
    lastActivity: timestamp("last_activity", { withTimezone: true, mode: "string" }),
    status: accountStatus("status").notNull().default("ACTIVE"),
    homeH3R8: text("home_h3_r8"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_accounts_account_id").on(table.accountId),
    index("idx_accounts_risk").on(table.riskScore.desc()),
    check("accounts_account_id_format", sql`${table.accountId} ~ '^ACC-[0-9]{8}$'`),
    check("accounts_risk_score_range", sql`${table.riskScore} BETWEEN 0 AND 1`),
  ],
);
