import { MapCanvasLazy } from "@/components/map/MapCanvasLoader";

// Server Component shell — the interactive canvas itself is a dynamically
// imported Client Component (RULE-frontend.md §Server vs client).
export default function RiskMapPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-800">Risk Map</h1>
      <p className="mt-1 text-sm text-slate-600">Predicted hotspots, ATM density and the risk heatmap across the corpus.</p>
      <div className="mt-4">
        <MapCanvasLazy />
      </div>
    </div>
  );
}
