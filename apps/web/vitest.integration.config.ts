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
  },
});
