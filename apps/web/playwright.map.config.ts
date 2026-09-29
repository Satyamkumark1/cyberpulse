import { defineConfig, devices } from "@playwright/test";

// Run against the local development server; no database writes or real
// location-provider requests are needed by these interaction tests.
export default defineConfig({
  testDir: "./tests/map",
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  outputDir: "/tmp/cyberpulse-map-test-results",
  use: { baseURL: process.env.MAP_TEST_BASE_URL ?? "http://localhost:3000", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
