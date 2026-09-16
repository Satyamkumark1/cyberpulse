import { sql } from "drizzle-orm";
import { bigint, bigserial, check, index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { accounts } from "./accounts";
import { atms } from "./atms";
import { complaints } from "./complaints";

// architecture/database-design.md §4.4. `complaint_id` is the label column —
// what makes supervised training possible, and exactly the column that would
// be absent in production (ai/evaluation-framework.md).
export const withdrawals = pgTable(
  "withdrawals",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    withdrawalId: text("withdrawal_id").notNull(),
    accountId: bigint("account_id", { mode: "number" })
      .notNull()
      .references(() => accounts.id),
    atmId: bigint("atm_id", { mode: "number" })
      .notNull()
      .references(() => atms.id),
    complaintId: bigint("complaint_id", { mode: "number" }).references(() => complaints.id),
    amountPaise: bigint("amount_paise", { mode: "number" }).notNull(),
    timestamp: timestamp("timestamp", { withTimezone: true, mode: "string" }).notNull(),
    h3R8: text("h3_r8").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_wd_withdrawal_id").on(table.withdrawalId),
    index("idx_wd_account").on(table.accountId),
    index("idx_wd_atm_ts").on(table.atmId, table.timestamp),
    index("idx_wd_h3_ts").on(table.h3R8, table.timestamp),
    index("idx_wd_complaint").on(table.complaintId),
    check("withdrawals_amount_positive", sql`${table.amountPaise} > 0`),
  ],
);
