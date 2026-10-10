"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Map as MaplibreMap,
  Marker,
  NavigationControl,
  FullscreenControl,
  LngLatBounds,
  setWorkerUrl,
  type StyleSpecification,
} from "maplibre-gl";
import { cellToBoundary, isValidCell } from "h3-js";
import "maplibre-gl/dist/maplibre-gl.css";
import type { PredictionResponse } from "@cyberpulse/shared/zod/prediction";
import { formatRiskScore } from "@/lib/formatters";
import { RISK_COLORS } from "@/components/map/types";

setWorkerUrl("/maplibre-gl-worker.mjs");

const configuredStyle = process.env.NEXT_PUBLIC_MAP_TILE_URL;
const STREET_STYLE =
  !configuredStyle || configuredStyle.includes("demotiles.maplibre.org")
    ? "https://tiles.openfreemap.org/styles/liberty"
    : configuredStyle;

const EMPTY_STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": "#f1f5f9" },
    },
  ],
};

function webglAvailable(): boolean {
  try {
    return Boolean(document.createElement("canvas").getContext("webgl2"));
  } catch {
    return false;
  }
}

export interface HotspotMapProps {
  prediction: PredictionResponse;
  selectedH3?: string | null;
  onSelectHotspot?: (h3Index: string) => void;
  heightPx?: number;
  className?: string;
}

export function HotspotMap({
  prediction,
  selectedH3: controlledSelectedH3,
  onSelectHotspot,
  heightPx = 420,
  className = "",
}: HotspotMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MaplibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const [webgl] = useState(webglAvailable);
  // The map instance whose style has loaded, not a boolean: the map is
  // recreated when the prediction's location changes, and a stale `true`
  // would let effects add sources to the new map before its style loads.
  const [readyMap, setReadyMap] = useState<MaplibreMap | null>(null);
  const styleLoaded = readyMap !== null;
  const [fallback, setFallback] = useState(false);
  const [internalSelectedH3, setInternalSelectedH3] = useState<string | null>(null);
  const [showHexagons, setShowHexagons] = useState(true);

  const activeH3 = controlledSelectedH3 ?? internalSelectedH3 ?? prediction.predictedLocation.h3Index;

  const activeHotspot =
    prediction.rankedHotspots.find((h) => h.h3Index === activeH3) ??
    prediction.rankedHotspots[0];

  const handleSelect = useCallback(
    (h3: string) => {
      setInternalSelectedH3(h3);
      onSelectHotspot?.(h3);
    },
    [onSelectHotspot]
  );

  // Initialize Map
  useEffect(() => {
    if (!webgl || !containerRef.current) return;
    let disposed = false;

    const primaryCenter: [number, number] = [
      prediction.predictedLocation.lon,
      prediction.predictedLocation.lat,
    ];

    const map = new MaplibreMap({
      container: containerRef.current,
      style: STREET_STYLE,
      center: primaryCenter,
      zoom: 13,
      maxZoom: 18,
    });
    mapRef.current = map;

    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new FullscreenControl(), "top-right");

    const fallbackTimer = setTimeout(() => {
      if (!disposed && !map.isStyleLoaded()) {
        setFallback(true);
        map.setStyle(EMPTY_STYLE);
      }
    }, 10_000);

    map.on("style.load", () => {
      clearTimeout(fallbackTimer);
      if (!disposed) {
        setReadyMap(map);
      }
    });

    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(containerRef.current);

    return () => {
      disposed = true;
      clearTimeout(fallbackTimer);
      resizeObserver.disconnect();
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
      setReadyMap(null);
      setFallback(false);
    };
  }, [webgl, prediction.predictedLocation.lat, prediction.predictedLocation.lon]);

  // Fit bounds to all ranked hotspots once style is ready
  const fitAllHotspots = useCallback(() => {
    const map = mapRef.current;
    if (!map || !prediction.rankedHotspots.length) return;

    const firstHotspot = prediction.rankedHotspots[0];
    if (prediction.rankedHotspots.length === 1 && firstHotspot) {
      map.flyTo({
        center: [firstHotspot.lon, firstHotspot.lat],
        zoom: 14,
        duration: 800,
      });
      return;
    }

    const bounds = new LngLatBounds();
    prediction.rankedHotspots.forEach((h) => bounds.extend([h.lon, h.lat]));
    map.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 800 });
  }, [prediction.rankedHotspots]);

  // Initial fit when style loads
  useEffect(() => {
    if (!readyMap || readyMap !== mapRef.current) return;
    fitAllHotspots();
  }, [readyMap, fitAllHotspots]);

  // Render H3 polygon overlay for primary & active cells
  useEffect(() => {
    const map = readyMap;
    if (!map || map !== mapRef.current) return;

    // Remove old layers/sources
    if (map.getLayer("hotspot-h3-active-line")) map.removeLayer("hotspot-h3-active-line");
    if (map.getLayer("hotspot-h3-active-fill")) map.removeLayer("hotspot-h3-active-fill");
    if (map.getLayer("hotspot-h3-all-line")) map.removeLayer("hotspot-h3-all-line");
    if (map.getSource("hotspot-h3-all")) map.removeSource("hotspot-h3-all");
    if (map.getSource("hotspot-h3-active")) map.removeSource("hotspot-h3-active");

    if (!showHexagons) return;

    // Source 1: All ranked hotspots polygons
    const allFeatures = prediction.rankedHotspots
      .filter((h) => isValidCell(h.h3Index))
      .map((h) => ({
        type: "Feature" as const,
        properties: { rank: h.rank, h3Index: h.h3Index, score: h.score },
        geometry: {
          type: "Polygon" as const,
          coordinates: [cellToBoundary(h.h3Index, true)],
        },
      }));

    if (allFeatures.length > 0) {
      map.addSource("hotspot-h3-all", {
        type: "geojson",
        data: { type: "FeatureCollection", features: allFeatures },
      });
      map.addLayer({
        id: "hotspot-h3-all-line",
        type: "line",
        source: "hotspot-h3-all",
        paint: {
          "line-color": "#64748b",
          "line-width": 1.5,
          "line-dasharray": [2, 2],
          "line-opacity": 0.6,
        },
      });
    }

    // Source 2: Active / Primary hotspot polygon (emphasized)
    const targetCell = activeH3 && isValidCell(activeH3) ? activeH3 : prediction.predictedLocation.h3Index;
    if (isValidCell(targetCell)) {
      map.addSource("hotspot-h3-active", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Polygon",
            coordinates: [cellToBoundary(targetCell, true)],
          },
        },
      });
      map.addLayer({
        id: "hotspot-h3-active-fill",
        type: "fill",
        source: "hotspot-h3-active",
        paint: {
          "fill-color": RISK_COLORS[prediction.riskLevel],
          "fill-opacity": 0.18,
        },
      });
      map.addLayer({
        id: "hotspot-h3-active-line",
        type: "line",
        source: "hotspot-h3-active",
        paint: {
          "line-color": RISK_COLORS[prediction.riskLevel],
          "line-width": 2.5,
          "line-opacity": 0.9,
        },
      });
    }
  }, [readyMap, prediction.rankedHotspots, prediction.predictedLocation.h3Index, prediction.riskLevel, activeH3, showHexagons]);

  // Render markers for all ranked hotspots
  useEffect(() => {
    const map = readyMap;
    if (!map || map !== mapRef.current) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const newMarkers = prediction.rankedHotspots.map((h) => {
      const isSelected = h.h3Index === activeH3;
      const isRank1 = h.rank === 1;

      const el = document.createElement("button");
      el.type = "button";
      el.className = `map-pin ${isSelected ? "map-pin-selected" : ""}`;

      const pinColor = isRank1
        ? RISK_COLORS[prediction.riskLevel]
        : h.score >= 0.5
        ? "#C0392B"
        : h.score >= 0.3
        ? "#C97A0E"
        : "#1F7A47";

      el.style.setProperty("--pin-color", pinColor);
      el.setAttribute("aria-label", `Hotspot rank ${h.rank}: ${h.name}`);
      el.setAttribute("title", `#${h.rank} ${h.name} (${formatRiskScore(h.score)})`);

      const label = document.createElement("span");
      label.textContent = String(h.rank);
      el.appendChild(label);

      el.addEventListener("click", () => {
        handleSelect(h.h3Index);
        map.flyTo({ center: [h.lon, h.lat], zoom: 14, duration: 600 });
      });

      return new Marker({ element: el, anchor: "bottom" })
        .setLngLat([h.lon, h.lat])
        .addTo(map);
    });

    markersRef.current = newMarkers;

    return () => {
      newMarkers.forEach((m) => m.remove());
    };
  }, [readyMap, prediction.rankedHotspots, prediction.riskLevel, activeH3, handleSelect]);

  // Center on active hotspot when selection changes externally
  const flyToActive = useCallback(() => {
    const map = mapRef.current;
    if (!map || !activeHotspot) return;
    map.flyTo({
      center: [activeHotspot.lon, activeHotspot.lat],
      zoom: 14,
      duration: 600,
    });
  }, [activeHotspot]);

  if (!webgl) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600">
        <p className="font-semibold text-slate-800">WebGL Map Unavailable</p>
        <p className="mt-1 text-xs">
          Interactive map requires WebGL. See ranked hotspots list for geographic coordinates.
        </p>
      </div>
    );
  }

  return (
    <div className={`relative flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/80 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-slate-700">Cash-Out Hotspot Map</span>
          <span className="hidden sm:inline-block rounded bg-slate-200/70 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
            H3 Res 8
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={fitAllHotspots}
            className="rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            title="Fit all predicted hotspots"
          >
            Fit All ({prediction.rankedHotspots.length})
          </button>
          <button
            type="button"
            onClick={flyToActive}
            className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700 transition hover:bg-blue-100"
            title="Center on active hotspot"
          >
            Target #{activeHotspot?.rank ?? 1}
          </button>
          <button
            type="button"
            onClick={() => setShowHexagons((v) => !v)}
            aria-pressed={showHexagons}
            className={`rounded border px-2 py-1 text-[11px] font-medium transition ${
              showHexagons
                ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
            }`}
            title="Toggle H3 hexagon boundaries"
          >
            {showHexagons ? "Hexagons On" : "Hexagons Off"}
          </button>
        </div>
      </div>

      {fallback && (
        <div className="bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
          Street tiles offline. Hotspot coordinates and H3 boundary overlays are active.
        </div>
      )}

      {/* ── Map Canvas Container ── */}
      <div className="relative w-full" style={{ height: heightPx }}>
        <div ref={containerRef} className="h-full w-full bg-slate-100" />

        {/* Loading overlay */}
        {!styleLoaded && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-50/80 backdrop-blur-sm">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm">
              <svg className="h-4 w-4 animate-spin text-blue-600" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Rendering hotspot map…
            </div>
          </div>
        )}

        {/* Floating Active Hotspot Card */}
        {activeHotspot && styleLoaded && (
          <div className="pointer-events-auto absolute bottom-3 left-3 right-3 max-w-sm rounded-lg border border-slate-200/90 bg-white/95 p-3 shadow-lg backdrop-blur-sm transition-all sm:right-auto">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-700 font-mono text-[10px] font-bold text-white">
                    {activeHotspot.rank}
                  </span>
                  <p className="text-xs font-semibold text-slate-900">{activeHotspot.name}</p>
                </div>
                <p className="mt-1 font-mono text-[11px] text-slate-500">
                  {activeHotspot.h3Index} · {activeHotspot.lat.toFixed(4)}, {activeHotspot.lon.toFixed(4)}
                </p>
              </div>
              <span className="rounded bg-blue-50 px-2 py-0.5 font-mono text-xs font-bold text-blue-700">
                {formatRiskScore(activeHotspot.score)}
              </span>
            </div>

            <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-1.5 text-[11px] text-slate-600">
              <span>Nearby ATMs: <strong className="text-slate-800">{activeHotspot.likelyAtms}</strong></span>
              {activeHotspot.rank === 1 && (
                <span className="font-semibold text-emerald-700">★ Primary Target</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
