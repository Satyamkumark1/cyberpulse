import { gridDisk, cellToLatLng } from "h3-js";
import { db, dbSchema } from "@cyberpulse/db";
import { and, asc, desc, eq, gte, inArray, lt, lte, sql, type SQL } from "drizzle-orm";
import { CANDIDATE_CELL_CAP } from "@cyberpulse/shared/constants";
import type { RiskLevel } from "@cyberpulse/shared/enums";
import { NotFoundError } from "@/lib/errors";
import { currentCellRisk, currentPredictions } from "@cyberpulse/db/queries/currentPredictions";
import { requireCapability, type RequestContext } from "./lib/auth";
import { haversineMeters } from "./lib/geo";

const { withdrawals, atms, hotspots, riskFactors, complaints } = dbSchema;
const NEARBY_ATM_KRING = 3;
const NEARBY_ATM_LIMIT = 20;
const RELATED_COMPLAINTS_LIMIT = 20;
const TOP_FACTORS_LIMIT = 5;

// ai/model-selection.md §2.1 — same three-stage candidate generation as the
// ML service's training pipeline (apps/ml-service/training/generate_training_data.py
// `_generate_candidate_cells`); this TS copy is the serving-time counterpart
// that has database access, which the ML service structurally does not
// (RULE-security.md 'The ML boundary'). Candidate *generation* producing a
// different exact list between training and serving is an accepted recall
// -ceiling limitation, not a train/serve skew risk — only feature
// *computation* has to be byte-identical, and that lives in one Python
// module shared by both paths.
const K_RING = 3;
const HISTORICAL_TOP_N = 40;
const HOTSPOT_SCORE_SMOOTHING = 10;
const ATM_KRING_K = 1;
const H3_RES8_CELL_AREA_KM2 = 0.7373;

export interface CandidateCellPayload {
  h3Index: string;
  lat: number;
  lon: number;
  atmCount: number;
  atmDensity: number;
  historicalHotspotScore: number;
  withdrawalCount: number;
  name: string;
  district: string;
  state: string;
}

export async function candidatesForComplaint(
  victimH3R8: string,
  complaintCity: string,
  complaintDistrict: string,
  complaintState: string,
  complaintTimestamp: string,
): Promise<CandidateCellPayload[]> {
  const [withdrawalCounts, atmRows] = await Promise.all([
    db
      .select({ h3: withdrawals.h3R8, count: sql<number>`count(*)::int` })
      .from(withdrawals)
      .where(lt(withdrawals.timestamp, complaintTimestamp))
      .groupBy(withdrawals.h3R8),
    db
      .select({ h3: atms.h3R8, locality: atms.locality, city: atms.city, district: atms.district, state: atms.state })
      .from(atms),
  ]);
  const withdrawalCountByCell = new Map(withdrawalCounts.map((r) => [r.h3, r.count]));

  const atmCountByCell = new Map<string, number>();
  const locationByCell = new Map<string, { locality: string | null; city: string; district: string; state: string }>();
  for (const atm of atmRows) {
    atmCountByCell.set(atm.h3, (atmCountByCell.get(atm.h3) ?? 0) + 1);
    if (!locationByCell.has(atm.h3)) locationByCell.set(atm.h3, atm);
  }

  const stateWithdrawalCells = await db
    .select({ h3: withdrawals.h3R8, count: sql<number>`count(*)::int` })
    .from(withdrawals)
    .innerJoin(atms, eq(atms.id, withdrawals.atmId))
    .where(and(eq(atms.state, complaintState), lt(withdrawals.timestamp, complaintTimestamp)))
    .groupBy(withdrawals.h3R8)
    .orderBy(sql`count(*) desc`, asc(withdrawals.h3R8))
    .limit(HISTORICAL_TOP_N);

  const disk = [...new Set(gridDisk(victimH3R8, K_RING))].sort();
  const diskSet = new Set(disk);
  const historical = stateWithdrawalCells
    .sort((a, b) => b.count - a.count || a.h3.localeCompare(b.h3))
    .map((r) => r.h3)
    .filter((h) => !diskSet.has(h));
  const ordered = [...disk, ...historical].slice(0, CANDIDATE_CELL_CAP);

  return ordered.map((h3Index) => {
    const [lat, lon] = cellToLatLng(h3Index);
    const ringCells = gridDisk(h3Index, ATM_KRING_K);
    const ringAreaKm2 = ringCells.length * H3_RES8_CELL_AREA_KM2;
    const atmCount = ringCells.reduce((sum, c) => sum + (atmCountByCell.get(c) ?? 0), 0);
    const withdrawalCount = withdrawalCountByCell.get(h3Index) ?? 0;
    const location = locationByCell.get(h3Index);

    return {
      h3Index,
      lat,
      lon,
      atmCount,
      atmDensity: atmCount / ringAreaKm2,
      historicalHotspotScore: withdrawalCount / (withdrawalCount + HOTSPOT_SCORE_SMOOTHING),
      withdrawalCount,
      // The locality distinguishes the five candidate cells that otherwise all
      // render as the same city name. Falls back to the city where a cell has
      // no ATM to take a locality from — never to an invented place name.
      name: location?.locality ? `${location.locality}, ${location.city}` : (location?.city ?? complaintCity),
      district: location?.district ?? complaintDistrict,
      state: location?.state ?? complaintState,
    };
  });
}

// ---------------------------------------------------------------------------
// GIS Risk Map (FEAT-10, architecture/api-design.md API-030/031)
// ---------------------------------------------------------------------------

export interface HotspotListQuery {
  state?: string | undefined;
  riskLevel?: RiskLevel | undefined;
  from?: string | undefined;
  to?: string | undefined;
  limit: number;
  bbox?: { minLon: number; minLat: number; maxLon: number; maxLat: number } | undefined;
}

export async function list(query: HotspotListQuery, ctx: RequestContext) {
  requireCapability(ctx.role, "hotspots:read");

  const cell = currentCellRisk();
  const conditions: (SQL | undefined)[] = [];
  if (query.state) conditions.push(eq(hotspots.state, query.state));
  if (query.riskLevel) conditions.push(eq(cell.riskLevel, query.riskLevel));
  if (query.from) conditions.push(gte(cell.predictedStart, query.from));
  if (query.to) conditions.push(lte(cell.predictedStart, query.to));
  if (query.bbox) {
    conditions.push(
      gte(hotspots.latitude, query.bbox.minLat),
      lte(hotspots.latitude, query.bbox.maxLat),
      gte(hotspots.longitude, query.bbox.minLon),
      lte(hotspots.longitude, query.bbox.maxLon),
    );
  }
  const where = conditions.length ? and(...conditions.filter((c): c is SQL => c !== undefined)) : undefined;

  const rows = await db
    .select({
      h3Index: hotspots.h3Index,
      name: hotspots.name,
      latitude: hotspots.latitude,
      longitude: hotspots.longitude,
      city: hotspots.city,
      district: hotspots.district,
      state: hotspots.state,
      riskScore: cell.riskScore,
      riskLevel: cell.riskLevel,
      likelyAtmCount: cell.likelyAtms,
      expectedStart: cell.predictedStart,
      expectedEnd: cell.predictedEnd,
    })
    .from(cell)
    .innerJoin(hotspots, eq(hotspots.id, cell.hotspotId))
    .where(where)
    // Ties broken on h3Index so the rail and map order is deterministic.
    .orderBy(desc(cell.riskScore), asc(hotspots.h3Index))
    .limit(query.limit);

  return { data: rows };
}

export async function getDetail(h3Index: string, ctx: RequestContext) {
  requireCapability(ctx.role, "hotspots:read");

  const cell = currentCellRisk();
  const [found] = await db
    .select({
      hotspot: hotspots,
      predictionId: cell.predictionId,
      predictionRef: cell.predictionRef,
      riskScore: cell.riskScore,
      riskLevel: cell.riskLevel,
      predictedStart: cell.predictedStart,
      predictedEnd: cell.predictedEnd,
      likelyAtms: cell.likelyAtms,
      estimatedExposurePaise: cell.estimatedExposurePaise,
    })
    .from(cell)
    .innerJoin(hotspots, eq(hotspots.id, cell.hotspotId))
    .where(eq(hotspots.h3Index, h3Index))
    .limit(1);
  // No current prediction names this cell: there is no risk to show for it.
  if (!found) throw new NotFoundError();
  const { hotspot, ...risk } = found;

  const nearCells = [...new Set(gridDisk(h3Index, NEARBY_ATM_KRING))];
  const nearbyAtmRows = nearCells.length ? await db.select().from(atms).where(inArray(atms.h3R8, nearCells)) : [];
  const nearbyAtms = nearbyAtmRows
    .map((a) => ({
      atmId: a.atmId,
      bankName: a.bankName,
      distance: Math.round(haversineMeters(hotspot.latitude, hotspot.longitude, a.latitude, a.longitude)),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, NEARBY_ATM_LIMIT);

  // GUARD is a duty-coverage role, not a complaint-intelligence role. Keep
  // the API boundary narrow even when a caller bypasses the dashboard UI.
  if (ctx.role === "GUARD") {
    return {
      h3Index: hotspot.h3Index,
      name: hotspot.name,
      latitude: hotspot.latitude,
      longitude: hotspot.longitude,
      city: hotspot.city,
      district: hotspot.district,
      state: hotspot.state,
      riskScore: risk.riskScore,
      riskLevel: risk.riskLevel,
      expectedStart: risk.predictedStart,
      expectedEnd: risk.predictedEnd,
      likelyAtms: risk.likelyAtms,
      likelyAtmCount: risk.likelyAtms,
      nearbyAtms,
      topFactors: [],
      relatedComplaints: [],
      predictionRef: null,
      estimatedExposurePaise: null,
    };
  }

  // API-031: the prediction behind the displayed score — so the factors
  // explain the score shown, and the drawer's alert action targets a current
  // (never superseded) prediction.
  const topFactors = (
    await db
      .select()
      .from(riskFactors)
      .where(eq(riskFactors.predictionId, risk.predictionId))
      .orderBy(riskFactors.rank)
      .limit(TOP_FACTORS_LIMIT)
  ).map((f) => ({ name: f.factorName, contribution: f.contribution, direction: f.direction }));

  // Complaints whose current prediction names this cell.
  const current = currentPredictions();
  const relatedComplaints = await db
    .select({ complaintId: complaints.complaintId, fraudType: complaints.fraudType, amountPaise: complaints.amountPaise })
    .from(current)
    .innerJoin(complaints, eq(complaints.id, current.complaintId))
    .where(eq(current.hotspotId, hotspot.id))
    .orderBy(desc(current.createdAt))
    .limit(RELATED_COMPLAINTS_LIMIT);

  return {
    h3Index: hotspot.h3Index,
    name: hotspot.name,
    latitude: hotspot.latitude,
    longitude: hotspot.longitude,
    city: hotspot.city,
    district: hotspot.district,
    state: hotspot.state,
    riskScore: risk.riskScore,
    riskLevel: risk.riskLevel,
    expectedStart: risk.predictedStart,
    expectedEnd: risk.predictedEnd,
    likelyAtmCount: risk.likelyAtms,
    nearbyAtms,
    topFactors,
    relatedComplaints,
    // AC-010-05: the drawer's internal-alert action needs the prediction to alert on.
    predictionRef: risk.predictionRef,
    estimatedExposurePaise: Number(risk.estimatedExposurePaise),
  };
}
