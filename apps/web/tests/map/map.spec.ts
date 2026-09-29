import { expect, test, type Page } from "@playwright/test";

const h3Index = "88618c4f29fffff";
const hotspot = {
  h3Index, name: "Chennai", latitude: 13.039577, longitude: 80.245447,
  city: "Chennai", district: "Chennai", state: "Tamil Nadu", riskScore: 0.67,
  riskLevel: "MEDIUM", likelyAtmCount: 0, expectedStart: null, expectedEnd: null,
};
const place = {
  id: "test-place", name: "Sir Thyagaraya Road", label: "Sir Thyagaraya Road, Chennai, Tamil Nadu",
  latitude: 13.039568, longitude: 80.245382, locality: "Chennai", district: "Chennai",
  state: "Tamil Nadu", postalCode: "600018", source: "OpenStreetMap / Photon", matchType: "nearby",
};

async function mockMapData(page: Page) {
  await page.route("**/api/hotspots?*", (route) => route.fulfill({ json: { data: [hotspot] } }));
  await page.route(`**/api/hotspots/${h3Index}`, (route) => route.fulfill({ json: { ...hotspot, nearbyAtms: [], topFactors: [], relatedComplaints: [] } }));
  await page.route("**/api/atms?*", (route) => route.fulfill({ json: { data: [] } }));
  await page.route("**/api/locations?*", (route) => route.fulfill({ json: { data: [place], lookedUpAt: "2026-09-16T00:00:00Z" } }));
  // Interaction coverage uses a local style; live street rendering is checked
  // separately against the actual provider, without network-dependent tests.
  await page.route("https://tiles.openfreemap.org/**", (route) => route.fulfill({ json: {
    version: 8, sources: {}, glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
    layers: [{ id: "background", type: "background", paint: { "background-color": "#ecf0f6" } }],
  } }));
}

test("deep links, PIN details, and map/table switching preserve selection", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message));
  await mockMapData(page);
  await page.goto(`/risk-map#${h3Index}`);
  await expect(page.getByText("600018", { exact: true })).toBeVisible();
  await expect(page.getByText(/approximate postal match/)).toBeVisible();
  await page.getByRole("button", { name: "Accessible table", exact: true }).click();
  await expect(page.getByRole("table")).toBeVisible();
  await page.getByRole("button", { name: "Show map", exact: true }).click();
  await expect(page.locator("canvas.maplibregl-canvas")).toBeVisible();
  await expect(page.locator("canvas.maplibregl-canvas")).toHaveCount(1);
  expect(page.url()).toContain(h3Index);
  expect(errors).toEqual([]);
});

test("coordinate search stays a geographic reference and rejects swapped coordinates", async ({ page }) => {
  await mockMapData(page); await page.goto("/risk-map");
  const search = page.getByLabel("Search locality, PIN code, or coordinates");
  await search.fill("80.245447, 13.039577"); await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByText("Enter a six-digit PIN code or latitude, longitude within India.")).toBeVisible();
  await search.fill("13.039577, 80.245447"); await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByText("Geographic reference · no risk assessment")).toBeVisible();
  await expect(page.getByText("13.03958, 80.24545", { exact: true })).toBeVisible();
  await expect(page.getByText("Dashed boundary · predicted area")).toHaveCount(0);
});

test("lookup failures preserve the selected coordinate and provide retry", async ({ page }) => {
  await mockMapData(page);
  await page.route("**/api/locations?*", (route) => route.fulfill({ status: 504, json: { error: { message: "Location lookup unavailable. Retry." } } }));
  await page.goto(`/risk-map#${h3Index}`);
  await expect(page.getByRole("button", { name: "Retry location lookup" })).toBeVisible({ timeout: 10000 });
  await expect(page.getByText("13.03958, 80.24545", { exact: true })).toBeVisible();
  await expect(page.getByText("600018", { exact: true })).toHaveCount(0);
});

test("without WebGL the accessible table loads and supports selection", async ({ page }) => {
  await page.addInitScript(() => { HTMLCanvasElement.prototype.getContext = () => null; });
  await mockMapData(page); await page.goto("/risk-map");
  await expect(page.getByText("WebGL is unavailable. Explore locations using the table below.")).toBeVisible();
  await page.getByRole("table").getByRole("button", { name: "Chennai" }).click();
  await expect(page.getByText("600018", { exact: true })).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
});

test("mobile navigation closes with Escape and the map does not widen the page", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockMapData(page); await page.goto("/risk-map");
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("navigation", { name: "Primary" })).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Menu", exact: true })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("a failed basemap leaves hotspot pins and the table usable", async ({ page }) => {
  await mockMapData(page);
  await page.route("https://tiles.openfreemap.org/**", (route) => route.abort());
  await page.goto("/risk-map");
  await expect(page.getByText("Street map unavailable. Location pins and the table remain available.")).toBeVisible({ timeout: 18000 });
  await expect(page.getByRole("button", { name: "Open Chennai, medium risk" })).toBeVisible();
  await page.getByRole("button", { name: "Accessible table", exact: true }).click();
  await expect(page.getByRole("table")).toBeVisible();
});
