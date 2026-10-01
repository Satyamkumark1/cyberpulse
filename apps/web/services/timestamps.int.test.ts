import { describe, expect, it } from "vitest";
import { db, dbSchema } from "@cyberpulse/db";
import { sql } from "drizzle-orm";

const { complaints } = dbSchema;

// Postgres prints a whole-hour offset as "+00". Pydantic rejects that, so in a
// UTC session (Neon, Vercel) every /predict request failed with an ML 422.
// SET LOCAL pins the zone for this transaction's connection only.
describe("timestamptz values read through @cyberpulse/db", () => {
  it("carry a full ±HH:MM offset when the session time zone is UTC", async () => {
    const value = await db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL TIME ZONE 'UTC'`);
      const [row] = await tx.select({ ts: complaints.complaintTimestamp }).from(complaints).limit(1);
      return row?.ts;
    });
    if (!value) throw new Error("fixture precondition failed: no seeded complaint");
    expect(value).toMatch(/[+-]\d{2}:\d{2}$/);
  });

  it("keeps microsecond precision, so optimistic-concurrency comparisons still match", async () => {
    const value = await db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL TIME ZONE 'UTC'`);
      const [row] = await tx.execute<{ ts: string }>(sql`SELECT '2026-09-14 09:12:00.123456+00'::timestamptz AS ts`);
      return row?.ts;
    });
    expect(value).toBe("2026-09-14 09:12:00.123456+00:00");
  });
});
