import { ZodError } from "zod";
import type { ErrorCode } from "@cyberpulse/shared/enums";
import type { ErrorEnvelope } from "@cyberpulse/shared/zod/error";
import { logger } from "./logger";

// architecture/api-design.md §1.2 + ADR-020: one error shape, one serialiser,
// a closed code set. Internal detail — stack traces, SQL, file paths,
// dependency versions — is logged server-side against requestId and never
// serialised (NFR-13, TC-SEC-004).
const STATUS_BY_CODE: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INVALID_TRANSITION: 409,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  ML_UNAVAILABLE: 503,
  TIMEOUT: 504,
};

// The only text a client ever sees for a given code unless the throw site
// supplies a more specific — but still safe — message (e.g. a Zod field name).
export const SAFE_MESSAGES: Record<ErrorCode, string> = {
  VALIDATION_ERROR: "The request did not pass validation.",
  UNAUTHORIZED: "No resolvable role.",
  FORBIDDEN: "This role cannot perform this action.",
  NOT_FOUND: "Resource not found.",
  INVALID_TRANSITION: "This transition is not permitted from the current state.",
  CONFLICT: "This record was changed by someone else. Reload and retry.",
  RATE_LIMITED: "Too many requests. Retry after the window.",
  INTERNAL_ERROR: "An unexpected error occurred.",
  ML_UNAVAILABLE: "Prediction service unavailable. Retry.",
  TIMEOUT: "The upstream service did not respond in time.",
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly field?: string;

  constructor(code: ErrorCode, message?: string, field?: string) {
    super(message ?? SAFE_MESSAGES[code]);
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    if (field !== undefined) this.field = field;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, field?: string) {
    super("VALIDATION_ERROR", message, field);
  }
}
export class ForbiddenError extends AppError {
  constructor() {
    super("FORBIDDEN");
  }
}
export class NotFoundError extends AppError {
  constructor() {
    super("NOT_FOUND");
  }
}
export class InvalidTransitionError extends AppError {
  constructor(message?: string) {
    super("INVALID_TRANSITION", message);
  }
}
export class ConflictError extends AppError {
  constructor() {
    super("CONFLICT");
  }
}
export class RateLimitedError extends AppError {
  constructor() {
    super("RATE_LIMITED");
  }
}
export class MlUnavailableError extends AppError {
  constructor() {
    super("ML_UNAVAILABLE");
  }
}
export class MlTimeoutError extends AppError {
  constructor() {
    super("TIMEOUT");
  }
}
export class MlInferenceError extends AppError {
  constructor(message?: string) {
    super("INTERNAL_ERROR", message);
  }
}

/**
 * The one function that serialises any thrown value into the universal error
 * envelope. Never called with the original exception's text for an
 * unrecognised error — that text is logged against requestId and discarded.
 */
export function toErrorResponse(err: unknown, requestId: string): Response {
  const appError = toAppError(err);

  if (!(err instanceof AppError)) {
    logger.error({ requestId, err }, "unhandled error");
  }

  // Typed against the generated contract, not restated by hand (ADR-002,
  // CLAUDE.md binding instruction 11) — a field rename in error.schema.json
  // fails this assignment, catching the drift at compile time (AC-P2-11).
  const body: ErrorEnvelope = {
    error: {
      code: appError.code,
      message: appError.message,
      ...(appError.field ? { field: appError.field } : {}),
      requestId,
    },
  };

  return Response.json(body, { status: appError.status });
}

function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  if (err instanceof ZodError) {
    const first = err.issues[0];
    return new ValidationError(first?.message ?? SAFE_MESSAGES.VALIDATION_ERROR, first?.path.join("."));
  }
  return new AppError("INTERNAL_ERROR");
}
