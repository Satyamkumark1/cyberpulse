import { db, dbSchema } from "@cyberpulse/db";
import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";
import type { MlPredictRequest } from "@cyberpulse/shared/zod/ml-predict-request";
import type { MlPredictResponse } from "@cyberpulse/shared/zod/ml-predict-response";
import type { PredictionResponse } from "@cyberpulse/shared/zod/prediction";
import { NotFoundError } from "@/lib/errors";
import { requireCapability, type RequestContext } from "./lib/auth";
import { complaintScope } from "./lib/scope";
import { computeExposurePaise } from "./lib/exposure";
import { candidatesForComplaint } from "./hotspotService";
import { callPredict } from "./mlClient";

const { complaints, transactions, accounts, withdrawals, hotspots, predictions, riskFactors, settings } = dbSchema;

export interface PredictInput {
  complaintId: string;
  topK?: number;
  forceRefresh?: boolean;
}

function toApiShape(
  prediction: typeof predictions.$inferSelect,
  hotspot: typeof hotspots.$inferSelect,
  factors: (typeof riskFactors.$inferSelect)[],
  complaintBusinessId: string,
  pipelineStages?: PredictionResponse["pipelineStages"],
): PredictionResponse {
  return {
    predictionRef: prediction.predictionRef,
    complaintId: complaintBusinessId,
    riskScore: prediction.riskScore,
    riskLevel: prediction.riskLevel,
    confidence: prediction.confidence,
    predictedLocation: {
      name: hotspot.name,
      h3Index: hotspot.h3Index,
      lat: hotspot.latitude,
      lon: hotspot.longitude,
      district: hotspot.district,
      state: hotspot.state,
    },
    expectedWindow: {
      start: prediction.predictedStart,
      end: prediction.predictedEnd,
      confidence: prediction.windowConfidence,
      fallback: prediction.windowFallback,
    },
    likelyAtms: prediction.likelyAtms,
    estimatedExposurePaise: prediction.estimatedExposurePaise,
    rankedHotspots: prediction.rankedHotspots as PredictionResponse["rankedHotspots"],
    factors: factors
      .sort((a, b) => a.rank - b.rank)
      .map((f) => ({ name: f.factorName as PredictionResponse["factors"][number]["name"], contribution: f.contribution, direction: f.direction })),
    explanationAvailable: prediction.explanationAvailable,
    clusteringFallback: prediction.clusteringFallback,
    modelVersion: prediction.modelVersion,
    featureSchemaVersion: prediction.featureSchemaVersion,
    inferenceMs: prediction.inferenceMs ?? undefined,
    createdAt: prediction.createdAt,
    pipelineStages,
  };
}

export async function getLatestForComplaint(complaintDbId: number): Promise<PredictionResponse | null> {
  const [row] = await db
    .select({ prediction: predictions, hotspot: hotspots, complaintBusinessId: complaints.complaintId })
    .from(predictions)
    .innerJoin(hotspots, eq(hotspots.id, predictions.hotspotId))
    .innerJoin(complaints, eq(complaints.id, predictions.complaintId))
    .where(eq(predictions.complaintId, complaintDbId))
    .orderBy(desc(predictions.createdAt))
    .limit(1);
  if (!row) return null;

  const factors = await db.select().from(riskFactors).where(eq(riskFactors.predictionId, row.prediction.id));
  return toApiShape(row.prediction, row.hotspot, factors, row.complaintBusinessId);
}

export async function predict(input: PredictInput, ctx: RequestContext): Promise<{ prediction: PredictionResponse; created: boolean }> {
  requireCapability(ctx.role, "prediction:run");

  const scope = complaintScope(ctx.role);
  const where = scope ? and(eq(complaints.complaintId, input.complaintId), scope) : eq(complaints.complaintId, input.complaintId);
  const [complaint] = await db.select().from(complaints).where(where).limit(1);
  if (!complaint) throw new NotFoundError();

  if (!input.forceRefresh) {
    const existing = await getLatestForComplaint(complaint.id);
    if (existing) return { prediction: existing, created: false };
  }

  const [settingsRow] = await db.select().from(settings).limit(1);
  const thresholdHigh = settingsRow?.thresholdHigh ?? 0.7;
  const thresholdMedium = settingsRow?.thresholdMedium ?? 0.4;

  const chain = await db
    .select({
      amountPaise: transactions.amountPaise,
      timestamp: transactions.timestamp,
      channel: transactions.channel,
      hopIndex: transactions.hopIndex,
      riskIndicator: transactions.riskIndicator,
      fromAccountId: transactions.fromAccountId,
      toAccountId: transactions.toAccountId,
    })
    .from(transactions)
    .where(eq(transactions.complaintId, complaint.id))
    .orderBy(transactions.hopIndex)
    .limit(500);

  const accountIds = [...new Set(chain.flatMap((t) => [t.fromAccountId, t.toAccountId]))];
  const chainAccounts = accountIds.length
    ? await db.select().from(accounts).where(inArray(accounts.id, accountIds))
    : [];

  const accountPayloads = await Promise.all(
    chainAccounts.map(async (account) => {
      const [priorFlags] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(transactions)
        .where(
          and(
            sql`(${transactions.fromAccountId} = ${account.id} OR ${transactions.toAccountId} = ${account.id})`,
            sql`${transactions.riskIndicator} <> 'NONE'`,
            lt(transactions.timestamp, complaint.complaintTimestamp),
          ),
        );
      const [priorWithdrawals] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(withdrawals)
        .where(and(eq(withdrawals.accountId, account.id), lt(withdrawals.timestamp, complaint.complaintTimestamp)));

      return {
        accountId: account.accountId,
        accountType: account.accountType,
        openedAt: account.openedAt,
        riskScore: account.riskScore,
        priorSuspiciousFlags: priorFlags?.count ?? 0,
        priorWithdrawalCount: priorWithdrawals?.count ?? 0,
      };
    }),
  );

  const candidateCells = await candidatesForComplaint(
    complaint.victimH3R8,
    complaint.city,
    complaint.district,
    complaint.state,
    complaint.complaintTimestamp,
  );

  const mlRequest: MlPredictRequest = {
    requestId: ctx.requestId,
    complaint: {
      complaintId: complaint.complaintId,
      fraudType: complaint.fraudType,
      amountPaise: complaint.amountPaise,
      timestamp: complaint.complaintTimestamp,
      victimLat: complaint.victimLat,
      victimLon: complaint.victimLon,
      victimH3R8: complaint.victimH3R8,
    },
    transactions: chain.map((t) => ({
      amountPaise: t.amountPaise,
      timestamp: t.timestamp,
      channel: t.channel,
      hopIndex: t.hopIndex,
      riskIndicator: t.riskIndicator,
    })),
    accounts: accountPayloads,
    candidateCells,
    thresholds: { high: thresholdHigh, medium: thresholdMedium },
    topK: input.topK ?? 5,
  };

  const mlResponse: MlPredictResponse = await callPredict(mlRequest, ctx.requestId);

  const { hotspot, prediction, factors } = await db.transaction(async (tx) => {
    const [hotspotRow] = await tx
      .insert(hotspots)
      .values({
        h3Index: mlResponse.predictedLocation.h3Index,
        name: mlResponse.predictedLocation.name,
        latitude: mlResponse.predictedLocation.lat,
        longitude: mlResponse.predictedLocation.lon,
        city: mlResponse.predictedLocation.name,
        district: mlResponse.predictedLocation.district,
        state: mlResponse.predictedLocation.state,
        riskScore: mlResponse.riskScore,
        riskLevel: mlResponse.riskLevel,
        expectedStart: mlResponse.expectedWindow.start,
        expectedEnd: mlResponse.expectedWindow.end,
        likelyAtmCount: mlResponse.likelyAtms,
        historicalFrequency: mlResponse.riskScore,
        lastRefreshedAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: hotspots.h3Index,
        set: {
          riskScore: mlResponse.riskScore,
          riskLevel: mlResponse.riskLevel,
          expectedStart: mlResponse.expectedWindow.start,
          expectedEnd: mlResponse.expectedWindow.end,
          likelyAtmCount: mlResponse.likelyAtms,
          lastRefreshedAt: new Date().toISOString(),
        },
      })
      .returning();
    if (!hotspotRow) throw new Error("hotspot upsert returned no row");

    const [inserted] = await tx
      .insert(predictions)
      .values({
        predictionRef: "PRD-0000",
        complaintId: complaint.id,
        hotspotId: hotspotRow.id,
        riskScore: mlResponse.riskScore,
        riskLevel: mlResponse.riskLevel,
        confidence: mlResponse.confidence,
        predictedStart: mlResponse.expectedWindow.start,
        predictedEnd: mlResponse.expectedWindow.end,
        windowConfidence: mlResponse.expectedWindow.confidence,
        windowFallback: mlResponse.expectedWindow.fallback,
        likelyAtms: mlResponse.likelyAtms,
        rankedHotspots: mlResponse.rankedHotspots,
        explanationAvailable: mlResponse.explanationAvailable,
        clusteringFallback: mlResponse.clusteringFallback,
        modelVersion: mlResponse.modelVersion,
        featureSchemaVersion: mlResponse.featureSchemaVersion,
        inferenceMs: mlResponse.inferenceMs ?? null,
        origin: ctx.origin,
      })
      .returning();
    if (!inserted) throw new Error("prediction insert returned no row");

    const exposurePaise = await computeExposurePaise(mlResponse.predictedLocation.h3Index, complaint.complaintTimestamp, tx);
    const [predictionRow] = await tx
      .update(predictions)
      .set({ predictionRef: `PRD-${String(inserted.id).padStart(4, "0")}`, estimatedExposurePaise: exposurePaise })
      .where(eq(predictions.id, inserted.id))
      .returning();
    if (!predictionRow) throw new Error("prediction ref update returned no row");

    const factorRows = mlResponse.factors.length
      ? await tx
          .insert(riskFactors)
          .values(
            mlResponse.factors.map((f, i) => ({
              predictionId: inserted.id,
              factorName: f.name,
              contribution: f.contribution,
              direction: f.direction,
              rank: i + 1,
            })),
          )
          .returning()
      : [];

    return { hotspot: hotspotRow, prediction: predictionRow, factors: factorRows };
  });

  return {
    prediction: toApiShape(prediction, hotspot, factors, complaint.complaintId, mlResponse.pipelineStages),
    created: true,
  };
}
