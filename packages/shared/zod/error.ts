// GENERATED FILE — do not edit by hand.
// Source: packages/shared/schemas/*.schema.json — regenerate with `pnpm generate:zod`.
import { z } from 'zod';

export const ErrorEnvelope = z.object({ "error": z.object({ "code": z.enum(["VALIDATION_ERROR","UNAUTHORIZED","FORBIDDEN","NOT_FOUND","INVALID_TRANSITION","CONFLICT","RATE_LIMITED","INTERNAL_ERROR","ML_UNAVAILABLE","TIMEOUT"]), "message": z.string().min(1), "field": z.string().optional(), "requestId": z.string().min(1) }).strict() }).strict().describe("The single error shape returned by every endpoint (ADR-020, architecture/api-design.md §1.2).");
export type ErrorEnvelope = z.infer<typeof ErrorEnvelope>;
