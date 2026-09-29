import { db, dbSchema } from "@cyberpulse/db";
import { asc, eq, inArray, lte, sql } from "drizzle-orm";
import { requireCapability, type RequestContext } from "./lib/auth";

const { guardPosts, atms } = dbSchema;

/** A busy cell holds a handful of ATMs; three shifts each bounds the page. */
const COVERAGE_LIMIT = 60;
/** Maximum posts returned for any one cell by the multi-cell query. */
const MULTI_CELL_COVERAGE_LIMIT = 300;

export interface GuardPostCoverage {
  postId: string;
  atmId: string;
  bankName: string;
  city: string;
  district: string;
  state: string;
  shiftStartHourIst: number;
  shiftEndHourIst: number;
}

/**
 * The staffed duty posts covering one predicted hotspot cell.
 *
 * A post is a position at an ATM, never a person — there is no name or contact
 * number in the schema to return, and the alert reaches the operating bank,
 * which holds the roster. Reuses `hotspots:read`: this is coverage *of a
 * hotspot cell*, and the role permissions are identical, so it does not need a
 * capability of its own.
 */
export async function listForCell(h3Index: string, ctx: RequestContext): Promise<GuardPostCoverage[]> {
  requireCapability(ctx.role, "hotspots:read");

  return db
    .select({
      postId: guardPosts.postId,
      atmId: atms.atmId,
      bankName: atms.bankName,
      city: atms.city,
      district: atms.district,
      state: atms.state,
      shiftStartHourIst: guardPosts.shiftStartHourIst,
      shiftEndHourIst: guardPosts.shiftEndHourIst,
    })
    .from(guardPosts)
    .innerJoin(atms, eq(atms.id, guardPosts.atmId))
    .where(eq(atms.h3R8, h3Index))
    .orderBy(asc(atms.atmId), asc(guardPosts.shiftStartHourIst))
    .limit(COVERAGE_LIMIT);
}

export interface GuardPostCoverageForCell extends GuardPostCoverage {
  h3Index: string;
}

/**
 * The staffed duty posts covering every cell in a given set — the GUARD
 * landing page's roster across all currently-listed predicted cells at once.
 *
 * A set query, not `listForCell` called once per cell (RULE-database "fetch
 * sets, not items in a loop"). Same capability and the same reasoning as
 * `listForCell`: this is coverage *of* hotspot cells, not a new concern.
 */
export async function listCoverageForCells(
  h3Indexes: string[],
  ctx: RequestContext,
): Promise<GuardPostCoverageForCell[]> {
  requireCapability(ctx.role, "hotspots:read");
  if (h3Indexes.length === 0) return [];

  const ranked = db
    .select({
      h3Index: atms.h3R8,
      postId: guardPosts.postId,
      atmId: atms.atmId,
      bankName: atms.bankName,
      city: atms.city,
      district: atms.district,
      state: atms.state,
      shiftStartHourIst: guardPosts.shiftStartHourIst,
      shiftEndHourIst: guardPosts.shiftEndHourIst,
      rowNumber: sql<number>`row_number() over (partition by ${atms.h3R8} order by ${atms.atmId}, ${guardPosts.shiftStartHourIst}, ${guardPosts.postId})`.as("row_number"),
    })
    .from(guardPosts)
    .innerJoin(atms, eq(atms.id, guardPosts.atmId))
    .where(inArray(atms.h3R8, h3Indexes))
    .orderBy(asc(atms.h3R8), asc(atms.atmId), asc(guardPosts.shiftStartHourIst))
    .as("ranked_coverage");

  return db
    .select({
      h3Index: ranked.h3Index,
      postId: ranked.postId,
      atmId: ranked.atmId,
      bankName: ranked.bankName,
      city: ranked.city,
      district: ranked.district,
      state: ranked.state,
      shiftStartHourIst: ranked.shiftStartHourIst,
      shiftEndHourIst: ranked.shiftEndHourIst,
    })
    .from(ranked)
    .where(lte(ranked.rowNumber, MULTI_CELL_COVERAGE_LIMIT))
    .orderBy(asc(ranked.h3Index), asc(ranked.atmId), asc(ranked.shiftStartHourIst));
}
