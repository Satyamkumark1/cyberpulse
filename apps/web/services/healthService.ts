import { pingDatabase } from "@cyberpulse/db";
import type { HealthResponse } from "@cyberpulse/shared/zod/health";
import { checkMlHealth } from "./mlClient";

// architecture/api-design.md API-080. This is the CLI test in practice: no
// Request/Response types, no React — pure composition of three checks.
async function checkDatabase(): Promise<{ status: "up" | "degraded" | "down"; latencyMs: number }> {
  const start = performance.now();
  try {
    await pingDatabase();
    return { status: "up", latencyMs: Math.round(performance.now() - start) };
  } catch {
    return { status: "down", latencyMs: Math.round(performance.now() - start) };
  }
}

export async function composeHealth(): Promise<HealthResponse> {
  const webStart = performance.now();
  const [database, ml] = await Promise.all([checkDatabase(), checkMlHealth()]);
  const web = { status: "up" as const, latencyMs: Math.round(performance.now() - webStart) };

  const status: HealthResponse["status"] =
    database.status === "down"
      ? "unhealthy"
      : database.status === "degraded" || ml.status !== "up"
        ? "degraded"
        : "healthy";

  return {
    status,
    web,
    database,
    mlService: ml,
    checkedAt: new Date().toISOString(),
  };
}
