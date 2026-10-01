import { defineConfig, devices } from "@playwright/test";

// One config, one project per suite, all against a running local app
// (`make dev`). Serial: the demo and safety suites write DEMO-origin rows and
// reset them, so they must not interleave. `pnpm test:e2e` runs every
// project; `pnpm test:map` etc. run one.
export default defineConfig({
  fullyParallel: false,
  workers: 1,
  outputDir: "/tmp/cyberpulse-e2e-results",
  use: { baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000", trace: "retain-on-failure" },
  projects: [
    { name: "map", testDir: "./tests/map", timeout: 30_000, use: { ...devices["Desktop Chrome"] } },
    // The scenario issues ten real POST /api/predict calls, so it needs the ML service.
    { name: "demo", testDir: "./tests/demo", timeout: 60_000, use: { ...devices["Desktop Chrome"] } },
    { name: "roles", testDir: "./tests/roles", timeout: 30_000, use: { ...devices["Desktop Chrome"] } },
    // Citizen pages are tested at phone size.
    { name: "safety", testDir: "./tests/safety", timeout: 60_000, use: { ...devices["Pixel 7"], browserName: "chromium" } },
  ],
});
