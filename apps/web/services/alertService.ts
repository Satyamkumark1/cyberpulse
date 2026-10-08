import { db, dbSchema } from "@cyberpulse/db";
import { and, desc, eq, gte, lte, sql, type SQL } from "drizzle-orm";
import type { AlertSeverity, AlertStatus, RecipientKind } from "@cyberpulse/shared/enums";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { requireCapability, type RequestContext } from "./lib/auth";
import { bankCanSeeRecipients, bankRecipientPredicate } from "./lib/scope";
import * as auditService from "./auditService";
import { deriveSeverity } from "./lib/severity";
import { upsertForAlert } from "./investigationService";

const { alerts, predictions, hotspots, riskFactors, investigations } = dbSchema;

export interface CreateAlertInput {
  predictionRef: string;
  recipients: RecipientKind[];
  notes?: string | undefined;
}

export interface AlertListQuery {
  page: number;
  pageSize: number;
  status?: AlertStatus | undefined;
  severity?: AlertSeverity | undefined;
  from?: string | undefined;
  to?: string | undefined;
}

export async function create(input: CreateAlertInput, ctx: RequestContext) {
  requireCapability(ctx.role, "alerts:create");

  const dedupedRecipients = Array.from(new Set(input.recipients));
  if (dedupedRecipients.length === 0) {
    throw new ValidationError("Select at least one recipient", "recipients");
  }

  // Look up prediction
  const [prediction] = await db
    .select()
    .from(predictions)
    .where(eq(predictions.predictionRef, input.predictionRef))
    .limit(1);

  if (!prediction) {
    throw new NotFoundError();
  }

  // Single atomic transaction across:
  // 1. alerts table insert
  // 2. investigation upsert to ALERT_SENT
  // 3. audit_events insert (ALERT_DISPATCHED)
  return db.transaction(async (tx) => {
    // Prediction creation takes the same complaint-scoped advisory lock. This
    // makes the latest-prediction check and alert insert one serialized unit,
    // so a refresh cannot become current immediately after validation.
    await tx.execute(sql`select pg_advisory_xact_lock(${prediction.complaintId})`);
    const [currentPrediction] = await tx
      .select()
      .from(predictions)
      .where(eq(predictions.id, prediction.id))
      .limit(1);
    if (!currentPrediction) throw new NotFoundError();

    if (ctx.origin !== "DEMO") {
      if (new Date(currentPrediction.predictedEnd).getTime() <= Date.now()) {
        throw new ValidationError("This forecast has expired; run a new analysis before queuing an alert", "predictionRef");
      }
      const [latestForComplaint] = await tx
        .select({ id: predictions.id })
        .from(predictions)
        .where(eq(predictions.complaintId, currentPrediction.complaintId))
        .orderBy(desc(predictions.createdAt))
        .limit(1);
      if (latestForComplaint && latestForComplaint.id !== currentPrediction.id) {
        throw new ValidationError("This forecast has been superseded; use the latest analysis", "predictionRef");
      }
    }

    const [hotspot] = await tx
      .select()
      .from(hotspots)
      .where(eq(hotspots.id, currentPrediction.hotspotId))
      .limit(1);
    if (!hotspot) throw new NotFoundError();

    // Server-side derived fields (FR-14.2 / ASM-10)
    const severity = deriveSeverity(currentPrediction.riskLevel);
    const exposurePaise = currentPrediction.estimatedExposurePaise;
    const locationName = `${hotspot.name}, ${hotspot.district}, ${hotspot.state}`;
    const windowStart = currentPrediction.predictedStart;
    const windowEnd = currentPrediction.predictedEnd;
    const tempAlertId = `ALT-${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;

    const [insertedAlert] = await tx
      .insert(alerts)
      .values({
        alertId: tempAlertId,
        predictionId: currentPrediction.id,
        severity,
        locationName,
        latitude: hotspot.latitude,
        longitude: hotspot.longitude,
        windowStart,
        windowEnd,
        exposurePaise,
        recipients: dedupedRecipients,
        notes: input.notes?.trim() || null,
        status: "SENT",
        createdByRole: ctx.role,
        origin: ctx.origin,
      })
      .returning();

    if (!insertedAlert) throw new Error("alert insert returned no row");

    const finalAlertId = `ALT-${String(insertedAlert.id).padStart(4, "0")}`;
    const [alertRow] = await tx
      .update(alerts)
      .set({ alertId: finalAlertId })
      .where(eq(alerts.id, insertedAlert.id))
      .returning();
    if (!alertRow) throw new Error("alert id update returned no row");

    // Advance or create investigation
    const investigation = await upsertForAlert(tx, currentPrediction.complaintId, insertedAlert.id, ctx);

    // Link investigationId on alert
    await tx
      .update(alerts)
      .set({ investigationId: investigation.id })
      .where(eq(alerts.id, insertedAlert.id));

    // Record audit event inside the same transaction
    await auditService.record(tx, {
      actorRole: ctx.role,
      action: "ALERT_DISPATCHED",
      subjectType: "alert",
      subjectId: insertedAlert.id,
      metadata: {
        predictionRef: input.predictionRef,
        recipients: dedupedRecipients,
        investigationCaseId: investigation.caseId,
      },
    });

    return {
      alertId: finalAlertId,
      status: alertRow.status,
      severity: alertRow.severity,
      predictionRef: input.predictionRef,
      investigationCaseId: investigation.caseId,
      recipients: alertRow.recipients,
      createdAt: alertRow.createdAt,
    };
  });
}

export async function list(query: AlertListQuery, ctx: RequestContext) {
  requireCapability(ctx.role, "alerts:read");

  const conditions: (SQL | undefined)[] = [];

  // Scoping for BANK: only alerts addressed to a destination the bank acts on
  // (TC-API-044). A predicate, never a post-filter — a post-filter still runs
  // the unscoped query and leaks through `total` and through timing.
  if (ctx.role === "BANK") {
    conditions.push(bankRecipientPredicate());
  }

  if (query.status) conditions.push(eq(alerts.status, query.status));
  if (query.severity) conditions.push(eq(alerts.severity, query.severity));
  if (query.from) conditions.push(gte(alerts.createdAt, query.from));
  if (query.to) conditions.push(lte(alerts.createdAt, query.to));

  const where = conditions.length ? and(...conditions.filter((c): c is SQL => c !== undefined)) : undefined;

  const [countRow] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(alerts)
    .where(where);
  const total = Number(countRow?.total ?? 0);
  const totalPages = total === 0 ? 0 : Math.ceil(total / query.pageSize);
  const offset = (query.page - 1) * query.pageSize;

  const rows = await db
    .select({
      id: alerts.id,
      alertId: alerts.alertId,
      predictionId: alerts.predictionId,
      investigationId: alerts.investigationId,
      severity: alerts.severity,
      locationName: alerts.locationName,
      latitude: alerts.latitude,
      longitude: alerts.longitude,
      windowStart: alerts.windowStart,
      windowEnd: alerts.windowEnd,
      exposurePaise: alerts.exposurePaise,
      recipients: alerts.recipients,
      notes: alerts.notes,
      status: alerts.status,
      createdByRole: alerts.createdByRole,
      createdAt: alerts.createdAt,
      acknowledgedAt: alerts.acknowledgedAt,
      acknowledgedByRole: alerts.acknowledgedByRole,
      investigationCaseId: investigations.caseId,
    })
    .from(alerts)
    .leftJoin(investigations, eq(investigations.id, alerts.investigationId))
    .where(where)
    .orderBy(desc(alerts.createdAt))
    .limit(query.pageSize)
    .offset(offset);

  return {
    data: rows,
    total,
    page: query.page,
    pageSize: query.pageSize,
    totalPages,
  };
}

export async function get(alertId: string, ctx: RequestContext) {
  requireCapability(ctx.role, "alerts:read");

  const [row] = await db
    .select({
      id: alerts.id,
      alertId: alerts.alertId,
      predictionId: alerts.predictionId,
      investigationId: alerts.investigationId,
      severity: alerts.severity,
      locationName: alerts.locationName,
      latitude: alerts.latitude,
      longitude: alerts.longitude,
      windowStart: alerts.windowStart,
      windowEnd: alerts.windowEnd,
      exposurePaise: alerts.exposurePaise,
      recipients: alerts.recipients,
      notes: alerts.notes,
      status: alerts.status,
      createdByRole: alerts.createdByRole,
      createdAt: alerts.createdAt,
      acknowledgedAt: alerts.acknowledgedAt,
      acknowledgedByRole: alerts.acknowledgedByRole,
      investigationCaseId: investigations.caseId,
    })
    .from(alerts)
    .leftJoin(investigations, eq(investigations.id, alerts.investigationId))
    .where(eq(alerts.alertId, alertId))
    .limit(1);

  if (!row) throw new NotFoundError();

  // Out-of-scope for BANK returns 404 (byte-identical, TC-API-045)
  if (ctx.role === "BANK" && !bankCanSeeRecipients(row.recipients)) {
    throw new NotFoundError();
  }

  // Load prediction info
  const [prediction] = await db
    .select()
    .from(predictions)
    .where(eq(predictions.id, row.predictionId))
    .limit(1);

  let factors: { name: string; contribution: number; direction: "INCREASES" | "REDUCES" }[] = [];
  if (prediction) {
    const factorRows = await db
      .select()
      .from(riskFactors)
      .where(eq(riskFactors.predictionId, prediction.id))
      .orderBy(riskFactors.rank);
    factors = factorRows.map((f) => ({
      name: f.factorName,
      contribution: f.contribution,
      direction: f.direction,
    }));
  }

  return {
    ...row,
    prediction: prediction
      ? {
          predictionRef: prediction.predictionRef,
          riskScore: prediction.riskScore,
          riskLevel: prediction.riskLevel,
          confidence: prediction.confidence,
          predictedStart: prediction.predictedStart,
          predictedEnd: prediction.predictedEnd,
          factors,
        }
      : null,
  };
}

export async function acknowledge(alertId: string, ctx: RequestContext) {
  requireCapability(ctx.role, "alerts:acknowledge");

  const [existing] = await db
    .select()
    .from(alerts)
    .where(eq(alerts.alertId, alertId))
    .limit(1);

  if (!existing) throw new NotFoundError();

  // Out of scope for BANK returns 404
  if (ctx.role === "BANK" && !bankCanSeeRecipients(existing.recipients)) {
    throw new NotFoundError();
  }

  return db.transaction(async (tx) => {
    // The status predicate makes acknowledgement safe under two simultaneous
    // requests: exactly one can set the timestamp and create the audit event.
    const [updated] = await tx
      .update(alerts)
      .set({
        status: "ACKNOWLEDGED",
        acknowledgedAt: sql`now()`,
        acknowledgedByRole: ctx.role,
      })
      .where(and(eq(alerts.id, existing.id), eq(alerts.status, "SENT")))
      .returning();

    if (updated) {
      await auditService.record(tx, {
        actorRole: ctx.role,
        action: "ALERT_ACKNOWLEDGED",
        subjectType: "alert",
        subjectId: existing.id,
        metadata: {
          alertId: existing.alertId,
          acknowledgedByRole: ctx.role,
        },
      });
      return updated;
    }

    // A repeat acknowledgement is a true no-op, preserving acknowledged_at.
    const [current] = await tx.select().from(alerts).where(eq(alerts.id, existing.id)).limit(1);
    return current ?? existing;
  });
}
