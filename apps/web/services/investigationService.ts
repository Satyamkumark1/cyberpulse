import { db, dbSchema } from "@cyberpulse/db";
import { and, asc, desc, eq, inArray, or, sql, type SQL } from "drizzle-orm";
import type { ActorRole, InvestigationStatus, PriorityLevel } from "@cyberpulse/shared/enums";
import { ConflictError, InvalidTransitionError, NotFoundError, ValidationError } from "@/lib/errors";
import { requireCapability, type RequestContext } from "./lib/auth";
import * as auditService from "./auditService";
import type { DbTransaction } from "./auditService";
import {
  isValidTransition,
  requiresNoteForTransition,
} from "./lib/investigationStateMachine";
import { bankRecipientPredicate } from "./lib/scope";

const { investigations, investigationNotes, complaints, predictions, hotspots, riskFactors, alerts, auditEvents } = dbSchema;

export interface InvestigationListQuery {
  page: number;
  pageSize: number;
  status?: InvestigationStatus | undefined;
  priority?: PriorityLevel | undefined;
  assignedRole?: ActorRole | undefined;
  sort?: "updatedAt" | "priority" | undefined;
  order?: "asc" | "desc" | undefined;
}

export interface CreateInvestigationInput {
  complaintId: string;
  priority?: PriorityLevel | undefined;
}

export interface TransitionInvestigationInput {
  status: InvestigationStatus;
  expectedUpdatedAt: string;
  note?: string | undefined;
}

export async function list(query: InvestigationListQuery, ctx: RequestContext) {
  requireCapability(ctx.role, "investigations:read");

  const conditions: (SQL | undefined)[] = [];

  // Scoping for BANK: only investigations whose complaint is linked to an
  // alert addressed to a recipient the bank can act on.
  if (ctx.role === "BANK") {
    conditions.push(
      inArray(
        investigations.complaintId,
        db
          .select({ id: predictions.complaintId })
          .from(alerts)
          .innerJoin(predictions, eq(alerts.predictionId, predictions.id))
          .where(bankRecipientPredicate()),
      ),
    );
  }

  if (query.status) conditions.push(eq(investigations.status, query.status));
  if (query.priority) conditions.push(eq(investigations.priority, query.priority));
  if (query.assignedRole) conditions.push(eq(investigations.assignedRole, query.assignedRole));

  const where = conditions.length ? and(...conditions.filter((c): c is SQL => c !== undefined)) : undefined;

  const [countRow] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(investigations)
    .where(where);
  const total = Number(countRow?.total ?? 0);
  const totalPages = total === 0 ? 0 : Math.ceil(total / query.pageSize);
  const offset = (query.page - 1) * query.pageSize;

  const orderDir = query.order === "asc" ? asc : desc;
  const orderByCol = query.sort === "priority" ? orderDir(investigations.priority) : orderDir(investigations.updatedAt);

  const rows = await db
    .select({
      id: investigations.id,
      caseId: investigations.caseId,
      complaintInternalId: investigations.complaintId,
      complaintId: complaints.complaintId,
      assignedRole: investigations.assignedRole,
      status: investigations.status,
      priority: investigations.priority,
      origin: investigations.origin,
      createdAt: investigations.createdAt,
      updatedAt: investigations.updatedAt,
    })
    .from(investigations)
    .innerJoin(complaints, eq(complaints.id, investigations.complaintId))
    .where(where)
    .orderBy(orderByCol)
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

export async function get(caseId: string, ctx: RequestContext) {
  requireCapability(ctx.role, "investigations:read");

  const [inv] = await db
    .select({
      id: investigations.id,
      caseId: investigations.caseId,
      complaintInternalId: investigations.complaintId,
      complaintId: complaints.complaintId,
      assignedRole: investigations.assignedRole,
      status: investigations.status,
      priority: investigations.priority,
      origin: investigations.origin,
      createdAt: investigations.createdAt,
      updatedAt: investigations.updatedAt,
    })
    .from(investigations)
    .innerJoin(complaints, eq(complaints.id, investigations.complaintId))
    .where(eq(investigations.caseId, caseId))
    .limit(1);

  if (!inv) throw new NotFoundError();

  // Enforce BANK scoping: out-of-scope returns 404 (byte-identical to non-existent)
  if (ctx.role === "BANK") {
    const [bankScoped] = await db
      .select({ id: alerts.id })
      .from(alerts)
      .innerJoin(predictions, eq(alerts.predictionId, predictions.id))
      .where(and(eq(predictions.complaintId, inv.complaintInternalId), bankRecipientPredicate()))
      .limit(1);

    if (!bankScoped) throw new NotFoundError();
  }

  // Load complaint detail
  const [complaint] = await db
    .select()
    .from(complaints)
    .where(eq(complaints.id, inv.complaintInternalId))
    .limit(1);
  if (!complaint) throw new NotFoundError();

  // Load latest prediction with factors
  const [latestPred] = await db
    .select()
    .from(predictions)
    .where(eq(predictions.complaintId, inv.complaintInternalId))
    .orderBy(desc(predictions.createdAt))
    .limit(1);

  let factors: { name: string; contribution: number; direction: "INCREASES" | "REDUCES" }[] = [];
  let hotspot: { name: string; h3Index: string; district: string; state: string } | null = null;

  if (latestPred) {
    const factorRows = await db
      .select()
      .from(riskFactors)
      .where(eq(riskFactors.predictionId, latestPred.id))
      .orderBy(riskFactors.rank);

    factors = factorRows.map((f) => ({
      name: f.factorName,
      contribution: f.contribution,
      direction: f.direction,
    }));

    const [hotspotRow] = await db
      .select()
      .from(hotspots)
      .where(eq(hotspots.id, latestPred.hotspotId))
      .limit(1);

    if (hotspotRow) {
      hotspot = {
        name: hotspotRow.name,
        h3Index: hotspotRow.h3Index,
        district: hotspotRow.district,
        state: hotspotRow.state,
      };
    }
  }

  // Load associated alerts
  const alertRows = await db
    .select({
      id: alerts.id,
      alertId: alerts.alertId,
      severity: alerts.severity,
      status: alerts.status,
      locationName: alerts.locationName,
      exposurePaise: alerts.exposurePaise,
      recipients: alerts.recipients,
      notes: alerts.notes,
      createdAt: alerts.createdAt,
      acknowledgedAt: alerts.acknowledgedAt,
      acknowledgedByRole: alerts.acknowledgedByRole,
    })
    .from(alerts)
    .where(
      and(
        eq(alerts.investigationId, inv.id),
        ctx.role === "BANK" ? bankRecipientPredicate() : undefined,
      ),
    )
    .orderBy(desc(alerts.createdAt));

  // Load notes in reverse-chronological order
  const noteRows = await db
    .select({
      id: investigationNotes.id,
      body: investigationNotes.body,
      authorRole: investigationNotes.authorRole,
      createdAt: investigationNotes.createdAt,
    })
    .from(investigationNotes)
    .where(eq(investigationNotes.investigationId, inv.id))
    .orderBy(desc(investigationNotes.createdAt));

  const alertIds = alertRows.map((alert) => alert.id);
  const auditWhere = alertIds.length
    ? or(
        and(eq(auditEvents.subjectType, "investigation"), eq(auditEvents.subjectId, inv.id)),
        and(eq(auditEvents.subjectType, "alert"), inArray(auditEvents.subjectId, alertIds)),
      )
    : and(eq(auditEvents.subjectType, "investigation"), eq(auditEvents.subjectId, inv.id));
  const auditRows = await db
    .select({
      id: auditEvents.id,
      action: auditEvents.action,
      actorRole: auditEvents.actorRole,
      occurredAt: auditEvents.occurredAt,
    })
    .from(auditEvents)
    .where(auditWhere)
    .orderBy(desc(auditEvents.occurredAt));

  return {
    investigation: inv,
    complaint,
    latestPrediction: latestPred
      ? {
          predictionRef: latestPred.predictionRef,
          riskScore: latestPred.riskScore,
          riskLevel: latestPred.riskLevel,
          confidence: latestPred.confidence,
          predictedStart: latestPred.predictedStart,
          predictedEnd: latestPred.predictedEnd,
          factors,
          hotspot,
        }
      : null,
    alerts: alertRows,
    notes: noteRows,
    auditEvents: auditRows,
    graphUrl: `/api/transactions/network/${complaint.complaintId}`,
  };
}

export async function create(input: CreateInvestigationInput, ctx: RequestContext) {
  requireCapability(ctx.role, "investigations:create");

  const [complaint] = await db
    .select()
    .from(complaints)
    .where(eq(complaints.complaintId, input.complaintId))
    .limit(1);

  if (!complaint) throw new NotFoundError();

  // One investigation per complaint (FR-15, unique constraint)
  const [existing] = await db
    .select({ id: investigations.id })
    .from(investigations)
    .where(eq(investigations.complaintId, complaint.id))
    .limit(1);

  if (existing) {
    throw new ConflictError();
  }

  return db.transaction(async (tx) => {
    const tempCaseId = `INV-${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;
    const [created] = await tx
      .insert(investigations)
      .values({
        caseId: tempCaseId,
        complaintId: complaint.id,
        priority: input.priority ?? "MEDIUM",
        status: "NEW",
        assignedRole: "LEA",
        origin: ctx.origin,
      })
      .onConflictDoNothing({ target: investigations.complaintId })
      .returning();
    if (!created) throw new ConflictError();

    const finalCaseId = `INV-${String(created.id).padStart(4, "0")}`;
    const [updated] = await tx
      .update(investigations)
      .set({ caseId: finalCaseId })
      .where(eq(investigations.id, created.id))
      .returning();
    const result = updated ?? created;

    await auditService.record(tx, {
      actorRole: ctx.role,
      action: "INVESTIGATION_CREATED",
      subjectType: "investigation",
      subjectId: result.id,
      metadata: { complaintId: input.complaintId },
    });
    return result;
  });
}

export async function transition(caseId: string, input: TransitionInvestigationInput, ctx: RequestContext) {
  requireCapability(ctx.role, "investigations:transition");

  const [inv] = await db
    .select()
    .from(investigations)
    .where(eq(investigations.caseId, caseId))
    .limit(1);

  if (!inv) throw new NotFoundError();

  // Validate state machine transition
  if (!isValidTransition(inv.status, input.status)) {
    throw new InvalidTransitionError();
  }

  // Validate note requirement
  if (requiresNoteForTransition(inv.status, input.status)) {
    if (!input.note || !input.note.trim()) {
      const msg =
        input.status === "RESOLVED"
          ? "Closure note is required to resolve an investigation"
          : "A note is required for backward transitions";
      throw new ValidationError(msg, "note");
    }
  }

  return db.transaction(async (tx) => {
    // Optimistic concurrency check: match expectedUpdatedAt
    const [updated] = await tx
      .update(investigations)
      .set({
        status: input.status,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(investigations.caseId, caseId),
          sql`${investigations.updatedAt} = ${input.expectedUpdatedAt}::timestamptz`,
        ),
      )
      .returning();

    if (!updated) {
      // Row exists but updatedAt differed -> 409 CONFLICT
      throw new ConflictError();
    }

    // Insert note if provided
    if (input.note && input.note.trim()) {
      await tx.insert(investigationNotes).values({
        investigationId: inv.id,
        body: input.note.trim(),
        authorRole: ctx.role,
      });
    }

    // Record audit event
    await auditService.record(tx, {
      actorRole: ctx.role,
      action: "INVESTIGATION_STATUS_CHANGED",
      subjectType: "investigation",
      subjectId: inv.id,
      metadata: {
        from: inv.status,
        to: input.status,
        note: input.note?.trim() ?? null,
      },
    });

    return updated;
  });
}

export async function addNote(caseId: string, body: string, ctx: RequestContext) {
  requireCapability(ctx.role, "investigations:addNote");

  if (!body || !body.trim()) {
    throw new ValidationError("Note body cannot be empty", "body");
  }

  const [inv] = await db
    .select()
    .from(investigations)
    .where(eq(investigations.caseId, caseId))
    .limit(1);

  if (!inv) throw new NotFoundError();

  // BANK role can only add notes to in-scope investigations
  if (ctx.role === "BANK") {
    const [bankScoped] = await db
      .select({ id: alerts.id })
      .from(alerts)
      .innerJoin(predictions, eq(alerts.predictionId, predictions.id))
      .where(and(eq(predictions.complaintId, inv.complaintId), bankRecipientPredicate()))
      .limit(1);

    if (!bankScoped) throw new NotFoundError();
  }

  return db.transaction(async (tx) => {
    const [note] = await tx
      .insert(investigationNotes)
      .values({
        investigationId: inv.id,
        body: body.trim(),
        authorRole: ctx.role,
      })
      .returning();
    if (!note) throw new Error("investigation note insert returned no row");

    await auditService.record(tx, {
      actorRole: ctx.role,
      action: "INVESTIGATION_NOTE_ADDED",
      subjectType: "investigation",
      subjectId: inv.id,
      metadata: { noteId: note.id },
    });
    return note;
  });
}

/**
 * AC-012-06 / AC-P5-15: Auto-advances existing investigation to ALERT_SENT,
 * or creates a new one in ALERT_SENT. Runs inside the alert transaction.
 */
export async function upsertForAlert(
  tx: DbTransaction,
  complaintInternalId: number,
  alertId: number,
  ctx: RequestContext,
) {
  const [existing] = await tx
    .select()
    .from(investigations)
    .where(eq(investigations.complaintId, complaintInternalId))
    .limit(1);

  if (!existing) {
    const tempCaseId = `INV-${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;
    const [created] = await tx
      .insert(investigations)
      .values({
        caseId: tempCaseId,
        complaintId: complaintInternalId,
        priority: "HIGH",
        status: "ALERT_SENT",
        assignedRole: "LEA",
        origin: ctx.origin,
      })
      .onConflictDoNothing({ target: investigations.complaintId })
      .returning();

    // Another alert may have created the case while this transaction waited
    // on the unique complaint constraint. Both alerts still persist and link
    // to that one case.
    if (!created) {
      const [concurrent] = await tx
        .select()
        .from(investigations)
        .where(eq(investigations.complaintId, complaintInternalId))
        .limit(1);
      if (!concurrent) throw new Error("investigation upsert could not load conflicting row");
      return concurrent;
    }

    const finalCaseId = `INV-${String(created.id).padStart(4, "0")}`;
    const [updated] = await tx
      .update(investigations)
      .set({ caseId: finalCaseId })
      .where(eq(investigations.id, created.id))
      .returning();

    const result = updated ?? created;
    const [complaint] = await tx.select({ complaintId: complaints.complaintId })
      .from(complaints).where(eq(complaints.id, complaintInternalId)).limit(1);
    if (!complaint) throw new NotFoundError();
    await auditService.record(tx, {
      actorRole: ctx.role,
      action: "INVESTIGATION_CREATED",
      subjectType: "investigation",
      subjectId: result.id,
      metadata: { complaintId: complaint.complaintId },
    });
    return result;
  }

  // If existing is before ALERT_SENT (e.g. NEW, ANALYZING, UNDER_REVIEW), advance it
  const advanceableStatuses: InvestigationStatus[] = ["NEW", "ANALYZING", "UNDER_REVIEW"];
  if (advanceableStatuses.includes(existing.status)) {
    const [updated] = await tx
      .update(investigations)
      .set({
        status: "ALERT_SENT",
        updatedAt: sql`now()`,
      })
      .where(eq(investigations.id, existing.id))
      .returning();

    await auditService.record(tx, {
      actorRole: ctx.role,
      action: "INVESTIGATION_STATUS_CHANGED",
      subjectType: "investigation",
      subjectId: existing.id,
      metadata: {
        from: existing.status,
        to: "ALERT_SENT",
        automatic: true,
        alertId,
      },
    });

    return updated ?? existing;
  }

  return existing;
}
