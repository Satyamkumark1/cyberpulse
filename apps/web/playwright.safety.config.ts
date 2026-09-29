import { defineConfig, devices } from "@playwright/test";

// FEAT-17 Scam Shield. Mirrors the other per-area configs: runs against the
// local development server. The full-chain case needs the ML service up; every
// row it writes is `origin = 'DEMO'`, and the suite ends with a demo reset.
export default defineConfig({
  testDir: "./tests/safety",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  outputDir: "/tmp/cyberpulse-safety-test-results",
  use: { baseURL: process.env.SAFETY_TEST_BASE_URL ?? "http://localhost:3000", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Pixel 7"], browserName: "chromium" } }],
});
