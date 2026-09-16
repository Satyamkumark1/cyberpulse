/**
 * Loads the generated corpus into Postgres. Idempotent — truncates every
 * table (CASCADE handles dependency order) inside one transaction, then
 * inserts. Verifies every manifest.json checksum first; a substituted file
 * is rejected, not loaded (RULE-database.md §Seeding, AC-P2-07, TC-P2-04).
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_THRESHOLD_HIGH, DEFAULT_THRESHOLD_MEDIUM, MODEL_VERSION } from "@cyberpulse/shared/constants";
import type { AccountType, FraudType, RiskIndicator, TxnChannel } from "@cyberpulse/shared/enums";
import { sql } from "drizzle-orm";
import { db } from "../client";
import * as schema from "../schema";

const DATA_DIR = join(import.meta.dirname, "..", "..", "..", "data", "generated");

const ALL_TABLES = [
  "analytics_events", "audit_events", "investigation_notes", "investigations",
  "alerts", "risk_factors", "predictions", "simulation_events",
  "withdrawals", "transactions", "hotspots", "atms", "accounts", "complaints",
  "model_metrics", "settings",
] as const;

function sha256Of(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function verifyManifest(): { seed: number; files: string[] } {
  const manifest = JSON.parse(readFileSync(join(DATA_DIR, "manifest.json"), "utf-8"));
  const mismatched: string[] = [];
  for (const [name, expectedHash] of Object.entries(manifest.files as Record<string, string>)) {
    const actual = sha256Of(join(DATA_DIR, name));
    if (actual !== expectedHash) mismatched.push(name);
  }
  if (mismatched.length > 0) {
    throw new Error(`manifest checksum mismatch, seeding aborted: ${mismatched.join(", ")}`);
  }
  return { seed: manifest.seed, files: Object.keys(manifest.files) };
}

// No embedded commas or quotes in any generator field (generator.py writes
// plain identifiers, ISO timestamps and simple place names) — a plain split
// is correct for this controlled input and avoids a CSV-parsing dependency.
function parseCsv(text: string): Record<string, string>[] {
  // Python's csv.writer (opened with newline="") emits CRLF line endings —
  // split on \r?\n or a trailing \r sticks to the last column of every row.
  const lines = text.trim().split(/\r?\n/);
  const header = lines[0]!.split(",");
  return lines.slice(1).map((line) => {
    const cells = line.split(",");
    return Object.fromEntries(header.map((col, i) => [col, cells[i] ?? ""]));
  });
}

function readCsv(name: string): Record<string, string>[] {
  return parseCsv(readFileSync(join(DATA_DIR, name), "utf-8"));
}

function orNull(value: string): string | null {
  return value === "" ? null : value;
}

async function main(): Promise<void> {
  const { seed } = verifyManifest();
  console.log(`manifest verified, seed=${seed}`);

  const complaintRows = readCsv("complaints.csv");
  const accountRows = readCsv("accounts.csv");
  const atmRows = readCsv("atms.csv");
  const transactionRows = readCsv("transactions.csv");
  const withdrawalRows = readCsv("withdrawals.csv");

  await db.transaction(async (tx) => {
    await tx.execute(sql.raw(`TRUNCATE TABLE ${ALL_TABLES.join(", ")} RESTART IDENTITY CASCADE`));

    const BATCH = 1000;

    // Batched, not per-row: a plain multi-row VALUES ... RETURNING preserves
    // input order in Postgres, so results can be zipped positionally with
    // the source rows without a round trip per row (TC-P2-03's 90s budget
    // for 75,000 rows would not survive one insert per row).
    const complaintIdMap = new Map<string, number>();
    for (let i = 0; i < complaintRows.length; i += BATCH) {
      const rows = complaintRows.slice(i, i + BATCH);
      const inserted = await tx
        .insert(schema.complaints)
        .values(
          rows.map((row) => ({
            complaintId: row.complaintId!,
            fraudType: row.fraudType as FraudType,
            amountPaise: Number(row.amountPaise),
            complaintTimestamp: row.complaintTimestamp!,
            victimLat: Number(row.victimLat),
            victimLon: Number(row.victimLon),
            victimH3R8: row.victimH3R8!,
            city: row.city!,
            district: row.district!,
            state: row.state!,
          })),
        )
        .returning({ id: schema.complaints.id });
      rows.forEach((row, idx) => complaintIdMap.set(row.complaintId!, inserted[idx]!.id));
    }

    const accountIdMap = new Map<string, number>();
    for (let i = 0; i < accountRows.length; i += BATCH) {
      const rows = accountRows.slice(i, i + BATCH);
      const inserted = await tx
        .insert(schema.accounts)
        .values(
          rows.map((row) => ({
            accountId: row.accountId!,
            accountType: row.accountType as AccountType,
            bankName: row.bankName!,
            riskScore: Number(row.riskScore),
            openedAt: row.openedAt!,
            homeH3R8: orNull(row.homeH3R8!),
          })),
        )
        .returning({ id: schema.accounts.id });
      rows.forEach((row, idx) => accountIdMap.set(row.accountId!, inserted[idx]!.id));
    }

    const atmIdMap = new Map<string, number>();
    for (let i = 0; i < atmRows.length; i += BATCH) {
      const rows = atmRows.slice(i, i + BATCH);
      const inserted = await tx
        .insert(schema.atms)
        .values(
          rows.map((row) => ({
            atmId: row.atmId!,
            bankName: row.bankName!,
            latitude: Number(row.latitude),
            longitude: Number(row.longitude),
            h3R8: row.h3R8!,
            h3R9: row.h3R9!,
            city: row.city!,
            district: row.district!,
            state: row.state!,
          })),
        )
        .returning({ id: schema.atms.id });
      rows.forEach((row, idx) => atmIdMap.set(row.atmId!, inserted[idx]!.id));
    }
    for (let i = 0; i < transactionRows.length; i += BATCH) {
      const batch = transactionRows.slice(i, i + BATCH).map((row) => ({
        transactionId: row.transactionId!,
        complaintId: row.complaintId ? complaintIdMap.get(row.complaintId)! : null,
        fromAccountId: accountIdMap.get(row.fromAccountId!)!,
        toAccountId: accountIdMap.get(row.toAccountId!)!,
        amountPaise: Number(row.amountPaise),
        timestamp: row.timestamp!,
        channel: row.channel as TxnChannel,
        latitude: row.latitude ? Number(row.latitude) : null,
        longitude: row.longitude ? Number(row.longitude) : null,
        h3R8: orNull(row.h3R8!),
        riskIndicator: row.riskIndicator as RiskIndicator,
        hopIndex: Number(row.hopIndex),
      }));
      await tx.insert(schema.transactions).values(batch);
    }

    for (let i = 0; i < withdrawalRows.length; i += BATCH) {
      const batch = withdrawalRows.slice(i, i + BATCH).map((row) => ({
        withdrawalId: row.withdrawalId!,
        accountId: accountIdMap.get(row.accountId!)!,
        atmId: atmIdMap.get(row.atmId!)!,
        complaintId: row.complaintId ? complaintIdMap.get(row.complaintId)! : null,
        amountPaise: Number(row.amountPaise),
        timestamp: row.timestamp!,
        h3R8: row.h3R8!,
      }));
      await tx.insert(schema.withdrawals).values(batch);
    }

    await tx.insert(schema.settings).values({
      id: 1,
      thresholdHigh: DEFAULT_THRESHOLD_HIGH,
      thresholdMedium: DEFAULT_THRESHOLD_MEDIUM,
      activeModelVersion: MODEL_VERSION,
    });

    console.log(
      `seeded: complaints=${complaintRows.length} accounts=${accountRows.length} atms=${atmRows.length} ` +
        `transactions=${transactionRows.length} withdrawals=${withdrawalRows.length}`,
    );
  });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
