import { defineConfig, devices } from "@playwright/test";

// Mirrors playwright.map.config.ts: runs against the local development
// server. The scenario issues ten real POST /api/predict calls tagged
// `origin = 'DEMO'`, which demo reset clears.
export default defineConfig({
  testDir: "./tests/demo",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  outputDir: "/tmp/cyberpulse-demo-test-results",
  use: { baseURL: process.env.DEMO_TEST_BASE_URL ?? "http://localhost:3000", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
