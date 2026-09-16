import Link from "next/link";
import { randomUUID } from "node:crypto";
import { MapCanvasLazy } from "@/components/map/MapCanvasLoader";
import { RiskBadge } from "@/components/common/RiskBadge";
import { StatePanel } from "@/components/common/StatePanel";
import { formatScorePercent } from "@/lib/formatters";
import { resolveRoleFromNextHeaders } from "@/services/lib/auth";
import { list as listHotspots } from "@/services/hotspotService";

const HOTSPOT_RAIL_LIMIT = 5;

export default async function DashboardPage() {
  const role = await resolveRoleFromNextHeaders();
  const requestId = `req_${randomUUID()}`;

  let hotspots: Awaited<ReturnType<typeof listHotspots>>["data"] = [];
  let failed = false;
  try {
    const result = await listHotspots({ limit: HOTSPOT_RAIL_LIMIT }, { role, requestId, origin: "USER" });
    hotspots = result.data;
  } catch {
    failed = true;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">Live operational picture across the synthetic corpus.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <h2 className="text-base font-semibold text-slate-800">Risk map</h2>
          <div className="mt-2">
            <MapCanvasLazy heightPx={360} />
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-800">Top predicted hotspots</h2>
          <div className="mt-2">
            {failed ? (
              <StatePanel state="error" />
            ) : hotspots.length === 0 ? (
              <StatePanel state="empty" message="No hotspots have been predicted yet." />
            ) : (
              <ul className="space-y-2">
                {hotspots.map((h) => (
                  <li key={h.h3Index} className="flex items-center justify-between gap-2 rounded-sm border border-slate-200 p-2">
                    <div>
                      <Link href={`/risk-map#${h.h3Index}`} className="text-sm font-medium text-sih-blue-600 hover:underline">
                        {h.name}
                      </Link>
                      <p className="text-xs text-slate-500">
                        {h.district}, {h.state}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <RiskBadge level={h.riskLevel} />
                      <span className="text-xs text-slate-500">{formatScorePercent(h.riskScore)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
