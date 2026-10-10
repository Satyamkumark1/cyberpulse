import { RECIPIENT_LABELS, type RecipientKind } from "@cyberpulse/shared/enums";
import Link from "next/link";
import { FactorBar } from "@/components/common/FactorBar";
import { notFound } from "next/navigation";
import { randomUUID } from "node:crypto";
import { formatTimestampIst, formatWindowIst, formatPaise, formatRiskScore } from "@/lib/formatters";
import { resolveRoleFromNextHeaders } from "@/services/lib/auth";
import { get } from "@/services/alertService";
import { AcknowledgeAlertButton } from "@/components/alerts/AcknowledgeAlertButton";
import { BADGE_FALLBACK, SEVERITY_CLASS } from "@/components/common/badges";

export const metadata = { title: "Alert Detail — CyberPulse AI" };

export default async function AlertDetailPage({
  params,
}: {
  params: Promise<{ alertId: string }>;
}) {
  const { alertId } = await params;
  const role = await resolveRoleFromNextHeaders();
  const requestId = `req_${randomUUID()}`;

  let alert: Awaited<ReturnType<typeof get>>;
  try {
    alert = await get(alertId, { role, requestId, origin: "USER" });
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/alerts" className="text-sm text-sih-blue-600 hover:underline">
              ← Alerts
            </Link>
          </div>
          <h1 className="mt-2 font-mono text-xl font-semibold text-slate-800">{alert.alertId}</h1>
          <p className="mt-1 text-sm text-slate-500">{alert.locationName}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`rounded px-2 py-1 text-sm font-medium ${SEVERITY_CLASS[alert.severity] ?? BADGE_FALLBACK}`}>
            {alert.severity}
          </span>
          {alert.status === "SENT" && (
            <AcknowledgeAlertButton alertId={alertId} />
          )}
          {alert.status === "ACKNOWLEDGED" && (
            <span className="rounded bg-green-100 px-2 py-1 text-sm font-medium text-green-700">
              Acknowledged
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Core details */}
        <div className="lg:col-span-2 space-y-4">
          <section className="rounded-sm border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-800">Alert details</h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-slate-500">Status</dt>
              <dd className="font-medium text-slate-800">{alert.status}</dd>
              <dt className="text-slate-500">Dispatched</dt>
              <dd className="text-slate-800">{formatTimestampIst(alert.createdAt)}</dd>
              <dt className="text-slate-500">Window</dt>
              <dd className="text-slate-800">{formatWindowIst(alert.windowStart, alert.windowEnd)}</dd>
              <dt className="text-slate-500">Estimated exposure</dt>
              <dd className="font-medium text-slate-800">
                {alert.exposurePaise !== null && alert.exposurePaise !== undefined
                  ? formatPaise(Number(alert.exposurePaise))
                  : "—"}
              </dd>
              <dt className="text-slate-500">Recipients</dt>
              <dd className="text-slate-800">
                <ul className="space-y-1">
                  {alert.recipients.map((kind) => (
                    <li key={kind}>
                      <span className="block">{RECIPIENT_LABELS[kind as RecipientKind]?.label ?? kind}</span>
                      <span className="block text-xs text-slate-500">
                        {RECIPIENT_LABELS[kind as RecipientKind]?.detail ?? ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </dd>
              <dt className="text-slate-500">Dispatched by</dt>
              <dd className="text-slate-800">{alert.createdByRole}</dd>
              {alert.acknowledgedAt && (
                <>
                  <dt className="text-slate-500">Acknowledged</dt>
                  <dd className="text-slate-800">{formatTimestampIst(alert.acknowledgedAt)}</dd>
                  <dt className="text-slate-500">Acknowledged by</dt>
                  <dd className="text-slate-800">{alert.acknowledgedByRole}</dd>
                </>
              )}
              {alert.notes && (
                <>
                  <dt className="text-slate-500">Notes</dt>
                  <dd className="text-slate-800">{alert.notes}</dd>
                </>
              )}
            </dl>
          </section>

          {/* Prediction */}
          {alert.prediction && (
            <section className="rounded-sm border border-slate-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-semibold text-slate-800">
                Prediction{" "}
                <span className="font-mono font-normal text-slate-500">
                  {alert.prediction.predictionRef}
                </span>
              </h2>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt className="text-slate-500">Risk score</dt>
                <dd className="font-medium text-slate-800">{formatRiskScore(Number(alert.prediction.riskScore))}</dd>
                <dt className="text-slate-500">Level</dt>
                <dd className="text-slate-800">{alert.prediction.riskLevel}</dd>
                <dt className="text-slate-500">Confidence</dt>
                <dd className="text-slate-800">{alert.prediction.confidence}</dd>
              </dl>

              {alert.prediction.factors.length > 0 && (
                <div className="mt-4">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Top risk factors
                  </h3>
                  <ul>
                    {alert.prediction.factors.map((f) => (
                      <FactorBar key={f.name} name={f.name} contribution={f.contribution} direction={f.direction} />
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          {alert.investigationCaseId && (
            <section className="rounded-sm border border-slate-200 bg-white p-4">
              <h2 className="mb-2 text-sm font-semibold text-slate-800">Linked investigation</h2>
              <Link
                href={`/investigations/${alert.investigationCaseId}`}
                className="font-mono text-sm font-medium text-sih-blue-600 hover:underline"
              >
                {alert.investigationCaseId}
              </Link>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
