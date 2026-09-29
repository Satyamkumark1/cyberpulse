import { z } from "zod";
import { RATE_LIMITS } from "@cyberpulse/shared/constants";
import { toErrorResponse } from "@/lib/errors";
import { withRateLimit } from "@/lib/rateLimit";
import { getRequestId } from "@/lib/requestId";
import { resolveRole, type RequestContext } from "@/services/lib/auth";
import { addNote } from "@/services/investigationService";

const NoteSchema = z
  .object({
    body: z.string().min(1, "body is required"),
  })
  .strict();

export const POST = withRateLimit<[{ params: Promise<{ caseId: string }> }]>(RATE_LIMITS.mutations)(async (
  req: Request,
  { params }: { params: Promise<{ caseId: string }> },
) => {
  const requestId = getRequestId(req);
  try {
    const { caseId } = await params;
    const json: unknown = await req.json();
    const { body } = NoteSchema.parse(json);

    const ctx: RequestContext = { role: resolveRole(req), requestId, origin: "USER" };
    const note = await addNote(caseId, body, ctx);

    return Response.json(note, {
      status: 201,
      headers: { "x-request-id": requestId },
    });
  } catch (e) {
    return toErrorResponse(e, requestId);
  }
});
