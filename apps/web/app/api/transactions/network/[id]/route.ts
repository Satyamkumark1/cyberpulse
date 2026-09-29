import { z } from "zod";
import { RATE_LIMITS, TRAVERSAL_DEPTH_DEFAULT, TRAVERSAL_MAX_DEPTH, TRAVERSAL_MAX_NODES_CAP, TRAVERSAL_MAX_NODES_DEFAULT } from "@cyberpulse/shared/constants";
import { toErrorResponse } from "@/lib/errors";
import { withRateLimit } from "@/lib/rateLimit";
import { getRequestId } from "@/lib/requestId";
import { resolveRole, type RequestContext } from "@/services/lib/auth";
import { getNetwork } from "@/services/transactionService";

// architecture/api-design.md API-022. Bounds are validated here (400 before
// the query ever runs) and re-checked inside the service, which is the copy
// that matters — the traversal query itself has no independent guard against
// a bound it was never asked to honour.
const QuerySchema = z
  .object({
    depth: z.coerce.number().int().min(1).max(TRAVERSAL_MAX_DEPTH).default(TRAVERSAL_DEPTH_DEFAULT),
    maxNodes: z.coerce.number().int().min(1).max(TRAVERSAL_MAX_NODES_CAP).default(TRAVERSAL_MAX_NODES_DEFAULT),
    view: z.enum(["complaint", "related"]).default("complaint"),
  })
  .strict();

export const GET = withRateLimit<[{ params: Promise<{ id: string }> }]>(RATE_LIMITS.network)(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const requestId = getRequestId(req);
    try {
      const { id } = await params;
      const url = new URL(req.url);
      const input = QuerySchema.parse(Object.fromEntries(url.searchParams));
      const ctx: RequestContext = { role: resolveRole(req), requestId, origin: "USER" };
      const result = await getNetwork(id, input.depth, input.maxNodes, ctx, input.view);
      return Response.json(result, { status: 200, headers: { "x-request-id": requestId } });
    } catch (e) {
      return toErrorResponse(e, requestId);
    }
  },
);
