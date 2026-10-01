import { expect, test } from "@playwright/test";

const STEP_TIMEOUT_MS = 30_000;

// Regression: selecting a complaint with a different location recreates the
// map. The overlay effect must not add sources to the new map before its style
// has loaded ("Style is not done loading"), which blanked the whole page.
test("switching the hotspot map to another complaint keeps the page up", async ({ page }) => {
  // Local style, so the test does not depend on the tile provider.
  await page.route("https://tiles.openfreemap.org/**", (route) =>
    route.fulfill({
      json: { version: 8, sources: {}, layers: [{ id: "background", type: "background", paint: { "background-color": "#ecf0f6" } }] },
    }),
  );

  await page.goto("/demo?step=4");
  const section = page.getByRole("region", { name: "Hotspot prediction" });
  await expect(section.locator("canvas.maplibregl-canvas")).toBeVisible({ timeout: STEP_TIMEOUT_MS });
  await expect(section.getByText("Rendering hotspot map…")).toBeHidden({ timeout: STEP_TIMEOUT_MS });

  // Every row must have its prediction before a second one can be selected.
  await expect(section.getByText("Pending")).toHaveCount(0, { timeout: STEP_TIMEOUT_MS });
  // A row with a different predicted location, so the map is recreated.
  const rows = section.locator("tbody tr");
  const hotspotOf = async (i: number) => (await rows.nth(i).locator("td").nth(2).innerText()).trim();
  const firstHotspot = await hotspotOf(0);
  let target = -1;
  for (let i = 1; i < (await rows.count()) && target < 0; i++) {
    if ((await hotspotOf(i)) !== firstHotspot) target = i;
  }
  expect(target).toBeGreaterThan(0);
  const secondId = (await rows.nth(target).locator("td").first().innerText()).trim();
  await rows.nth(target).click();

  await expect(section.getByText(`Hotspot Map: ${secondId}`)).toBeVisible();
  await expect(section.getByText("Rendering hotspot map…")).toBeHidden({ timeout: STEP_TIMEOUT_MS });
  await expect(page.getByRole("heading", { name: "Something failed to load." })).toHaveCount(0);
});
