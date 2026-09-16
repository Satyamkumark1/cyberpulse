"use client"; // WebGL rendering via maplibre-gl (RULE-frontend.md)

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Map as MaplibreMap,
  NavigationControl,
  setWorkerUrl,
  type GeoJSONSource,
  type MapLayerMouseEvent,
  type StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { StatePanel } from "@/components/common/StatePanel";
import { HotspotDrawer } from "./HotspotDrawer";
import { MapAccessibleTable } from "./MapAccessibleTable";
import type { AtmListItem, HotspotListItem } from "./types";

// MapLibre's own worker-URL auto-detection reads `import.meta.url` and
// expects it to be a fetchable https: URL — inside a Next.js/webpack bundle
// it isn't, so the worker silently loads the wrong (HTML) document as its
// script and never responds. `public/maplibre-gl-worker.mjs` (+ its
// `maplibre-gl-shared.mjs` dependency) is a copy of the package's own
// dist/ files — keep both in sync if `maplibre-gl` is upgraded.
setWorkerUrl("/maplibre-gl-worker.mjs");

// ADR-006: MapLibre GL JS, dynamically imported (components/map/MapCanvasLoader.tsx).
const MAP_TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL as string;
const INDIA_CENTER: [number, number] = [78.9, 22.6];
const INDIA_ZOOM = 3.6;
const DEFAULT_HEIGHT_PX = 560;

// packages/config/tailwind.preset.js §risk — mirrored here because MapLibre
// paint properties take literal colour strings, not Tailwind classes. A
// palette change there should be reflected here too.
const RISK_COLORS = { HIGH: "#C0392B", MEDIUM: "#C97A0E", LOW: "#1F7A47" } as const;

// AC-P4-11: the bundled outline fallback — no network fetch, so it always
// paints even when the tile provider is unreachable. A bounding-box
// approximation of India, not a surveyed border; good enough for "we're
// still oriented" while the real tiles are unavailable.
const FALLBACK_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    "india-outline": {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [68.0, 6.0],
              [97.5, 6.0],
              [97.5, 37.5],
              [68.0, 37.5],
              [68.0, 6.0],
            ],
          ],
        },
      },
    },
  },
  layers: [
    { id: "bg", type: "background", paint: { "background-color": "#eef2f7" } },
    { id: "india-outline-fill", type: "fill", source: "india-outline", paint: { "fill-color": "#dce3ec" } },
    { id: "india-outline-line", type: "line", source: "india-outline", paint: { "line-color": "#94a3b4", "line-width": 1 } },
  ],
};

// A minimal local GeoJSON shape rather than the `geojson` package — the only
// two source types this map ever builds, both point features.
interface PointFeatureCollection<P> {
  type: "FeatureCollection";
  features: { type: "Feature"; geometry: { type: "Point"; coordinates: [number, number] }; properties: P }[];
}

async function fetchHotspots(): Promise<HotspotListItem[]> {
  const res = await fetch("/api/hotspots?limit=100");
  if (!res.ok) throw new Error("Failed to load hotspots");
  const body = (await res.json()) as { data: HotspotListItem[] };
  return body.data;
}

async function fetchAtms(bbox: string): Promise<AtmListItem[]> {
  const res = await fetch(`/api/atms?bbox=${bbox}&limit=2000`);
  if (!res.ok) throw new Error("Failed to load ATMs");
  const body = (await res.json()) as { data: AtmListItem[] };
  return body.data;
}

function hotspotsToGeoJson(
  hotspots: HotspotListItem[],
): PointFeatureCollection<{ h3Index: string; name: string; riskScore: number; riskLevel: string; rank: number }> {
  return {
    type: "FeatureCollection",
    features: hotspots.map((h, i) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [h.longitude, h.latitude] },
      properties: { h3Index: h.h3Index, name: h.name, riskScore: h.riskScore, riskLevel: h.riskLevel, rank: i + 1 },
    })),
  };
}

function atmsToGeoJson(atms: AtmListItem[]): PointFeatureCollection<{ atmId: string; bankName: string }> {
  return {
    type: "FeatureCollection",
    features: atms.map((a) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [a.longitude, a.latitude] },
      properties: { atmId: a.atmId, bankName: a.bankName },
    })),
  };
}

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export interface MapCanvasProps {
  heightPx?: number;
}

export function MapCanvas({ heightPx = DEFAULT_HEIGHT_PX }: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MaplibreMap | null>(null);
  const [webgl] = useState(() => (typeof window !== "undefined" ? webglAvailable() : true));
  const [mapReady, setMapReady] = useState(false);
  const [tileFallback, setTileFallback] = useState(false);
  // Bumped only at the one call site that replaces the whole style
  // (the on-error fallback swap) — `setStyle` discards every previously
  // added source/layer, so the hotspot/ATM effects below re-run and
  // re-add theirs whenever this changes.
  const [styleVersion, setStyleVersion] = useState(0);
  const [layers, setLayers] = useState({ heatmap: true, hotspots: true, atms: false });
  const [selectedH3, setSelectedH3] = useState<string | null>(null);
  const [showTable, setShowTable] = useState(false);
  const [bbox, setBbox] = useState<string | null>(null);

  const hotspotsQuery = useQuery({ queryKey: ["hotspots"], queryFn: fetchHotspots, enabled: webgl });
  const atmsQuery = useQuery({
    queryKey: ["atms", bbox],
    queryFn: () => fetchAtms(bbox!),
    enabled: webgl && layers.atms && bbox !== null,
  });

  // Mount the map once, against the real tile style. A failure there swaps
  // in the bundled outline (no network fetch) as the basemap instead of a
  // blank canvas (AC-P4-11).
  //
  // Creation is deferred a frame and cancellable: React 19 StrictMode's dev
  // double-invoke (setup → cleanup → setup) tears a freshly-constructed
  // MapLibre instance down before its async init (shared worker actor
  // registration) completes, which stalls the second, surviving instance's
  // own 'load' forever — not just a dev-mode cosmetic issue, a genuinely
  // wedged map. Deferring past the phantom cleanup means only the real
  // mount ever constructs a `Map`.
  useEffect(() => {
    if (!webgl || !containerRef.current) return;
    let cancelled = false;
    const raf = requestAnimationFrame(() => {
      if (cancelled || !containerRef.current) return;
      // Constructed directly with the real tile style — not the bundled
      // outline swapped in afterwards. `setStyle()` replaces the *entire*
      // style, including any sources the hotspot/ATM effects below have
      // already added; racing a post-construction swap against those
      // effects intermittently wiped them (addSource → setStyle → source
      // gone, depending on exactly when 'styledata' happened to fire). One
      // style for the whole happy path removes that race; the bundled
      // outline is reserved for the one real swap, on failure (AC-P4-11).
      const map = new MaplibreMap({
        container: containerRef.current,
        style: MAP_TILE_URL,
        center: INDIA_CENTER,
        zoom: INDIA_ZOOM,
      });
      map.addControl(new NavigationControl(), "top-right");
      map.on("error", () => {
        setTileFallback(true);
        map.setStyle(FALLBACK_STYLE);
        setStyleVersion((v) => v + 1);
      });
      map.on("styledata", () => {
        setMapReady(true);
      });
      mapRef.current = map;
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [webgl]);

  // Hotspot layers: heatmap (KDE-style GPU rendering from the ranked point
  // set) + ranked circle markers with numeral labels.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !hotspotsQuery.data) return;

    const data = hotspotsToGeoJson(hotspotsQuery.data);
    const source = map.getSource<GeoJSONSource>("hotspots");
    if (source) {
      source.setData(data);
    } else {
      map.addSource("hotspots", { type: "geojson", data });
      map.addLayer({
        id: "hotspots-heat",
        type: "heatmap",
        source: "hotspots",
        paint: { "heatmap-weight": ["get", "riskScore"], "heatmap-radius": 30, "heatmap-opacity": 0.6 },
      });
      map.addLayer({
        id: "hotspots-circle",
        type: "circle",
        source: "hotspots",
        paint: {
          "circle-radius": 9,
          "circle-color": ["match", ["get", "riskLevel"], "HIGH", RISK_COLORS.HIGH, "MEDIUM", RISK_COLORS.MEDIUM, RISK_COLORS.LOW],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });
      map.addLayer({
        id: "hotspots-label",
        type: "symbol",
        source: "hotspots",
        layout: { "text-field": ["get", "rank"], "text-size": 11 },
        paint: { "text-color": "#ffffff" },
      });
      map.on("click", "hotspots-circle", (e: MapLayerMouseEvent) => {
        const h3Index = e.features?.[0]?.properties?.h3Index as string | undefined;
        if (h3Index) setSelectedH3(h3Index);
      });
      map.on("mouseenter", "hotspots-circle", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "hotspots-circle", () => {
        map.getCanvas().style.cursor = "";
      });
    }
  }, [mapReady, hotspotsQuery.data, styleVersion]);

  // Layer visibility toggles (AC-010-02).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    for (const id of ["hotspots-heat"]) {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", layers.heatmap ? "visible" : "none");
    }
    for (const id of ["hotspots-circle", "hotspots-label"]) {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", layers.hotspots ? "visible" : "none");
    }
    if (map.getLayer("atms-circle")) map.setLayoutProperty("atms-circle", "visibility", layers.atms ? "visible" : "none");
  }, [mapReady, layers, styleVersion]);

  // ATM layer: viewport bbox only — AC-P4-13, an unbounded query is impossible.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const updateBbox = () => {
      const b = map.getBounds();
      setBbox(`${b.getWest()},${b.getSouth()},${b.getEast()},${b.getNorth()}`);
    };
    updateBbox();
    map.on("moveend", updateBbox);
    return () => {
      map.off("moveend", updateBbox);
    };
  }, [mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !atmsQuery.data) return;
    const data = atmsToGeoJson(atmsQuery.data);
    const source = map.getSource<GeoJSONSource>("atms");
    if (source) {
      source.setData(data);
    } else {
      map.addSource("atms", { type: "geojson", data, cluster: true, clusterRadius: 40 });
      map.addLayer({
        id: "atms-clusters",
        type: "circle",
        source: "atms",
        filter: ["has", "point_count"],
        paint: { "circle-radius": 14, "circle-color": "#27456F", "circle-opacity": 0.8 },
      });
      map.addLayer({
        id: "atms-cluster-count",
        type: "symbol",
        source: "atms",
        filter: ["has", "point_count"],
        layout: { "text-field": ["get", "point_count_abbreviated"], "text-size": 11 },
        paint: { "text-color": "#ffffff" },
      });
      map.addLayer({
        id: "atms-circle",
        type: "circle",
        source: "atms",
        filter: ["!", ["has", "point_count"]],
        paint: { "circle-radius": 4, "circle-color": "#27456F" },
      });
    }
  }, [mapReady, atmsQuery.data, styleVersion]);

  if (!webgl) {
    return (
      <div className="space-y-3">
        <StatePanel state="degraded" title="Map unavailable" message="WebGL is unavailable in this browser. Showing the accessible table." />
        <HotspotTableSection />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <fieldset className="flex flex-wrap items-center gap-4">
          <legend className="sr-only">Map layers</legend>
          <LayerToggle label="Risk Heatmap" checked={layers.heatmap} onChange={(v) => setLayers((l) => ({ ...l, heatmap: v }))} />
          <LayerToggle label="Predicted Hotspots" checked={layers.hotspots} onChange={(v) => setLayers((l) => ({ ...l, hotspots: v }))} />
          <LayerToggle label="ATM Locations" checked={layers.atms} onChange={(v) => setLayers((l) => ({ ...l, atms: v }))} />
        </fieldset>
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          className="rounded-sm border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sih-blue-600"
        >
          {showTable ? "Show map" : "Accessible table"}
        </button>
      </div>

      {tileFallback ? (
        <p role="status" className="text-xs text-amber-700">
          Tile provider unavailable — showing a bundled outline. Hotspot and ATM data still display.
        </p>
      ) : null}

      {showTable ? (
        <HotspotTableSection />
      ) : (
        <div style={{ height: heightPx }} className="relative rounded-sm border border-slate-200" ref={containerRef} />
      )}

      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-700">
        <span className="font-semibold uppercase tracking-wide text-slate-500">Legend</span>
        <LegendSwatch className="bg-risk-high" label="High" />
        <LegendSwatch className="bg-risk-medium" label="Medium" />
        <LegendSwatch className="bg-risk-low" label="Low" />
      </div>

      {selectedH3 ? <HotspotDrawer h3Index={selectedH3} onClose={() => setSelectedH3(null)} /> : null}
    </div>
  );

  function HotspotTableSection() {
    if (hotspotsQuery.isLoading) return <StatePanel state="loading" title="Loading hotspots" message="Fetching ranked locations." />;
    if (hotspotsQuery.isError) return <StatePanel state="error" onRetry={() => hotspotsQuery.refetch()} />;
    if (!hotspotsQuery.data || hotspotsQuery.data.length === 0) return <StatePanel state="empty" message="No hotspots match the current view." />;
    return <MapAccessibleTable hotspots={hotspotsQuery.data} />;
  }
}

function LayerToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded-sm border-slate-400 text-sih-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sih-blue-600"
      />
      {label}
    </label>
  );
}

function LegendSwatch({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span aria-hidden="true" className={`h-3 w-3 rounded-full ${className}`} />
      {label}
    </span>
  );
}
