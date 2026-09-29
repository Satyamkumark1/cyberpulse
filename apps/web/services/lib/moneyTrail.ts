export type TrailView = "complaint" | "related";
export type TrailAssociation = "COMPLAINT" | "RELATED";
export interface TrailTransfer {
  fromAccountId: number; toAccountId: number; amountPaise: number; timestamp: string; hopIndex: number;
}
export interface TrailWithdrawal { accountId: number; amountPaise: number; timestamp: string }
export interface TrailSummary {
  reportedLossPaise: number;
  entryTransferPaise: number;
  linkedWithdrawalPaise: number;
  notShownWithdrawnPaise: number | null;
  status: "CONSISTENT" | "INCOMPLETE" | "INCONSISTENT";
  issues: string[];
}

/** Reconcile only case-linked records, in time order. Repeated hops are never
 * added to the loss; shared accounts never establish victim-fund attribution. */
export function reconcileComplaint(reportedLossPaise: number, transfers: TrailTransfer[], withdrawals: TrailWithdrawal[], recordsLimited = false): TrailSummary {
  const entries = transfers.filter((t) => t.hopIndex === 0);
  const entryTransferPaise = entries.reduce((sum, t) => sum + t.amountPaise, 0);
  const linkedWithdrawalPaise = withdrawals.reduce((sum, w) => sum + w.amountPaise, 0);
  const issues: string[] = [];
  let invalid = false;
  const balances = new Map<number, number>();
  for (const t of entries) balances.set(t.fromAccountId, (balances.get(t.fromAccountId) ?? 0) + t.amountPaise);
  const events = [
    ...transfers.map((t) => ({ ...t, kind: "transfer" as const, order: t.hopIndex })),
    ...withdrawals.map((w) => ({ ...w, kind: "withdrawal" as const, order: Number.MAX_SAFE_INTEGER })),
  ].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp) || a.order - b.order);
  for (const event of events) {
    const accountId = event.kind === "transfer" ? event.fromAccountId : event.accountId;
    const balance = balances.get(accountId) ?? 0;
    if (!Number.isSafeInteger(event.amountPaise) || event.amountPaise <= 0 || event.amountPaise > balance) invalid = true;
    balances.set(accountId, balance - event.amountPaise);
    if (event.kind === "transfer") balances.set(event.toAccountId, (balances.get(event.toAccountId) ?? 0) + event.amountPaise);
  }
  if (entryTransferPaise > reportedLossPaise || linkedWithdrawalPaise > reportedLossPaise) invalid = true;
  if (invalid) issues.push("Linked outflows exceed available complaint-linked funds. Attribution is uncertain; verify the records.");
  if (entryTransferPaise !== reportedLossPaise) issues.push("Entry transfers do not match the reported loss.");
  if (recordsLimited) issues.push("The record limit was reached; reconciliation is incomplete.");
  if (transfers.length === 0) issues.push("No complaint-linked transfers are available.");
  const status = invalid ? "INCONSISTENT" : recordsLimited || issues.length ? "INCOMPLETE" : "CONSISTENT";
  return { reportedLossPaise, entryTransferPaise, linkedWithdrawalPaise,
    notShownWithdrawnPaise: status === "CONSISTENT" ? reportedLossPaise - linkedWithdrawalPaise : null, status, issues };
}
