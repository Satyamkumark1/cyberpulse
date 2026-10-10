import { db, dbSchema } from "@cyberpulse/db";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { NotificationChannel, NotificationKind, RecipientKind } from "@cyberpulse/shared/enums";
import type { DbTransaction } from "./auditService";
import { requireCapability, type RequestContext } from "./lib/auth";
import type { NotificationListResponse, NotificationPayload } from "@cyberpulse/shared/notifications";
import { buildNotificationPayload, recipientsVisibleTo } from "./lib/notifications";

const { notifications } = dbSchema;

type PayloadSource = Omit<Parameters<typeof buildNotificationPayload>[0], "kind" | "alertId" | "recipient">;

/**
 * DEC-020. Writes one DASHBOARD message (DELIVERED) and one WEBHOOK message
 * (SIMULATED — recorded exactly as it would be sent, never sent) per
 * recipient group. Takes the caller's transaction, so a notification commits
 * or rolls back with the alert or prediction it reports.
 */
export async function record(
  tx: DbTransaction,
  input: PayloadSource & {
    kind: NotificationKind;
    alertRowId: number | null;
    alertId: string | null;
    predictionRowId: number;
    recipients: readonly RecipientKind[];
    origin: RequestContext["origin"];
  },
): Promise<void> {
  const rows = input.recipients.flatMap((recipient, i) =>
    (["DASHBOARD", "WEBHOOK"] as const).map((channel, j) => ({
      // Placeholder until the row id is known, replaced below in the same
      // transaction (the alerts table uses the same two-step id).
      notificationId: `NTF-${Date.now()}${i}${j}${Math.floor(1000 + Math.random() * 9000)}`,
      kind: input.kind,
      channel,
      recipient,
      alertId: input.alertRowId,
      predictionId: input.predictionRowId,
      payload: buildNotificationPayload({ ...input, recipient }),
      status: channel === "WEBHOOK" ? ("SIMULATED" as const) : ("DELIVERED" as const),
      origin: input.origin,
    })),
  );
  if (rows.length === 0) return;

  const inserted = await tx.insert(notifications).values(rows).returning({ id: notifications.id });
  await tx
    .update(notifications)
    .set({ notificationId: sql`'NTF-' || lpad(${notifications.id}::text, 4, '0')` })
    .where(inArray(notifications.id, inserted.map((r) => r.id)));
}

export interface NotificationListQuery {
  channel: NotificationChannel;
  limit: number;
}

/** Newest first, limited to the recipient groups the role may read — applied
 * as a query predicate, never a post-filter (RULE-security.md). */
export async function list(query: NotificationListQuery, ctx: RequestContext): Promise<NotificationListResponse> {
  requireCapability(ctx.role, "alerts:read");
  const visible = recipientsVisibleTo(ctx.role);

  const rows = await db
    .select({
      notificationId: notifications.notificationId,
      kind: notifications.kind,
      channel: notifications.channel,
      recipient: notifications.recipient,
      status: notifications.status,
      payload: notifications.payload,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .where(
      and(
        eq(notifications.channel, query.channel),
        visible === null ? undefined : inArray(notifications.recipient, [...visible]),
      ),
    )
    .orderBy(desc(notifications.createdAt), desc(notifications.id))
    .limit(query.limit);

  return { data: rows.map((r) => ({ ...r, payload: r.payload as NotificationPayload })) };
}
