import type { RiskLevel } from "@cyberpulse/shared/enums";

// RULE-frontend.md non-negotiable #2: colour AND text AND icon — never
// colour alone. `level`, not `color` — the prop shape is what makes this
// structural rather than a convention someone can forget.
export interface RiskBadgeProps {
  level: RiskLevel | "NONE";
}

const STYLES: Record<RiskBadgeProps["level"], { classes: string; icon: string; label: string }> = {
  HIGH: { classes: "bg-red-100 text-red-800", icon: "▲", label: "High" },
  MEDIUM: { classes: "bg-amber-100 text-amber-800", icon: "●", label: "Medium" },
  LOW: { classes: "bg-emerald-100 text-emerald-800", icon: "▼", label: "Low" },
  NONE: { classes: "bg-slate-100 text-slate-600", icon: "—", label: "Not analysed" },
};

export function RiskBadge({ level }: RiskBadgeProps) {
  const style = STYLES[level];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-sm px-2 py-1 text-xs font-semibold ${style.classes}`}
    >
      <span aria-hidden="true">{style.icon}</span>
      {style.label}
    </span>
  );
}
