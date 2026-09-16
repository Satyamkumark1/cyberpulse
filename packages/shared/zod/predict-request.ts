// GENERATED FILE — do not edit by hand.
// Source: packages/shared/schemas/*.schema.json — regenerate with `pnpm generate:zod`.
import { z } from 'zod';

export const PredictRequest = z.object({ "complaintId": z.string().regex(new RegExp("^C-[0-9]{5}$")), "topK": z.number().int().gte(1).lte(20).default(5), "forceRefresh": z.boolean().default(false) }).strict().describe("POST /api/predict request body (architecture/api-design.md API-010).");
export type PredictRequest = z.infer<typeof PredictRequest>;
