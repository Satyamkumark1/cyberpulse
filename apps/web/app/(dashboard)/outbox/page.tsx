import { randomUUID } from "node:crypto";
import { RECIPIENT_LABELS } from "@cyberpulse/shared/enums";
import { StatePanel } from "@/components/common/StatePanel";
import { formatTimestampIst } from "@/lib/formatters";
import { resolveRoleFromNextHeaders } from "@/services/lib/auth";
import { list } from "@/services/notificationService";

// DEC-020. Every webhook the prototype would send, exactly as it would be
// sent. Nothing here left the app: partner endpoints are not configured, so
// each message is recorded with status SIMULATED.
export default async function OutboxPage() {
  const role = await resolveRoleFromNextHeaders();
  let result: Awaited<ReturnType<typeof list>> | null = null;
  try {
    result = await list({ channel: "WEBHOOK", limit: 50 }, { role, requestId: `req_${randomUUID()}`, origin: "USER" });
  } catch {
    result = null;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Outbox</h1>
        <p className="mt-1 text-sm text-slate-600">
          Partner webhooks for law enforcement, banks and I4C, newest first. Simulated: this prototype records each message
          exactly as it would be sent and sends nothing.
        </p>
      </div>

      {result === null ? (
        <StatePanel state="error" title="Outbox unavailable" message="This role cannot view notifications, or they could not be loaded. Retry." />
      ) : result.data.length === 0 ? (
        <StatePanel state="empty" title="No messages yet" message="Messages appear when an alert is queued or a forecast is HIGH risk." />
      ) : (
        <ol className="space-y-3">
          {result.data.map((n) => (
            <li key={n.notificationId} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span className="font-mono font-medium text-slate-800">{n.notificationId}</span>
                <span className="font-mono text-slate-700">{n.payload.event}</span>
                <span className="text-slate-700">To: {RECIPIENT_LABELS[n.recipient].label}</span>
                <span className="text-slate-500">{formatTimestampIst(n.createdAt)}</span>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">Simulated, not sent</span>
              </div>
              <pre className="mt-3 overflow-x-auto rounded bg-slate-50 p-3 font-mono text-xs text-slate-700">
                {`POST <partner endpoint for ${n.recipient}>\ncontent-type: application/json\n\n${JSON.stringify(n.payload, null, 2)}`}
              </pre>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
