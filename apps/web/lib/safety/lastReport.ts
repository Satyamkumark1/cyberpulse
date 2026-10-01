// The report this citizen filed in this browser tab, so "Track my report" can
// fill it in one click. Session storage only: it is the citizen's own code on
// their own device, gone when the tab closes, and never sent anywhere. Storage
// can be blocked (private mode), so every access is best-effort.

const KEY = "cyberpulse:lastCitizenReport";

export interface LastReport {
  complaintId: string;
  trackingCode: string;
}

export function saveLastReport(report: LastReport): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(report));
  } catch {
    // Storage unavailable: the citizen still has the code on screen.
  }
}

export function loadLastReport(): LastReport | null {
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(KEY) ?? "null");
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as LastReport).complaintId === "string" &&
      typeof (parsed as LastReport).trackingCode === "string"
    ) {
      return { complaintId: (parsed as LastReport).complaintId, trackingCode: (parsed as LastReport).trackingCode };
    }
  } catch {
    // Storage unavailable or malformed: behave as if nothing was saved.
  }
  return null;
}
