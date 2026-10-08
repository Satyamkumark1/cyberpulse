// RULE-frontend.md §Formatting. Formatting only — never a place to
// recompute a displayed figure; every value here comes from the response.

// Indian digit grouping (e.g. ₹12,45,000), no decimals, from integer paise.
export function formatPaise(paise: number): string {
  const rupees = Math.round(paise / 100);
  return `₹${rupees.toLocaleString("en-IN")}`;
}

// One decimal percentage for the UI (e.g. 62.3%); metrics panels format the
// underlying 0-1 fraction separately.
export function formatScorePercent(score: number): string {
  return `${(score * 100).toFixed(1)}%`;
}

const IST_TIMEZONE = "Asia/Kolkata";

// e.g. "05 Oct 2026, 11:05 IST"
export function formatTimestampIst(iso: string): string {
  const formatted = new Date(iso).toLocaleString("en-GB", {
    timeZone: IST_TIMEZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${formatted.replace(",", "")} IST`;
}

// e.g. "11:00 – 13:00 IST"
export function formatWindowIst(startIso: string, endIso: string): string {
  const options = { timeZone: IST_TIMEZONE, hour: "2-digit", minute: "2-digit", hour12: false } as const;
  const timeOnly = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", options);
  const start = new Date(startIso);
  const end = new Date(endIso);
  const sameDay = start.toLocaleDateString("en-CA", { timeZone: IST_TIMEZONE }) === end.toLocaleDateString("en-CA", { timeZone: IST_TIMEZONE });
  if (sameDay) return `${timeOnly(startIso)} – ${timeOnly(endIso)} IST`;
  const dateOnly = (date: Date) => date.toLocaleDateString("en-GB", { timeZone: IST_TIMEZONE, day: "2-digit", month: "short" });
  return `${dateOnly(start)} ${timeOnly(startIso)} – ${dateOnly(end)} ${timeOnly(endIso)} IST`;
}

// e.g. "180 m" below 1 km, "1.4 km" at or above it.
export function formatDistanceMeters(meters: number): string {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}
