import { db, dbSchema } from "@cyberpulse/db";
import { eq, sql } from "drizzle-orm";
import { DEFAULT_THRESHOLD_HIGH, DEFAULT_THRESHOLD_MEDIUM, MODEL_VERSION } from "@cyberpulse/shared/constants";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { requireCapability, type RequestContext } from "./lib/auth";
import * as auditService from "./auditService";

const { settings } = dbSchema;

export interface UpdateSettingsInput {
  thresholdHigh: number;
  thresholdMedium: number;
  notifyToastOnAlert?: boolean | undefined;
  notifyAnnouncePrediction?: boolean | undefined;
}

export async function get(ctx: RequestContext) {
  requireCapability(ctx.role, "settings:read");
  const [row] = await db.select().from(settings).where(eq(settings.id, 1)).limit(1);
  if (row) return row;

  // A pristine development database has no seed row yet. This fallback is
  // read-only; normal setup seeds the canonical row before the app is used.
  return {
    id: 1,
    thresholdHigh: DEFAULT_THRESHOLD_HIGH,
    thresholdMedium: DEFAULT_THRESHOLD_MEDIUM,
    systemMode: "PROTOTYPE",
    dataMode: "SYNTHETIC",
    activeModelVersion: MODEL_VERSION,
    notifyToastOnAlert: true,
    notifyAnnouncePrediction: true,
    updatedAt: new Date(0).toISOString(),
  };
}

export async function update(input: UpdateSettingsInput, ctx: RequestContext) {
  requireCapability(ctx.role, "settings:write");
  for (const field of ["thresholdHigh", "thresholdMedium"] as const) {
    if (!Number.isFinite(input[field]) || input[field] < 0 || input[field] > 1) {
      throw new ValidationError("Threshold must be between 0 and 1", field);
    }
  }
  if (input.thresholdHigh <= input.thresholdMedium) {
    throw new ValidationError("HIGH threshold must be greater than MEDIUM threshold", "thresholdHigh");
  }

  return db.transaction(async (tx) => {
    const values = {
      id: 1,
      thresholdHigh: input.thresholdHigh,
      thresholdMedium: input.thresholdMedium,
      activeModelVersion: MODEL_VERSION,
      ...(input.notifyToastOnAlert === undefined ? {} : { notifyToastOnAlert: input.notifyToastOnAlert }),
      ...(input.notifyAnnouncePrediction === undefined ? {} : { notifyAnnouncePrediction: input.notifyAnnouncePrediction }),
      updatedAt: sql`now()`,
    };
    const [updated] = await tx
      .insert(settings)
      .values(values)
      .onConflictDoUpdate({
        target: settings.id,
        set: {
        thresholdHigh: input.thresholdHigh,
        thresholdMedium: input.thresholdMedium,
        ...(input.notifyToastOnAlert === undefined ? {} : { notifyToastOnAlert: input.notifyToastOnAlert }),
        ...(input.notifyAnnouncePrediction === undefined ? {} : { notifyAnnouncePrediction: input.notifyAnnouncePrediction }),
        updatedAt: sql`now()`,
        },
      })
      .returning();
    if (!updated) throw new NotFoundError();

    await auditService.record(tx, {
      actorRole: ctx.role,
      action: "SETTINGS_UPDATED",
      subjectType: "settings",
      subjectId: 1,
      metadata: {
        thresholdHigh: input.thresholdHigh,
        thresholdMedium: input.thresholdMedium,
      },
    });
    return updated;
  });
}
