// ux/design-system.md §5.3: name, percentage (mono), horizontal bar, direction
// as text — never colour/icon alone (RULE-frontend.md non-negotiable #2).
// Bars for a REDUCES contribution render from the right.
export function FactorBar({
  name,
  contribution,
  direction,
}: {
  name: string;
  contribution: number;
  direction: "INCREASES" | "REDUCES";
}) {
  const magnitude = Math.min(100, Math.abs(contribution));
  const increases = direction === "INCREASES";
  const colorClass = increases ? "text-risk-high" : "text-risk-low";

  return (
    <li className="py-1.5">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-slate-700">{name}</span>
        <span className={`font-mono text-xs font-medium ${colorClass}`}>
          {increases ? "▲" : "▼"} {increases ? "increases risk" : "reduces risk"} {contribution.toFixed(1)}%
        </span>
      </div>
      <div className="mt-1 flex h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${increases ? "" : "ml-auto"} ${increases ? "bg-risk-high" : "bg-risk-low"}`}
          style={{ width: `${magnitude}%` }}
        />
      </div>
    </li>
  );
}
