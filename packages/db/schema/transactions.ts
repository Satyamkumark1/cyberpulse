import { sql } from "drizzle-orm";
import {
  bigint,
  bigserial,
  check,
  doublePrecision,
  index,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { accounts } from "./accounts";
import { complaints } from "./complaints";
import { riskIndicator, txnChannel } from "./enums";

// architecture/database-design.md §4.3. `hop_index` is stored, not derived,
// because both the traversal query and the linked_depth feature need it and
// recomputing it per request would be the most expensive query in the system.
export const transactions = pgTable(
  "transactions",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    transactionId: text("transaction_id").notNull(),
    complaintId: bigint("complaint_id", { mode: "number" }).references(() => complaints.id, {
      onDelete: "restrict",
    }),
    fromAccountId: bigint("from_account_id", { mode: "number" })
      .notNull()
      .references(() => accounts.id),
    toAccountId: bigint("to_account_id", { mode: "number" })
      .notNull()
      .references(() => accounts.id),
    amountPaise: bigint("amount_paise", { mode: "number" }).notNull(),
    timestamp: timestamp("timestamp", { withTimezone: true, mode: "string" }).notNull(),
    channel: txnChannel("channel").notNull(),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    h3R8: text("h3_r8"),
    riskIndicator: riskIndicator("risk_indicator").notNull().default("NONE"),
    hopIndex: smallint("hop_index").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_txn_transaction_id").on(table.transactionId),
    index("idx_txn_from_ts").on(table.fromAccountId, table.timestamp),
    index("idx_txn_to_ts").on(table.toAccountId, table.timestamp),
    index("idx_txn_complaint").on(table.complaintId),
    index("idx_txn_ts").on(table.timestamp.desc()),
    index("idx_txn_risk").on(table.riskIndicator),
    check("transactions_transaction_id_format", sql`${table.transactionId} ~ '^TXN-[0-9]{10}$'`),
    check("transactions_amount_positive", sql`${table.amountPaise} > 0`),
    check("transactions_no_self_transfer", sql`${table.fromAccountId} <> ${table.toAccountId}`),
  ],
);
