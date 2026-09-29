import { describe, expect, it } from "vitest";
import { db, dbSchema } from "@cyberpulse/db";
import { eq, sql } from "drizzle-orm";
import { listCoverageForCells, listForCell } from "./guardPostService";

const { atms, guardPosts } = dbSchema;
const ctx = { role: "LEA" as const, requestId: "test", origin: "USER" as const };

describe("guardPostService.listForCell", () => {
  it("returns only the posts whose ATM sits in the requested cell", async () => {
    const [seeded] = await db.select({ h3R8: atms.h3R8 }).from(atms).limit(1);
    if (!seeded) throw new Error("fixture precondition failed: no seeded ATM");

    const result = await listForCell(seeded.h3R8, ctx);
    expect(result.length).toBeGreaterThan(0);

    // Every returned post's ATM must actually be in that cell.
    for (const post of result) {
      const [row] = await db.select({ h3R8: atms.h3R8 }).from(atms).where(eq(atms.atmId, post.atmId));
      expect(row?.h3R8).toBe(seeded.h3R8);
    }
  });

  it("orders by ATM then shift start so the roster reads as a day", async () => {
    const [seeded] = await db.select({ h3R8: atms.h3R8 }).from(atms).limit(1);
    if (!seeded) throw new Error("fixture precondition failed: no seeded ATM");

    const result = await listForCell(seeded.h3R8, ctx);
    for (let i = 1; i < result.length; i++) {
      const prev = result[i - 1]!;
      const cur = result[i]!;
      if (prev.atmId === cur.atmId) {
        expect(cur.shiftStartHourIst).toBeGreaterThan(prev.shiftStartHourIst);
      } else {
        expect(cur.atmId > prev.atmId).toBe(true);
      }
    }
  });

  it("returns an empty list, not an error, for a cell with no ATMs", async () => {
    // A syntactically valid cell that the corpus does not place an ATM in.
    await expect(listForCell("8928308280fffff", ctx)).resolves.toEqual([]);
  });

  it("carries no personal identifier in the returned shape (FR-01.7)", async () => {
    const [seeded] = await db.select({ h3R8: atms.h3R8 }).from(atms).limit(1);
    const result = await listForCell(seeded!.h3R8, ctx);
    const keys = new Set(result.flatMap((r) => Object.keys(r)));
    for (const forbidden of ["name", "phone", "mobile", "email", "guardName", "contact"]) {
      expect(keys.has(forbidden)).toBe(false);
    }
  });

  it("rejects a role without the hotspot read capability", async () => {
    // Every current role holds `hotspots:read`; assert the check is wired by
    // driving it with a role the matrix does not contain.
    const rogue = { ...ctx, role: "UNKNOWN" as unknown as typeof ctx.role };
    await expect(listForCell("88618c4f29fffff", rogue)).rejects.toThrow();
  });

  it("leaves no ATM without a duty post", async () => {
    const [row] = await db
      .select({ uncovered: sql<number>`count(*)::int` })
      .from(atms)
      .where(sql`not exists (select 1 from ${guardPosts} g where g.atm_id = ${atms.id})`);
    expect(row?.uncovered).toBe(0);
  });
});

describe("guardPostService.listCoverageForCells — the GUARD landing page's roster query", () => {
  it("returns only posts whose ATM sits in one of the requested cells, grouped by cell", async () => {
    const seeded = await db.select({ h3R8: atms.h3R8 }).from(atms).limit(2);
    if (seeded.length < 2) throw new Error("fixture precondition failed: need 2 seeded ATMs");
    const cells = [...new Set(seeded.map((s) => s.h3R8))];

    const result = await listCoverageForCells(cells, ctx);
    expect(result.length).toBeGreaterThan(0);
    for (const post of result) {
      expect(cells).toContain(post.h3Index);
    }
  });

  it("is a set query, not one call per cell — same total rows as calling listForCell for each cell", async () => {
    const seeded = await db.select({ h3R8: atms.h3R8 }).from(atms).limit(3);
    const cells = [...new Set(seeded.map((s) => s.h3R8))];
    if (cells.length === 0) throw new Error("fixture precondition failed: no seeded ATMs");

    const setResult = await listCoverageForCells(cells, ctx);
    const perCell = await Promise.all(cells.map((cell) => listForCell(cell, ctx)));
    const expectedTotal = perCell.reduce((sum, rows) => sum + rows.length, 0);
    expect(setResult.length).toBe(expectedTotal);
  });

  it("returns an empty list, not an error, for an empty cell set", async () => {
    await expect(listCoverageForCells([], ctx)).resolves.toEqual([]);
  });

  it("carries no personal identifier in the returned shape (FR-01.7)", async () => {
    const [seeded] = await db.select({ h3R8: atms.h3R8 }).from(atms).limit(1);
    const result = await listCoverageForCells([seeded!.h3R8], ctx);
    const keys = new Set(result.flatMap((r) => Object.keys(r)));
    for (const forbidden of ["name", "phone", "mobile", "email", "guardName", "contact"]) {
      expect(keys.has(forbidden)).toBe(false);
    }
  });

  it("rejects a role without the hotspot read capability", async () => {
    const rogue = { ...ctx, role: "UNKNOWN" as unknown as typeof ctx.role };
    await expect(listCoverageForCells(["88618c4f29fffff"], rogue)).rejects.toThrow();
  });

  it("allows GUARD to call this — hotspots:read is the one capability GUARD holds", async () => {
    const [seeded] = await db.select({ h3R8: atms.h3R8 }).from(atms).limit(1);
    const guardCtx = { ...ctx, role: "GUARD" as const };
    await expect(listCoverageForCells([seeded!.h3R8], guardCtx)).resolves.toBeInstanceOf(Array);
  });
});

describe("ATM_SITE is a routing destination, not a person", () => {
  it("carries a readable label and an explanation for every recipient kind", async () => {
    const { RECIPIENT_KINDS, RECIPIENT_LABELS } = await import("@cyberpulse/shared/enums");
    for (const kind of RECIPIENT_KINDS) {
      expect(RECIPIENT_LABELS[kind].label.length).toBeGreaterThan(0);
      expect(RECIPIENT_LABELS[kind].detail.length).toBeGreaterThan(0);
    }
  });

  it("describes the ATM destination as a post, never as a named individual", async () => {
    const { RECIPIENT_LABELS } = await import("@cyberpulse/shared/enums");
    const text = `${RECIPIENT_LABELS.ATM_SITE.label} ${RECIPIENT_LABELS.ATM_SITE.detail}`;
    expect(text).toMatch(/post/i);
    // No contact detail can appear, because none is stored.
    expect(text).not.toMatch(/\b[6-9]\d{9}\b/);
  });

  it("accepts ATM_SITE as a stored recipient value", async () => {
    const [row] = await db.execute(
      sql`select 'ATM_SITE'::recipient_kind = ANY(ARRAY['ATM_SITE']::recipient_kind[]) as ok`,
    );
    expect((row as unknown as { ok: boolean }).ok).toBe(true);
  });
});
