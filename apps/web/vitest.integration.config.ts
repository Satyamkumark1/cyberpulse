import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["**/*.int.test.ts"],
    exclude: ["node_modules/**", ".next/**"],
    hookTimeout: 20_000,
    testTimeout: 20_000,
    // Integration tests run against one real database (RULE-testing: the
    // database is never mocked at this layer). Files executed in parallel
    // therefore share mutable state — `demoService`'s reset tests count and
    // delete every `origin = 'DEMO'` row, which is exactly what the testing
    // convention tells other tests to create. Sequential files remove that
    // whole class of interference; the suite runs in seconds either way.
    fileParallelism: false,
  },
});
