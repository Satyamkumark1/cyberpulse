import Link from "next/link";
import { FactorBar } from "@/components/common/FactorBar";
import { notFound } from "next/navigation";
import { randomUUID } from "node:crypto";
import { formatTimestampIst, formatPaise, formatScorePercent } from "@/lib/formatters";
import { hasCapability, resolveRoleFromNextHeaders } from "@/services/lib/auth";
import { get } from "@/services/investigationService";
import { InvestigationActionPanel } from "@/components/investigations/InvestigationActionPanel";
import { MoneyTrailGraphLazy } from "@/components/graph/MoneyTrailGraphLoader";

export const metadata = { title: "Investigation — CyberPulse AI" };

const STATUS_CLASS: Record<string, string> = {
  NEW: "bg-slate-100 text-slate-600",
  ANALYZING: "bg-blue-100 text-blue-700",
  UNDER_REVIEW: "bg-purple-100 text-purple-700",
  ALERT_SENT: "bg-orange-100 text-orange-700",
  RESOLVED: "bg-green-100 text-green-700",
  MONITORING: "bg-cyan-100 text-cyan-700",
};

const PRIORITY_CLASS: Record<string, string> = {
  HIGH: "text-orange-600",
  MEDIUM: "text-yellow-700",
  LOW: "text-slate-500",
};

export default async function InvestigationDetailPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  const role = await resolveRoleFromNextHeaders();
  const requestId = `req_${randomUUID()}`;

  let detail: Awaited<ReturnType<typeof get>>;
  try {
    detail = await get(caseId, { role, requestId, origin: "USER" });
  } catch {
    notFound();
  }

  const { investigation: inv, complaint, latestPrediction, alerts, notes, auditEvents } = detail;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/investigations" className="text-sm text-sih-blue-600 hover:underline">
            ← Investigations
          </Link>
          <h1 className="mt-2 font-mono text-xl font-semibold text-slate-800">{inv.caseId}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[inv.status] ?? "bg-slate-100 text-slate-600"}`}>
              {inv.status.replace(/_/g, " ")}
            </span>
            <span className={`text-xs font-medium ${PRIORITY_CLASS[inv.priority] ?? "text-slate-600"}`}>
              {inv.priority} priority
            </span>
            <span className="text-xs text-slate-500">Assigned to {inv.assignedRole}</span>
          </div>
        </div>

        {/* Status transition panel (client component) */}
        <InvestigationActionPanel
          caseId={caseId}
          currentStatus={inv.status}
          currentUpdatedAt={inv.updatedAt}
          canTransition={hasCapability(role, "investigations:transition")}
          canNote={hasCapability(role, "investigations:addNote")}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Complaint */}
          {complaint && (
            <>
              <section className="rounded-sm border border-slate-200 bg-white p-4">
                <h2 className="mb-3 text-sm font-semibold text-slate-800">Complaint</h2>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <dt className="text-slate-500">ID</dt>
                  <dd className="font-mono text-slate-800">{complaint.complaintId}</dd>
                  <dt className="text-slate-500">Filed</dt>
                  <dd className="text-slate-800">{formatTimestampIst(complaint.createdAt)}</dd>
                  {complaint.amountPaise !== null && complaint.amountPaise !== undefined && (
                    <>
                      <dt className="text-slate-500">Reported loss</dt>
                      <dd className="font-medium text-slate-800">{formatPaise(Number(complaint.amountPaise))}</dd>
                    </>
                  )}
                </dl>
              </section>

              <section className="rounded-sm border border-slate-200 bg-white p-4" aria-labelledby="money-trail-heading">
                <h2 id="money-trail-heading" className="mb-3 text-sm font-semibold text-slate-800">Money trail</h2>
                <MoneyTrailGraphLazy complaintId={complaint.complaintId} />
              </section>
            </>
          )}

          {/* Latest prediction */}
          {latestPrediction && (
            <section className="rounded-sm border border-slate-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-semibold text-slate-800">
                Latest prediction{" "}
                <span className="font-mono font-normal text-slate-500 text-xs">
                  {latestPrediction.predictionRef}
                </span>
              </h2>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt className="text-slate-500">Risk score</dt>
                <dd className="font-medium text-slate-800">{formatScorePercent(Number(latestPrediction.riskScore))}</dd>
                <dt className="text-slate-500">Level</dt>
                <dd className="text-slate-800">{latestPrediction.riskLevel}</dd>
                <dt className="text-slate-500">Confidence</dt>
                <dd className="text-slate-800">{latestPrediction.confidence}</dd>
                {latestPrediction.hotspot && (
                  <>
                    <dt className="text-slate-500">Hotspot</dt>
                    <dd className="text-slate-800">
                      {latestPrediction.hotspot.name}, {latestPrediction.hotspot.district}
                    </dd>
                  </>
                )}
              </dl>
              {latestPrediction.factors.length > 0 && (
                <div className="mt-4">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Risk factors
                  </h3>
                  <ul>
                    {latestPrediction.factors.map((f) => (
                      <FactorBar key={f.name} name={f.name} contribution={f.contribution} direction={f.direction} />
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {/* Linked alerts */}
          {alerts.length > 0 && (
            <section className="rounded-sm border border-slate-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-semibold text-slate-800">
                Alerts ({alerts.length})
              </h2>
              <ul className="space-y-2">
                {alerts.map((a) => (
                  <li key={a.alertId} className="flex items-center justify-between rounded-sm bg-slate-50 px-3 py-2 text-sm">
                    <div>
                      <Link
                        href={`/alerts/${a.alertId}`}
                        className="font-mono text-xs font-medium text-sih-blue-600 hover:underline"
                      >
                        {a.alertId}
                      </Link>
                      <span className="ml-2 text-xs text-slate-500">{a.locationName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">
                        {a.exposurePaise !== null && a.exposurePaise !== undefined
                          ? formatPaise(Number(a.exposurePaise))
                          : ""}
                      </span>
                      <span className="text-xs text-slate-400">{formatTimestampIst(a.createdAt)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Notes */}
          <section className="rounded-sm border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-800">
                Notes {notes.length > 0 && <span className="text-slate-400 font-normal">({notes.length})</span>}
              </h2>
            </div>

            {notes.length === 0 ? (
              <p className="text-sm text-slate-500">No notes yet.</p>
            ) : (
              <ul className="space-y-3">
                {notes.map((n) => (
                  <li key={n.id} className="rounded-sm bg-slate-50 p-3">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-medium">{n.authorRole}</span>
                      <span>{formatTimestampIst(n.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-800 whitespace-pre-wrap">{n.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Sidebar */}
        <aside>
          <section className="rounded-sm border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-800">Timeline</h2>
            <ol className="space-y-3 text-sm">
              <li>
                <p className="text-slate-800">Case opened</p>
                <p className="text-xs text-slate-500">{formatTimestampIst(inv.createdAt)} · {inv.origin}</p>
              </li>
              {auditEvents.map((event) => (
                <li key={event.id} className="border-t border-slate-100 pt-3">
                  <p className="text-slate-800">{event.action.replaceAll("_", " ")}</p>
                  <p className="text-xs text-slate-500">
                    {formatTimestampIst(event.occurredAt)} · {event.actorRole}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
}
