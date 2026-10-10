import { expect, test } from "@playwright/test";

// DEC-020. Integrity (RULE-testing.md): the bell and the outbox show the alert
// the API created, compared against that response — never a constant.
const officer = { "content-type": "application/json", "x-cyberpulse-role": "LEA", "x-cyberpulse-origin": "DEMO" };

test("a queued alert reaches the bank's notification bell and the outbox", async ({ page, request }) => {
  await request.post("/api/demo/reset", { headers: { "x-cyberpulse-role": "ADMIN" } });
  const list = await request.get("/api/complaints?pageSize=20&sort=complaintTimestamp&order=desc", { headers: officer });
  const complaintId = ((await list.json()).data as { complaintId: string }[]).find((c) => c.complaintId !== "C-10284")!.complaintId;

  const predicted = await request.post("/api/predict", { headers: officer, data: { complaintId, forceRefresh: true } });
  expect(predicted.ok(), "the ML service must be running").toBe(true);
  const { predictionRef } = (await predicted.json()) as { predictionRef: string };
  const created = await request.post("/api/alerts", { headers: officer, data: { predictionRef, recipients: ["BANK"] } });
  expect(created.status()).toBe(201);
  const { alertId } = (await created.json()) as { alertId: string };

  await page.goto("/dashboard?as=BANK");
  await page.getByRole("button", { name: /Notifications/ }).click();
  await expect(page.getByRole("region", { name: "Notifications" }).getByText(`Alert ${alertId}`)).toBeVisible();

  await page.goto("/outbox?as=BANK");
  await expect(page.getByRole("main")).toContainText(`"alertId": "${alertId}"`);
  await expect(page.getByRole("main")).toContainText("Simulated, not sent");
});
