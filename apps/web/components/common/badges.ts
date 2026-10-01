// Tailwind classes for the status-style pills on the alert and investigation
// pages. These always sit next to their text label (RULE-frontend.md #2);
// risk itself goes through RiskBadge, which adds the icon.
export const BADGE_FALLBACK = "bg-slate-100 text-slate-600";

export const SEVERITY_CLASS: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-700",
  HIGH: "bg-orange-100 text-orange-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  LOW: "bg-slate-100 text-slate-600",
};

export const ALERT_STATUS_CLASS: Record<string, string> = {
  SENT: "bg-blue-100 text-blue-700",
  ACKNOWLEDGED: "bg-green-100 text-green-700",
};

export const INVESTIGATION_STATUS_CLASS: Record<string, string> = {
  NEW: "bg-slate-100 text-slate-600",
  ANALYZING: "bg-blue-100 text-blue-700",
  UNDER_REVIEW: "bg-purple-100 text-purple-700",
  ALERT_SENT: "bg-orange-100 text-orange-700",
  RESOLVED: "bg-green-100 text-green-700",
  MONITORING: "bg-cyan-100 text-cyan-700",
};

export const PRIORITY_CLASS: Record<string, string> = {
  HIGH: "text-orange-600 font-semibold",
  MEDIUM: "text-yellow-700",
  LOW: "text-slate-500",
};
