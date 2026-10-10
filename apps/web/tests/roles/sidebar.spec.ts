import { expect, test, type Page } from "@playwright/test";

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

const personas = (page: Page) => page.getByRole("group", { name: "Prototype role" });
const activeRole = (page: Page, role: string) =>
  expect(personas(page).getByRole("button", { name: role, exact: true })).toHaveAttribute("aria-pressed", "true");

test("choosing CITIZEN in the role switcher opens the citizen pages", async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: "cyberpulse_role", value: "LEA", url: baseURL! }]);
  await page.goto("/dashboard");

  await personas(page).getByRole("button", { name: "CITIZEN" }).click();

  await expect(page).toHaveURL(/\/safety$/);
});

test("one click switches between officer roles", async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: "cyberpulse_role", value: "LEA", url: baseURL! }]);
  await page.goto("/dashboard");

  await personas(page).getByRole("button", { name: "BANK" }).click();

  await activeRole(page, "BANK");
});

// ADR-023: ADMIN is the one role that needs the demo access code.
test("choosing ADMIN asks for the access code and refuses a wrong one", async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: "cyberpulse_role", value: "LEA", url: baseURL! }]);
  await page.goto("/dashboard");

  await personas(page).getByRole("button", { name: "ADMIN" }).click();
  await page.getByLabel("ADMIN access code").fill("not-the-access-code");
  await page.getByRole("button", { name: "Switch" }).click();

  await expect(page.getByRole("status").filter({ hasText: "Access code not accepted." })).toBeVisible();
  await activeRole(page, "LEA");
});

test("the right access code switches to ADMIN", async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: "cyberpulse_role", value: "LEA", url: baseURL! }]);
  await page.goto("/dashboard");

  await personas(page).getByRole("button", { name: "ADMIN" }).click();
  await page.getByLabel("ADMIN access code").fill(process.env.ADMIN_ACCESS_CODE ?? "");
  await page.getByRole("button", { name: "Switch" }).click();

  await activeRole(page, "ADMIN");
});

test("the demo code shown on the page switches to ADMIN in one click", async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: "cyberpulse_role", value: "LEA", url: baseURL! }]);
  await page.goto("/dashboard");

  await personas(page).getByRole("button", { name: "ADMIN" }).click();
  await expect(page.getByText(`Demo code: ${process.env.ADMIN_ACCESS_CODE}`)).toBeVisible();
  await page.getByRole("button", { name: "Use demo code" }).click();

  await activeRole(page, "ADMIN");
});

test("keeping ADMIN on this device sets a seven-day cookie", async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: "cyberpulse_role", value: "LEA", url: baseURL! }]);
  await page.goto("/dashboard");

  await personas(page).getByRole("button", { name: "ADMIN" }).click();
  await page.getByLabel("Keep ADMIN on this device for 7 days").check();
  await page.getByRole("button", { name: "Use demo code" }).click();
  await activeRole(page, "ADMIN");

  const cookie = (await context.cookies()).find((c) => c.name === "cyberpulse_role")!;
  const daysLeft = (cookie.expires * 1000 - Date.now()) / 86_400_000;
  expect(daysLeft).toBeGreaterThan(6.9);
  expect(cookie.httpOnly).toBe(true);
});

test("a hand-written ADMIN cookie gets LEA, not ADMIN", async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: "cyberpulse_role", value: "ADMIN", url: baseURL! }]);
  await page.goto("/dashboard");

  await activeRole(page, "LEA");
});
