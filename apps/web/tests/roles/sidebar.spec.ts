import { expect, test } from "@playwright/test";

// ADR-021 — GUARD and I4C. Sidebar.tsx is role-aware for the first time; this
// is genuinely new E2E territory (neither scenario.spec.ts nor map.spec.ts
// exercises the sidebar or role-switching itself).

const DEFAULT_NAV_LABELS = [
  "Dashboard",
  "Risk Map",
  "Alerts",
  "Complaints",
  "Transactions",
  "Investigations",
  "Reports",
  "Settings",
];

test("GUARD's sidebar omits every capability it lacks", async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: "cyberpulse_role", value: "GUARD", url: baseURL! }]);
  await page.goto("/guard");

  const nav = page.getByRole("navigation", { name: "Primary" });
  await expect(nav.getByRole("link", { name: "Duty Coverage" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Settings" })).toBeVisible();

  for (const label of ["Dashboard", "Risk Map", "Alerts", "Complaints", "Transactions", "Investigations", "Reports"]) {
    await expect(nav.getByRole("link", { name: label })).toHaveCount(0);
  }
});

test("I4C's sidebar exposes only its dedicated read-only navigation", async ({
  page,
  context,
  baseURL,
}) => {
  await context.addCookies([{ name: "cyberpulse_role", value: "I4C", url: baseURL! }]);
  await page.goto("/dashboard");

  const nav = page.getByRole("navigation", { name: "Primary" });
  for (const label of DEFAULT_NAV_LABELS.filter((label) => label !== "Settings")) {
    await expect(nav.getByRole("link", { name: label })).toBeVisible();
  }
  await expect(nav.getByRole("link", { name: "Settings" })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Duty Coverage" })).toHaveCount(0);
});

test("LEA's sidebar is unchanged", async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: "cyberpulse_role", value: "LEA", url: baseURL! }]);
  await page.goto("/dashboard");

  const nav = page.getByRole("navigation", { name: "Primary" });
  for (const label of DEFAULT_NAV_LABELS) {
    await expect(nav.getByRole("link", { name: label })).toBeVisible();
  }
});

test("/guard renders a real duty-post table for GUARD, composed from the live prediction and coverage data", async ({
  page,
  context,
  baseURL,
}) => {
  await context.addCookies([{ name: "cyberpulse_role", value: "GUARD", url: baseURL! }]);

  const hotspots = await page.request.get("/api/hotspots?limit=10", {
    headers: { "x-cyberpulse-role": "GUARD" },
  });
  const { data } = (await hotspots.json()) as { data: { h3Index: string; name: string }[] };

  await page.goto("/guard");
  await expect(page.getByRole("heading", { name: "Duty Coverage" })).toBeVisible();

  if (data.length === 0) {
    await expect(page.getByText("No hotspots have been predicted yet.")).toBeVisible();
    return;
  }

  // Integrity: the page names the same predicted cells the API returned, not
  // a fixed constant.
  await expect(page.getByText(data[0]!.name, { exact: false }).first()).toBeVisible();
});

test("choosing CITIZEN in the role switcher opens the citizen pages", async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: "cyberpulse_role", value: "LEA", url: baseURL! }]);
  await page.goto("/dashboard");

  await page.getByLabel("Prototype role").selectOption("CITIZEN");

  await expect(page).toHaveURL(/\/safety$/);
});
