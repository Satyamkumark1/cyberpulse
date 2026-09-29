import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

// FEAT-17 Scam Shield — TC-SAFE-030 … TC-SAFE-039. Runs at phone size: a
// citizen is most likely to be on a phone when the call comes in.

const DISCLAIMER =
  "Prototype uses synthetic/anonymized demonstration data. Predictions are experimental and intended for research/proof-of-concept use.";
const REPORT_NOTICE =
  "This prototype does not send your report to police or banks. To report, call 1930 or use cybercrime.gov.in.";
const ROUTES = ["/safety", "/safety/check", "/safety/verify", "/safety/report", "/safety/status"];

async function fileReport(page: Page) {
  await page.goto("/safety/report");
  await page.getByRole("button", { name: "Continue to the short report" }).click();
  await page.getByLabel("What kind of fraud was it?").selectOption("UPI_FRAUD");
  await page.getByLabel("Amount lost, in rupees").fill("45000");
  await page.getByLabel("Your city").selectOption("Mumbai");
  const response = page.waitForResponse((r) => r.url().endsWith("/api/citizen/reports") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Submit report" }).click();
  return (await (await response).json()) as { complaintId: string; trackingCode: string };
}

async function lookUp(page: Page, complaintId: string, trackingCode: string) {
  await page.goto(`/safety/status?id=${complaintId}`);
  await page.getByLabel("Tracking code").fill(trackingCode);
  await page.getByRole("button", { name: "Check status" }).click();
}

test.afterAll(async ({ request }: { request: APIRequestContext }) => {
  await request.post("/api/demo/reset", { headers: { "x-cyberpulse-role": "ADMIN" } });
});

test("TC-SAFE-035: badge, disclaimer and report notice are on every /safety route, in both languages", async ({ page }) => {
  for (const route of ROUTES) {
    for (const suffix of ["", "?lang=hi"]) {
      await page.goto(route + suffix);
      await expect(page.getByText("SAMPLE / SYNTHETIC PROTOTYPE DATA")).toBeVisible();
      await expect(page.getByText(DISCLAIMER)).toBeVisible();
      await expect(page.getByText(REPORT_NOTICE)).toBeVisible();
    }
  }
});

test("TC-SAFE-030: Scam Check says stop at two matched flags and names the reasons", async ({ page }) => {
  await page.goto("/safety/check");
  await expect(page.getByText("Stop. This matches a known scam pattern.")).toHaveCount(0);

  await page.getByText("The caller says they are from police").click();
  await expect(page.getByText("Be careful. One red flag matches.")).toBeVisible();

  await page.getByText("They tell you to stay on a video call").click();
  await expect(page.getByText("Stop. This matches a known scam pattern.")).toBeVisible();
  await expect(page.getByText("2 of 4 red flags match")).toBeVisible();
  await expect(page.getByText("There is no such thing as a digital arrest.", { exact: false })).toBeVisible();
  await expect(page.locator("main")).not.toContainText("%");
});

test("TC-SAFE-031: Verify checks a link, a number and a UPI ID without any network request", async ({ page }) => {
  await page.goto("/safety/verify");
  const apiCalls: string[] = [];
  page.on("request", (r) => {
    if (new URL(r.url()).pathname.startsWith("/api/")) apiCalls.push(r.url());
  });

  await page.getByLabel("Link from an SMS or chat").fill("https://sbi-kyc-update.co/verify");
  await page.getByRole("button", { name: "Check link" }).click();
  await expect(page.getByText("Uses a bank-like name but does not end in .bank.in.", { exact: false })).toBeVisible();

  await page.getByLabel("Number that called you").fill("1600 123 456");
  await page.getByRole("button", { name: "Check number" }).click();
  await expect(page.getByText("The 1600 series is reserved", { exact: false })).toBeVisible();

  await page.getByLabel("UPI ID you were asked to pay for an investment").fill("growthtips@ybl");
  await page.getByRole("button", { name: "Check UPI ID" }).click();
  await expect(page.getByText("Not a validated handle.", { exact: false })).toBeVisible();

  // Editing the value hides the old verdict rather than leaving it stale.
  await page.getByLabel("UPI ID you were asked to pay for an investment").fill("abc.brk@validhdfc");
  await expect(page.getByText("Not a validated handle.", { exact: false })).toHaveCount(0);

  expect(apiCalls).toEqual([]);
});

test("TC-SAFE-032: Report Now shows the complaint ID and code the API returned", async ({ page }) => {
  const report = await fileReport(page);
  await expect(page.getByRole("heading", { name: "Report received" })).toBeFocused();
  await expect(page.getByText(report.complaintId, { exact: true })).toBeVisible();
  await expect(page.getByText(report.trackingCode, { exact: true })).toBeVisible();
});

test("TC-SAFE-032: the status page renders the stage from the response, not a constant", async ({ page }) => {
  const report = await fileReport(page);
  // Integrity: whatever the API says is what the page shows.
  await page.route("**/api/citizen/reports/status", (r) =>
    r.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ complaintId: report.complaintId, stage: "UNDER_REVIEW", updatedAt: "2026-09-24T10:00:00.000Z" }),
    }),
  );
  await lookUp(page, report.complaintId, report.trackingCode);
  const current = page.getByTestId("citizen-stage-timeline").locator('[aria-current="step"]');
  await expect(current).toContainText("Under review");
});

test("TC-SAFE-034: the status page shows no score, amount, window or location", async ({ page }) => {
  const report = await fileReport(page);
  await lookUp(page, report.complaintId, report.trackingCode);
  await expect(page.getByTestId("citizen-stage-timeline")).toBeVisible();
  const text = (await page.locator("main").innerText()).toLowerCase();
  expect(text).not.toMatch(/\d+(\.\d+)?%/);
  expect(text).not.toMatch(/₹[\d,]+/);
  expect(text).not.toMatch(/\d{2}:\d{2}\s*[–-]\s*\d{2}:\d{2}/);
  expect(text).not.toContain("hotspot");
  expect(text).not.toContain("window");
});

// The identical-404 property itself is owned by integration (TC-SAFE-017);
// this asserts only what the citizen is shown for it.
test("TC-SAFE-032: a wrong tracking code shows the not-found message and no stage", async ({ page }) => {
  const report = await fileReport(page);
  await lookUp(page, report.complaintId, "AAAA-AAAA-AAAA-AAAA");
  await expect(page.getByText("No report matches this complaint ID and tracking code.", { exact: false })).toBeVisible();
  await expect(page.getByTestId("citizen-stage-timeline")).toHaveCount(0);
});

test("TC-SAFE-033: a citizen report flows to the officer queue, gets a real prediction and alert, and the citizen sees it", async ({
  page,
  request,
}) => {
  const report = await fileReport(page);

  const officer = { "content-type": "application/json", "x-cyberpulse-role": "LEA", "x-cyberpulse-origin": "DEMO" };
  const queue = await request.get(`/api/complaints?q=${report.complaintId}`, { headers: officer });
  expect((await queue.json()).total).toBe(1);

  const prediction = await request.post("/api/predict", { headers: officer, data: { complaintId: report.complaintId } });
  expect(prediction.status(), "the ML service must be running for the full chain").toBe(201);
  const { predictionRef } = (await prediction.json()) as { predictionRef: string };

  const alert = await request.post("/api/alerts", { headers: officer, data: { predictionRef, recipients: ["LEA", "BANK"] } });
  expect(alert.status()).toBe(201);

  await lookUp(page, report.complaintId, report.trackingCode);
  const current = page.getByTestId("citizen-stage-timeline").locator('[aria-current="step"]');
  await expect(current).toContainText("Alert sent to bank and police");
});

test("TC-SAFE-037: Report Now can be completed from the keyboard, with focus moved to each step", async ({ page }) => {
  await page.goto("/safety/report");
  await page.getByRole("button", { name: "Continue to the short report" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Short report" })).toBeFocused();

  await page.getByLabel("What kind of fraud was it?").focus();
  await page.keyboard.press("Enter");
  await page.getByLabel("What kind of fraud was it?").selectOption("JOB_SCAM");
  await page.keyboard.press("Tab");
  await page.keyboard.type("1200");
  await page.getByLabel("Your city").selectOption("Delhi");
  await page.getByRole("button", { name: "Submit report" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Report received" })).toBeFocused();
});

test("TC-SAFE-037: an invalid form moves focus to the first invalid field", async ({ page }) => {
  await page.goto("/safety/report");
  await page.getByRole("button", { name: "Continue to the short report" }).click();
  await page.getByRole("button", { name: "Submit report" }).click();
  await expect(page.getByLabel("What kind of fraud was it?")).toBeFocused();
  await expect(page.getByText("Choose the kind of fraud.")).toBeVisible();
});

test("TC-SAFE-038: the Hindi toggle switches the page language through the URL", async ({ page }) => {
  await page.goto("/safety/check");
  await page.getByRole("link", { name: "हिन्दी" }).click();
  await expect(page).toHaveURL(/lang=hi/);
  await expect(page.locator("main")).toHaveAttribute("lang", "hi");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("क्या यह स्कैम है?");
});

test("TC-SAFE-039: a CITIZEN role cookie on the officer dashboard shows the gate, not an error", async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: "cyberpulse_role", value: "CITIZEN", url: baseURL! }]);
  await page.goto("/dashboard");
  await expect(page.getByText("This workspace is for officers")).toBeVisible();
  await expect(page.getByRole("link", { name: "Open Scam Shield" })).toBeVisible();
});
