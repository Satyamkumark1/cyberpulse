import { RiskBadge } from "@/components/common/RiskBadge";
import { formatRiskScore, formatWindowIst } from "@/lib/formatters";
import type { HotspotListItem } from "./types";

// AC-010-06: the same hotspot data as the layer, as a `<table>`.
export function MapAccessibleTable({ hotspots, onSelect }: { hotspots: HotspotListItem[]; onSelect?: (h3Index: string) => void }) {
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
          <th className="py-2 pr-4">Name</th>
          <th className="py-2 pr-4">State</th>
          <th className="py-2 pr-4">Coordinates</th>
          <th className="py-2 pr-4">Risk level</th>
          <th className="py-2 pr-4">Score</th>
          <th className="py-2 pr-4">Expected window</th>
        </tr>
      </thead>
      <tbody>
        {hotspots.map((h) => (
          <tr key={h.h3Index} className="border-b border-slate-100">
            <td className="py-2 pr-4">{onSelect ? <button onClick={() => onSelect(h.h3Index)} className="text-left font-medium text-sih-blue-600 underline">{h.name}</button> : h.name}</td>
            <td className="py-2 pr-4">{h.state}</td>
            <td className="whitespace-nowrap py-2 pr-4 font-mono text-xs">{h.latitude.toFixed(5)}, {h.longitude.toFixed(5)}</td>
            <td className="py-2 pr-4">
              <RiskBadge level={h.riskLevel} />
            </td>
            <td className="py-2 pr-4">{formatRiskScore(h.riskScore)}</td>
            <td className="py-2 pr-4">{h.expectedStart && h.expectedEnd ? formatWindowIst(h.expectedStart, h.expectedEnd) : "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
