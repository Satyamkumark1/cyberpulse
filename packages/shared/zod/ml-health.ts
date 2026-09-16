// GENERATED FILE — do not edit by hand.
// Source: packages/shared/schemas/*.schema.json — regenerate with `pnpm generate:zod`.
import { z } from 'zod';

export const MlHealthResponse = z.object({ "status": z.enum(["healthy","degraded","unhealthy"]), "modelLoaded": z.boolean(), "modelVersion": z.union([z.string(), z.null()]), "featureSchemaVersion": z.union([z.string(), z.null()]), "loadedAt": z.union([z.string().datetime({ offset: true }), z.null()]).optional() }).strict().describe("GET /health on the ML service (architecture/api-design.md ML-003). Validated on arrival by the web app's ML client — a malformed response becomes a typed error, never a database row (RULE-backend.md).");
export type MlHealthResponse = z.infer<typeof MlHealthResponse>;
