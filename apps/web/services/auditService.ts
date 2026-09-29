import { db, dbSchema } from "@cyberpulse/db";
import type { ActorRole } from "@cyberpulse/shared/enums";

const { auditEvents } = dbSchema;

export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface RecordAuditEventInput {
  actorRole: ActorRole;
  action: string;
  subjectType: string;
  subjectId: number;
  metadata?: Record<string, unknown> | null;
  occurredAt?: string;
}

/**
 * architecture/low-level-design.md §3 + TC-SEC-030.
 *
 * `record` REQUIRES a transaction handle as its first argument.
 * There is no non-transactional overload, so an unaudited privileged action
 * cannot exist at the type level.
 */
export async function record(tx: DbTransaction, input: RecordAuditEventInput): Promise<void> {
  await tx.insert(auditEvents).values({
    actorRole: input.actorRole,
    action: input.action,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    metadata: input.metadata ?? null,
    ...(input.occurredAt ? { occurredAt: input.occurredAt } : {}),
  });
}
