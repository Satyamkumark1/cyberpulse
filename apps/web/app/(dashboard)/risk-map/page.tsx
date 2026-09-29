import { MapCanvasLazy } from "@/components/map/MapCanvasLoader";

// Server Component shell — the interactive canvas itself is a dynamically
// imported Client Component (RULE-frontend.md §Server vs client).
export default function RiskMapPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-teal-600">Geographic intelligence</p>
          <h1 className="text-2xl font-semibold tracking-tight text-navy-900">Risk Map</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Explore predicted areas, inspect nearby ATMs, and find locations by locality or PIN code.</p>
        </div>
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600">Street detail · India</span>
      </div>
      <div>
        <MapCanvasLazy />
      </div>
    </div>
  );
}
