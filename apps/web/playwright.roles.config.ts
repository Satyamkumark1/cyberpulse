import { defineConfig, devices } from "@playwright/test";

// Mirrors playwright.map.config.ts / playwright.demo.config.ts: runs against
// the local development server. Read-only — no prediction or alert calls.
export default defineConfig({
  testDir: "./tests/roles",
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  outputDir: "/tmp/cyberpulse-roles-test-results",
  use: { baseURL: process.env.ROLES_TEST_BASE_URL ?? "http://localhost:3000", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
