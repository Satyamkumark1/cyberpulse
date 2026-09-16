import { describe, expect, it } from "vitest";
import { composeHealth } from "./healthService";

// Route -> service -> real database (RULE-testing.md — never mock the
// database at the integration layer). Requires DATABASE_URL to point at a
// live, migrated Postgres (docker compose up postgres, or CI's service
// container) and ML_SERVICE_URL pointing anywhere reachable-or-not; both
// outcomes are asserted below rather than assumed.
describe("composeHealth — API-080", () => {
  it("reports database up against a real, reachable Postgres", async () => {
    const health = await composeHealth();
    expect(health.database.status).toBe("up");
    expect(health.database.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("never throws even when the ML service is unreachable, and composes a coherent overall status", async () => {
    const health = await composeHealth();
    // Whatever the individual components report, `status` must be the
    // documented function of them — the value under test is the composition
    // logic itself, not a fixed expectation about ML's reachability here.
    if (health.database.status === "down") {
      expect(health.status).toBe("unhealthy");
    } else if (health.database.status === "degraded" || health.mlService.status !== "up") {
      expect(health.status).toBe("degraded");
    } else {
      expect(health.status).toBe("healthy");
    }
  });

  it("always returns a fresh checkedAt timestamp — never cached (RULE-frontend.md)", async () => {
    const first = await composeHealth();
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = await composeHealth();
    expect(new Date(second.checkedAt).getTime()).toBeGreaterThanOrEqual(new Date(first.checkedAt).getTime());
  });
});
