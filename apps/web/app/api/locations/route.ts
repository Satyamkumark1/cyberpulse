import { z } from "zod";
import { CoordinateSchema } from "@/lib/location";
import { toErrorResponse } from "@/lib/errors";
import { getRequestId } from "@/lib/requestId";
import { withRateLimit } from "@/lib/rateLimit";
import { requireCapability, resolveRole } from "@/services/lib/auth";
import { lookupLocation } from "@/services/locationService";

const QuerySchema = z.union([
  z.object({ q: z.string().trim().min(2).max(120) }).strict(),
  z.object({ lat: z.string().min(1), lon: z.string().min(1) }).strict()
    .transform(({ lat, lon }) => ({ latitude: Number(lat), longitude: Number(lon) })).pipe(CoordinateSchema),
]);

export const GET = withRateLimit({ limit: 30, windowMs: 60_000 })(async (req: Request) => {
  const requestId = getRequestId(req);
  try {
    requireCapability(resolveRole(req), "hotspots:read");
    const query = QuerySchema.parse(Object.fromEntries(new URL(req.url).searchParams));
    return Response.json(await lookupLocation(query), {
      headers: { "x-request-id": requestId, "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
});
