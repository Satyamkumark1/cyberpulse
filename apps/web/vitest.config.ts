import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["**/*.int.test.ts", "node_modules/**", ".next/**"],
    env: {
      // lib/env.ts refuses to boot on a missing variable — unit tests never
      // touch these services, but the module load path still validates them.
      DATABASE_URL: "postgres://cyberpulse:cyberpulse@localhost:5432/cyberpulse",
      ML_SERVICE_URL: "http://localhost:8000",
      NEXT_PUBLIC_MAP_TILE_URL: "https://demotiles.maplibre.org/style.json",
    },
  },
});
