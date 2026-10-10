import { expect, test } from "@playwright/test";
import { DEMO_COMPLAINT_IDS } from "../../../../packages/shared/constants.ts";

// TC-E2E-022 — one-click scenario (FR-19.1, AC-014-01).
// TC-UI-070 — scenario control behaviour (FR-19).

/**
 * Generous, because a cold `next dev` compiles the lazily-imported graph and
 * map chunks on first use. This is a liveness bound, not the AC-014-01 budget:
 * a wall-clock assertion here would be asserting webpack's speed, and
 * RULE-deployment is explicit that performance is measured on preview, never
 * locally. The dwell budget this feature actually controls is asserted in
 * components/demo/autoAdvance.test.ts.
 */
const STEP_TIMEOUT_MS = 30_000;

test("the scenario plays itself through on ten concurrent prediction calls", async ({ page }) => {
  const predictIds: string[] = [];
  page.on("request", (req) => {
    if (req.method() === "POST" && new URL(req.url()).pathname === "/api/predict") {
      predictIds.push((req.postDataJSON() as { complaintId: string }).complaintId);
    }
  });

  await page.goto("/demo?step=1&auto=1");

  await expect(page.getByRole("heading", { name: "Complaint", exact: true })).toBeVisible({ timeout: STEP_TIMEOUT_MS });

  // The run carries itself from the complaint to the explanation with no
  // further clicks.
  await expect(page.getByRole("heading", { name: "AI analysis" })).toBeVisible({ timeout: STEP_TIMEOUT_MS });
  await expect(page.getByRole("heading", { name: "Hotspot prediction" })).toBeVisible({ timeout: STEP_TIMEOUT_MS });
  await expect(page.getByRole("heading", { name: "Explanation" })).toBeVisible({ timeout: STEP_TIMEOUT_MS });

  // Exactly one request per fixed demo complaint, through the same hook the
  // complaint page uses (TC-INT-012 — there is no demo-only prediction path).
  expect(predictIds).toHaveLength(DEMO_COMPLAINT_IDS.length);
  expect(new Set(predictIds)).toEqual(new Set(DEMO_COMPLAINT_IDS));

  // The run ends on step 6, on the summary. Alert generation is enabled but
  // not performed — dispatching one is a human decision.
  await expect(page).toHaveURL(/step=6/);
  await expect(page).not.toHaveURL(/auto=1/);
  await expect(page.getByRole("button", { name: "Run scenario" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Queue Internal Alert" }).first()).toBeVisible();
  await expect(page.getByText("Not queued. Queueing an internal alert is a human decision.").first()).toBeVisible();
});

test("each run-summary row reports its own prediction response", async ({ page }) => {
  const responses = new Map<string, { modelVersion: string; riskScore: number; predictedLocation: { name: string } }>();
  page.on("response", async (res) => {
    if (res.request().method() !== "POST" || new URL(res.url()).pathname !== "/api/predict" || !res.ok()) return;
    const id = (res.request().postDataJSON() as { complaintId: string }).complaintId;
    responses.set(id, await res.json());
  });

  await page.goto("/demo?step=1&auto=1");
  const summary = page.getByRole("region", { name: "Run summary" });
  await expect(summary).toBeVisible({ timeout: STEP_TIMEOUT_MS });

  // Spot-check two distinct rows: the summary must retain each response's
  // values rather than rendering one prediction ten times.
  await expect.poll(() => responses.size).toBe(DEMO_COMPLAINT_IDS.length);
  for (const id of DEMO_COMPLAINT_IDS.slice(0, 2)) {
    const p = responses.get(id)!;
    const row = summary.locator("li").filter({ has: page.getByText(id, { exact: true }) }).first();
    await expect(row).toContainText(p.modelVersion);
    await expect(row).toContainText(`${(p.riskScore * 100).toFixed(1)} / 100`);
    await expect(row).toContainText(p.predictedLocation.name);
  }
});

test("one failed prediction degrades only its row and does not block the run", async ({ page }) => {
  const failedId = DEMO_COMPLAINT_IDS[0];
  await page.route("**/api/predict", async (route) => {
    const id = (route.request().postDataJSON() as { complaintId: string }).complaintId;
    if (id === failedId) {
      await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { code: "ML_UNAVAILABLE", message: "Prediction service unavailable. Retry." } }) });
      return;
    }
    await route.continue();
  });

  await page.goto("/demo?step=1&auto=1");
  await expect(page).toHaveURL(/step=6/, { timeout: STEP_TIMEOUT_MS });
  const summary = page.getByRole("region", { name: "Run summary" });
  const failedRow = summary.locator("li").filter({ has: page.getByText(failedId, { exact: true }) }).first();
  const predictionStages = failedRow.locator("ol").last().locator("li").filter({ hasNotText: "Complaint" });
  await expect(failedRow).toContainText("Prediction service unavailable");
  await expect(predictionStages).toHaveCount(5);
  // RULE-testing "prove absence": stages 3–6 contain no prediction-derived
  // score, window or exposure currency. Stage 1's reported amount is allowed.
  for (let index = 0; index < 5; index++) {
    await expect(predictionStages.nth(index)).not.toHaveText(/\d+(\.\d+)?%/);
    await expect(predictionStages.nth(index)).not.toHaveText(/\d+(\.\d+)?\s*\/\s*100/);
    await expect(predictionStages.nth(index)).not.toHaveText(/₹[\d,]+/);
    await expect(predictionStages.nth(index)).not.toHaveText(/\d{2}:\d{2}\s*[–-]\s*\d{2}:\d{2}/);
  }
  await expect(failedRow).toContainText("Prediction service unavailable");
  await expect(summary.getByText("Run summary")).toBeVisible();
});

test("all failed predictions freeze the run at analysis", async ({ page }) => {
  await page.route("**/api/predict", (route) => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { code: "ML_UNAVAILABLE", message: "Prediction service unavailable. Retry." } }) }));

  await page.goto("/demo?step=1&auto=1");
  await expect(page.getByRole("heading", { name: "AI analysis" })).toBeVisible({ timeout: STEP_TIMEOUT_MS });
  await expect(page).toHaveURL(/step=3/);
  await expect(page.getByText("Prediction service unavailable. Retry.").first()).toBeVisible({ timeout: STEP_TIMEOUT_MS });
  await expect(page.getByRole("heading", { name: "Hotspot prediction" })).toHaveCount(0);
});

test("a manual step control stops the run", async ({ page }) => {
  await page.goto("/demo?step=1&auto=1");
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();

  // One click, then poll the *assertion*, not the click. Pausing flips the
  // button's own accessible name to "Run scenario" on the same render that
  // drops auto=1 from the URL — re-clicking "Pause" inside a polling loop
  // races that rename: once it lands, a second `.click()` on the
  // now-vanished "Pause" locator hangs waiting for it to reappear, which it
  // never does, until the outer timeout fires on a stale "still true" read
  // taken before the first click had finished landing.
  await page.getByRole("button", { name: "Pause" }).click();

  await expect(page).not.toHaveURL(/auto=1/, { timeout: STEP_TIMEOUT_MS });
  await expect(page.getByRole("button", { name: "Run scenario" })).toBeVisible();

  const pausedUrl = page.url();
  // The paused run stays at its current state after the dwell that would have
  // advanced an active run.
  await page.waitForTimeout(5_000);
  expect(page.url()).toBe(pausedUrl);
});

test("a row's alert modal renders that row's response, not another row's", async ({ page }) => {
  // Integrity testing (RULE-testing.md): the rendered value is compared against
  // the intercepted response, never against a constant. A regression that
  // rescales the number fails here even though the number "looks plausible".
  const substituted = [
    { name: "Historical Hotspot", contribution: 42.5, direction: "INCREASES" },
    { name: "ATM Proximity", contribution: 21.3, direction: "REDUCES" },
    { name: "Time Pattern", contribution: 16.2, direction: "REDUCES" },
    { name: "Withdrawal History", contribution: 11.4, direction: "REDUCES" },
    { name: "Account Age", contribution: 8.6, direction: "REDUCES" },
  ];

  const selectedId = DEMO_COMPLAINT_IDS[0];
  const otherFactors = [{ name: "Other row only", contribution: 99.9, direction: "INCREASES" }];
  await page.route("**/api/predict", async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    const id = (route.request().postDataJSON() as { complaintId: string }).complaintId;
    body.factors = id === selectedId ? substituted : otherFactors;
    await route.fulfill({ response, body: JSON.stringify(body) });
  });

  await page.goto("/demo?step=1&auto=1");
  await expect(page.getByRole("heading", { name: "Explanation" })).toBeVisible({ timeout: STEP_TIMEOUT_MS });

  await page.getByRole("button", { name: "Next: Alert" }).click();
  const alertSection = page.locator("section").filter({ has: page.getByRole("heading", { name: "Alert", exact: true }) });
  await alertSection.locator("li").filter({ hasText: selectedId }).getByRole("button", { name: "Queue Internal Alert" }).click();

  const modal = page.getByRole("dialog");
  await expect(modal).toBeVisible();

  // Each factor renders its own contribution, to one decimal.
  for (const factor of substituted) {
    await expect(modal.getByText(`${factor.contribution.toFixed(1)}%`, { exact: false })).toBeVisible();
  }
  await expect(modal).not.toHaveText("99.9%");

  // Prove absence of the rescaled shape rather than of one known-wrong value:
  // any percentage of 1000% or more is arithmetically impossible for a set
  // normalised to sum to 100.
  await expect(modal).not.toHaveText(/\d{4,}(\.\d+)?%/);
});

test("site coverage lists the duty posts the API returned for the predicted cell", async ({ page }) => {
  let predictedH3 = "";
  const selectedId = DEMO_COMPLAINT_IDS[0];
  page.on("response", async (res) => {
    if (res.request().method() === "POST" && new URL(res.url()).pathname === "/api/predict" && res.ok()) {
      const id = (res.request().postDataJSON() as { complaintId: string }).complaintId;
      if (id === selectedId) predictedH3 = (await res.json()).predictedLocation.h3Index;
    }
  });

  await page.goto("/demo?step=1&auto=1");
  await expect(page.getByRole("heading", { name: "Explanation" })).toBeVisible({ timeout: STEP_TIMEOUT_MS });
  expect(predictedH3).toMatch(/^[0-9a-f]{15}$/);

  await page.getByRole("button", { name: "Next: Alert" }).click();
  const alertSection = page.locator("section").filter({ has: page.getByRole("heading", { name: "Alert", exact: true }) });
  await alertSection.locator("li").filter({ hasText: selectedId }).getByRole("button", { name: "Queue Internal Alert" }).click();
  const modal = page.getByRole("dialog");
  await expect(modal).toBeVisible();

  // What the coverage endpoint says for that exact cell is what must be on
  // screen — compared against the response, not against constants.
  const api = await page.request.get(`/api/guard-posts?h3Index=${predictedH3}`);
  const { posts } = (await api.json()) as { posts: { postId: string; atmId: string }[] };

  if (posts.length === 0) {
    await expect(modal.getByText("Site Coverage")).toHaveCount(0);
    return;
  }

  await expect(modal.getByText("Site Coverage")).toBeVisible();
  for (const post of posts.slice(0, 3)) {
    await expect(modal.getByText(post.postId, { exact: true })).toBeVisible();
  }
  // A post identifies a position, never a person.
  await expect(modal).not.toHaveText(/\b[6-9]\d{9}\b/);
});

test("demo reset names the role it needs instead of reporting a failure", async ({ page, context }) => {
  // `demo:reset` is an ADMIN capability. A LEA caller gets a correct 403, and
  // the control must say so — the generic wording it used before made an
  // ordinary authorisation result look like a broken server.
  await context.addCookies([{ name: "cyberpulse_role", value: "LEA", url: "http://localhost:3000" }]);
  await page.goto("/demo");

  await page.getByRole("button", { name: "Reset Demo" }).click();
  const dialog = page.getByRole("alertdialog", { name: "Reset demo data?" });
  await expect(dialog).toBeVisible();

  await expect(dialog.getByText("Demo reset requires the ADMIN role.")).toBeVisible();
  // The destructive control stays unavailable, so the dead end is not offered.
  await expect(dialog.getByRole("button", { name: "Confirm reset" })).toBeDisabled();
});

test("demo reset previews exact counts for a role that holds the capability", async ({ page, context }) => {
  await context.addCookies([{ name: "cyberpulse_role", value: "ADMIN", url: "http://localhost:3000" }]);
  await page.goto("/demo");

  await page.getByRole("button", { name: "Reset Demo" }).click();
  const dialog = page.getByRole("alertdialog", { name: "Reset demo data?" });

  // AC-P7-07: the confirmation names what will be cleared before committing.
  await expect(dialog.getByText(/Clears \d+ demo alert/)).toBeVisible();
  await expect(dialog.getByText(/Seed data is never touched\./)).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Confirm reset" })).toBeEnabled();
});
