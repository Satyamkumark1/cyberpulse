import { randomUUID } from "node:crypto";

// architecture/api-design.md §1.3: x-request-id is generated if absent,
// propagated to the ML service, and echoed back in the response.
export function getRequestId(req: Request): string {
  return req.headers.get("x-request-id") ?? `req_${randomUUID()}`;
}
