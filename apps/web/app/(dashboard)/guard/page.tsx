import { randomUUID } from "node:crypto";
import { RiskBadge } from "@/components/common/RiskBadge";
import { StatePanel } from "@/components/common/StatePanel";
import { formatScorePercent } from "@/lib/formatters";
import { resolveRoleFromNextHeaders } from "@/services/lib/auth";
import { list as listHotspots } from "@/services/hotspotService";
import { listCoverageForCells, type GuardPostCoverageForCell } from "@/services/guardPostService";

const HOTSPOT_LIMIT = 10;

// GUARD's landing page (ADR-021) — a duty roster, not a map. Deliberately no
// complaint, transaction or fraud-type data reaches this page: it composes
// only hotspotService.list (positional cell data) and guardPostService's
// coverage query (positional post data), neither of which touch a complaint.
// A post is a position, never a person (DEC-010) — nothing here identifies
// who is on shift, only which post and when.
export default async function GuardPage() {
  const role = await resolveRoleFromNextHeaders();
  const requestId = `req_${randomUUID()}`;
  const ctx = { role, requestId, origin: "USER" as const };

  let hotspots: Awaited<ReturnType<typeof listHotspots>>["data"] = [];
  let coverage: GuardPostCoverageForCell[] = [];
  let failed = false;
  try {
    const result = await listHotspots({ limit: HOTSPOT_LIMIT }, ctx);
    hotspots = result.data;
    coverage = await listCoverageForCells(hotspots.map((h) => h.h3Index), ctx);
  } catch {
    failed = true;
  }

  const postsByCell = new Map<string, GuardPostCoverageForCell[]>();
  for (const post of coverage) {
    postsByCell.set(post.h3Index, [...(postsByCell.get(post.h3Index) ?? []), post]);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Duty Coverage</h1>
        <p className="mt-1 text-sm text-slate-600">
          Staffed duty posts at ATMs inside the currently predicted hotspot cells.
        </p>
      </div>

      {failed ? (
        <StatePanel state="error" />
      ) : hotspots.length === 0 ? (
        <StatePanel state="empty" message="No hotspots have been predicted yet." />
      ) : (
        <div className="space-y-4">
          {hotspots.map((h) => {
            const posts = postsByCell.get(h.h3Index) ?? [];
            return (
              <section key={h.h3Index} className="rounded-sm border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-800">{h.name}</p>
                    <p className="text-xs text-slate-500">
                      {h.district}, {h.state}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <RiskBadge level={h.riskLevel} />
                    <span className="text-xs text-slate-500">{formatScorePercent(h.riskScore)}</span>
                  </div>
                </div>

                <div className="mt-3">
                  {posts.length === 0 ? (
                    <p className="text-xs text-slate-500">No staffed post at this cell.</p>
                  ) : (
                    <table className="w-full text-xs text-slate-700">
                      <thead>
                        <tr className="text-left text-slate-500">
                          <th className="py-1 pr-3 font-medium">Post</th>
                          <th className="py-1 pr-3 font-medium">ATM · Bank</th>
                          <th className="py-1 font-medium">Shift (IST)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {posts.map((post) => (
                          <tr key={post.postId} className="border-t border-slate-100">
                            <td className="py-1.5 pr-3 font-mono">{post.postId}</td>
                            <td className="py-1.5 pr-3">
                              {post.atmId} · {post.bankName}
                            </td>
                            <td className="py-1.5">
                              {String(post.shiftStartHourIst).padStart(2, "0")}:00 – {String(post.shiftEndHourIst).padStart(2, "0")}:00
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
