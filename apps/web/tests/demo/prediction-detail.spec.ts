import { expect, test } from "@playwright/test";

// Integrity test (RULE-testing.md): the alert and investigation detail pages
// must render the prediction exactly as the API returned it. They once
// multiplied an already-percentage contribution by 100 ("8010.0%") and ran
// the confidence level through a number formatter ("NaN%").
const officer = { "content-type": "application/json", "x-cyberpulse-role": "LEA", "x-cyberpulse-origin": "DEMO" };

type Factor = { name: string; contribution: number; direction: "INCREASES" | "REDUCES" };

test("alert and investigation detail pages show the prediction's factors and confidence as returned", async ({ page, request }) => {
  await request.post("/api/demo/reset", { headers: { "x-cyberpulse-role": "ADMIN" } });

  const list = await request.get("/api/complaints?pageSize=20&sort=complaintTimestamp&order=desc", { headers: officer });
  const complaints = (await list.json()).data as { complaintId: string }[];
  const complaintId = complaints.find((c) => c.complaintId !== "C-10284")!.complaintId;

  const predicted = await request.post("/api/predict", { headers: officer, data: { complaintId, forceRefresh: true } });
  expect(predicted.ok(), "the ML service must be running").toBe(true);
  const prediction = (await predicted.json()) as { predictionRef: string; confidence: string; factors: Factor[] };
  expect(prediction.factors.length).toBeGreaterThan(0);

  const created = await request.post("/api/alerts", { headers: officer, data: { predictionRef: prediction.predictionRef, recipients: ["LEA"] } });
  expect(created.status()).toBe(201);
  const alert = (await created.json()) as { alertId: string; investigationCaseId: string };

  for (const path of [`/alerts/${alert.alertId}`, `/investigations/${alert.investigationCaseId}`]) {
    await page.goto(path);
    const main = page.getByRole("main");
    await expect(main).not.toContainText("NaN");
    await expect(main).toContainText(prediction.confidence);
    for (const factor of prediction.factors) {
      const row = main.getByRole("listitem").filter({ hasText: factor.name });
      await expect(row, `${path}: ${factor.name}`).toContainText(`${factor.contribution.toFixed(1)}%`);
    }
  }
});
