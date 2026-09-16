// GENERATED FILE — do not edit by hand.
// Source: packages/shared/schemas/*.schema.json — regenerate with `pnpm generate:zod`.
import { z } from 'zod';

export const HealthResponse = z.object({ "status": z.enum(["healthy","degraded","unhealthy"]), "web": z.object({ "status": z.enum(["up","degraded","down"]), "latencyMs": z.number().gte(0) }).strict(), "database": z.object({ "status": z.enum(["up","degraded","down"]), "latencyMs": z.number().gte(0) }).strict(), "mlService": z.object({ "status": z.enum(["up","degraded","down"]), "latencyMs": z.number().gte(0), "modelVersion": z.union([z.string(), z.null()]).optional(), "modelLoaded": z.boolean() }).strict(), "checkedAt": z.string().datetime({ offset: true }) }).strict().describe("GET /api/health (architecture/api-design.md API-080). Composes web, database and ML status; never throws.");
export type HealthResponse = z.infer<typeof HealthResponse>;
