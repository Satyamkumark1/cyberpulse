import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { db, dbSchema } from "@cyberpulse/db";
import { and, asc, eq, sql } from "drizzle-orm";
import { latLngToCell } from "h3-js";
import { H3_RESOLUTION_HOTSPOT } from "@cyberpulse/shared/constants";
import {
  CitizenReportResponse,
  CitizenStatusResponse,
  citizenStageOf,
  type CitizenReportRequest,
  type CitizenStatusRequest,
} from "@cyberpulse/shared/citizen";
import { NotFoundError, ValidationError } from "@/lib/errors";
import * as auditService from "./auditService";
import { requireCapability, type RequestContext } from "./lib/auth";

const { complaints, citizenReports, investigations } = dbSchema;

// FEAT-17 Report Now — architecture/api-design.md API-100, API-101, ADR-022.

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** 80 random bits as 16 base32 characters. Returned once to the citizen and
 *  stored only as a hash — a lost code cannot be recovered, by design. */
function newTrackingCode(): string {
  const bits = Array.from(randomBytes(10), (b) => b.toString(2).padStart(8, "0")).join("");
  return (bits.match(/.{5}/g) ?? []).map((chunk) => BASE32[parseInt(chunk, 2)]).join("");
}

function hashTrackingCode(bareCode: string): string {
  return createHash("sha256").update(bareCode).digest("hex");
}

function displayTrackingCode(bareCode: string): string {
  return bareCode.match(/.{4}/g)!.join("-");
}

/** The cities a citizen can pick: those the seed corpus covers, so every
 *  report lands where the hotspot engine has data. */
export async function cities(ctx: RequestContext): Promise<string[]> {
  requireCapability(ctx.role, "citizenReports:create");
  const rows = await db
    .selectDistinct({ city: complaints.city })
    .from(complaints)
    .where(eq(complaints.origin, "SEED"))
    .orderBy(asc(complaints.city))
    .limit(100);
  return rows.map((r) => r.city);
}

// ponytail: city-level precision — the centroid of seeded victim locations, so
// distance features are coarse for citizen complaints. Upgrade to locality
// picking via locationService if predictions on these need it.
async function cityLocation(city: string) {
  const [row] = await db
    .select({
      district: sql<string>`mode() within group (order by ${complaints.district})`,
      state: sql<string>`mode() within group (order by ${complaints.state})`,
      lat: sql<number>`avg(${complaints.victimLat})::float8`,
      lon: sql<number>`avg(${complaints.victimLon})::float8`,
    })
    .from(complaints)
    .where(and(eq(complaints.origin, "SEED"), eq(complaints.city, city)))
    .groupBy(complaints.city)
    .limit(1);
  return row;
}

/**
 * AC-017-05. One transaction: complaint + citizen_reports + audit event, or
 * nothing. Always `origin = 'DEMO'` — a prototype citizen report is cleared by
 * demo reset like every other demonstration write.
 */
export async function submit(input: CitizenReportRequest, ctx: RequestContext): Promise<CitizenReportResponse> {
  requireCapability(ctx.role, "citizenReports:create");

  const location = await cityLocation(input.city);
  if (!location) throw new ValidationError("city is not in the supported list", "city");

  const trackingCode = newTrackingCode();

  const complaint = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(complaints)
      .values({
        complaintId: sql`'C-' || nextval('citizen_complaint_seq')`,
        fraudType: input.fraudType,
        amountPaise: input.amountPaise,
        complaintTimestamp: sql`now()`,
        victimLat: location.lat,
        victimLon: location.lon,
        victimH3R8: latLngToCell(location.lat, location.lon, H3_RESOLUTION_HOTSPOT),
        city: input.city,
        district: location.district,
        state: location.state,
        origin: "DEMO",
      })
      .returning({ id: complaints.id, complaintId: complaints.complaintId });

    await tx.insert(citizenReports).values({ complaintId: row!.id, trackingHash: hashTrackingCode(trackingCode) });

    await auditService.record(tx, {
      actorRole: ctx.role,
      action: "CITIZEN_REPORT_SUBMITTED",
      subjectType: "complaint",
      subjectId: row!.id,
      metadata: { complaintId: row!.complaintId, fraudType: input.fraudType },
    });
    return row!;
  });

  return CitizenReportResponse.parse({ complaintId: complaint.complaintId, trackingCode: displayTrackingCode(trackingCode) });
}

// Compared against when the complaint does not exist, so an unknown ID and a
// wrong code do the same work before returning the same 404.
const ABSENT_HASH = hashTrackingCode("A".repeat(16));

/**
 * AC-017-07, AC-017-08. A wrong code and an unknown complaint ID are the same
 * NotFoundError. The response is re-validated against a strict schema, so no
 * prediction field can leave through this path.
 */
export async function status(input: CitizenStatusRequest, ctx: RequestContext): Promise<CitizenStatusResponse> {
  requireCapability(ctx.role, "citizenReports:status");

  const [row] = await db
    .select({
      complaintId: complaints.complaintId,
      complaintStatus: complaints.status,
      complaintUpdatedAt: complaints.updatedAt,
      trackingHash: citizenReports.trackingHash,
      investigationStatus: investigations.status,
      investigationUpdatedAt: investigations.updatedAt,
    })
    .from(complaints)
    .innerJoin(citizenReports, eq(citizenReports.complaintId, complaints.id))
    .leftJoin(investigations, eq(investigations.complaintId, complaints.id))
    .where(eq(complaints.complaintId, input.complaintId))
    .limit(1);

  const expected = Buffer.from(row?.trackingHash ?? ABSENT_HASH, "hex");
  const supplied = Buffer.from(hashTrackingCode(input.trackingCode), "hex");
  if (!timingSafeEqual(expected, supplied) || !row) throw new NotFoundError();

  return CitizenStatusResponse.parse({
    complaintId: row.complaintId,
    stage: citizenStageOf(row.complaintStatus, row.investigationStatus),
    updatedAt: new Date(row.investigationUpdatedAt ?? row.complaintUpdatedAt).toISOString(),
  });
}
