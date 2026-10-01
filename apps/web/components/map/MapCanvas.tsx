"use client"; // WebGL map lifecycle, interactive layers, and location selection

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Map as MaplibreMap, Marker, NavigationControl, ScaleControl, FullscreenControl, LngLatBounds, setWorkerUrl, type GeoJSONSource, type StyleSpecification } from "maplibre-gl";
import { cellToBoundary, isValidCell } from "h3-js";
import { INDIA_BOUNDS } from "@cyberpulse/shared/constants";
import "maplibre-gl/dist/maplibre-gl.css";
import { StatePanel } from "@/components/common/StatePanel";
import { RiskBadge } from "@/components/common/RiskBadge";
import type { PlaceLocation } from "@/lib/location";
import { HotspotDrawer } from "./HotspotDrawer";
import { MapAccessibleTable } from "./MapAccessibleTable";
import { MapSearch } from "./MapSearch";
import { LocationDetails } from "./LocationDetails";
import { RISK_COLORS, type AtmListItem, type HotspotListItem, type HotspotDetail } from "./types";
import { apiFetch } from "@/lib/apiFetch";

setWorkerUrl("/maplibre-gl-worker.mjs");
const configuredStyle = process.env.NEXT_PUBLIC_MAP_TILE_URL;
// Upgrade the old demo default while honoring custom deployment providers.
const STREET_STYLE = !configuredStyle || configuredStyle.includes("demotiles.maplibre.org")
  ? "https://tiles.openfreemap.org/styles/liberty" : configuredStyle;
const EMPTY_STYLE: StyleSpecification = { version: 8, sources: {}, layers: [{ id: "background", type: "background", paint: { "background-color": "#ecf0f6" } }] };
const INDIA_BBOX = [INDIA_BOUNDS.lonMin, INDIA_BOUNDS.latMin, INDIA_BOUNDS.lonMax, INDIA_BOUNDS.latMax].join(",");
interface SelectedPoint { latitude: number; longitude: number; place?: PlaceLocation; atm?: AtmListItem }

async function readData<T>(url: string, signal: AbortSignal): Promise<T> {
  return apiFetch(url, { signal }, "Map data could not be loaded.");
}
function webglAvailable() {
  try { return Boolean(document.createElement("canvas").getContext("webgl2")); } catch { return false; }
}
function motionDuration() { return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 500; }

export interface MapCanvasProps { heightPx?: number }

export function MapCanvas({ heightPx }: MapCanvasProps) {
  const compact = heightPx !== undefined && heightPx < 500;
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MaplibreMap | null>(null);
  const fittedRef = useRef(false);
  const [webgl] = useState(webglAvailable);
  const [revision, setRevision] = useState(0);
  const [fallback, setFallback] = useState(false);
  const [tileWarning, setTileWarning] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [layers, setLayers] = useState({ heatmap: true, hotspots: true, atms: false });
  const [selectedH3, setSelectedH3] = useState<string | null>(null);
  const [point, setPoint] = useState<SelectedPoint | null>(null);
  const [bbox, setBbox] = useState(INDIA_BBOX);
  const hotspots = useQuery({ queryKey: ["hotspots"], queryFn: ({ signal }) => readData<{ data: HotspotListItem[] }>("/api/hotspots?limit=100", signal).then((r) => r.data) });
  const atms = useQuery({ queryKey: ["atms", bbox], queryFn: ({ signal }) => readData<{ data: AtmListItem[] }>(`/api/atms?bbox=${bbox}&limit=2000`, signal).then((r) => r.data), enabled: layers.atms && Boolean(bbox) });
  const detail = useQuery({ queryKey: ["hotspot-detail", selectedH3], queryFn: ({ signal }) => readData<HotspotDetail>(`/api/hotspots/${selectedH3}`, signal), enabled: Boolean(selectedH3) });
  const selected = detail.data;

  const closeSelection = useCallback(() => {
    setSelectedH3(null); setPoint(null);
    if (window.location.hash && isValidCell(window.location.hash.slice(1))) window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }, []);
  const selectHotspot = useCallback((h3: string) => {
    setSelectedH3(h3); setPoint(null); setShowTable(false);
    if (window.location.pathname === "/risk-map") window.history.replaceState(null, "", `#${h3}`);
  }, []);
  const selectPoint = useCallback((next: SelectedPoint) => {
    closeSelection(); setPoint(next); setShowTable(false);
  }, [closeSelection]);

  useEffect(() => {
    const readHash = () => { const h3 = window.location.hash.slice(1); if (isValidCell(h3)) { setSelectedH3(h3); setPoint(null); } else setSelectedH3(null); };
    readHash(); window.addEventListener("hashchange", readHash);
    return () => window.removeEventListener("hashchange", readHash);
  }, []);

  // Keep the same container mounted when switching to the accessible table.
  useEffect(() => {
    if (!webgl || !containerRef.current) return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    let observer: ResizeObserver;
    const frame = requestAnimationFrame(() => {
      if (disposed || !containerRef.current) return;
      const map = new MaplibreMap({ container: containerRef.current, style: STREET_STYLE, center: [78.9, 22.6], zoom: 4.2, maxZoom: 19 });
      mapRef.current = map;
      map.addControl(new NavigationControl({ showCompass: false }), "top-right");
      map.addControl(new FullscreenControl(), "top-right");
      map.addControl(new ScaleControl({ unit: "metric" }), "bottom-left");
      let ready = false;
      const installFallback = () => { if (!ready && !disposed) { setFallback(true); map.setStyle(EMPTY_STYLE); } };
      timer = setTimeout(installFallback, 12_000);
      map.on("style.load", () => { ready = true; clearTimeout(timer); setRevision((v) => v + 1); });
      map.on("error", () => { setTileWarning(true); });
      map.on("idle", () => { if (map.areTilesLoaded()) setTileWarning(false); });
      const updateBbox = () => { const b = map.getBounds(); setBbox([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].join(",")); };
      map.on("moveend", updateBbox); updateBbox();
      // Delegate feature clicks once, rather than re-registering on style changes.
      map.on("click", async (event) => {
        const ids = ["atms-clusters", "atms-points"].filter((id) => map.getLayer(id));
        if (!ids.length) return;
        const feature = map.queryRenderedFeatures(event.point, { layers: ids })[0];
        if (!feature || feature.geometry.type !== "Point") return;
        const [longitude, latitude] = feature.geometry.coordinates as [number, number];
        if (feature.properties.cluster) {
          try { const zoom = await map.getSource<GeoJSONSource>("atms")!.getClusterExpansionZoom(Number(feature.properties.cluster_id)); if (!disposed) map.easeTo({ center: [longitude, latitude], zoom, duration: motionDuration() }); } catch { /* Source can disappear during style retry. */ }
        } else selectPoint({ latitude, longitude, atm: { atmId: String(feature.properties.atmId), bankName: String(feature.properties.bankName), city: String(feature.properties.city), status: String(feature.properties.status), latitude, longitude } });
      });
      observer = new ResizeObserver(() => map.resize()); observer.observe(containerRef.current);
    });
    return () => { disposed = true; cancelAnimationFrame(frame); clearTimeout(timer); observer?.disconnect(); mapRef.current?.remove(); mapRef.current = null; };
  }, [webgl, selectPoint]);

  const fitResults = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!hotspots.data?.length) { map.easeTo({ center: [78.9, 22.6], zoom: 4.2, duration: motionDuration() }); return; }
    const bounds = new LngLatBounds(); hotspots.data.forEach((h) => bounds.extend([h.longitude, h.latitude]));
    map.fitBounds(bounds, { padding: 65, maxZoom: 13, duration: motionDuration() });
  }, [hotspots.data]);

  useEffect(() => {
    if (!revision || !hotspots.data?.length || fittedRef.current) return;
    fittedRef.current = true;
    if (!window.location.hash && !selectedH3 && !point) fitResults();
  }, [revision, hotspots.data, selectedH3, point, fitResults]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !revision || !hotspots.data) return;
    const data = { type: "FeatureCollection" as const, features: hotspots.data.map((h) => ({ type: "Feature" as const, geometry: { type: "Point" as const, coordinates: [h.longitude, h.latitude] }, properties: { riskScore: h.riskScore } })) };
    const source = map.getSource<GeoJSONSource>("hotspots");
    if (source) source.setData(data);
    else {
      map.addSource("hotspots", { type: "geojson", data });
      map.addLayer({ id: "risk-heat", type: "heatmap", source: "hotspots", maxzoom: 15, paint: { "heatmap-weight": ["get", "riskScore"], "heatmap-radius": 38, "heatmap-opacity": 0.38 } });
    }
    map.setLayoutProperty("risk-heat", "visibility", layers.heatmap ? "visible" : "none");
    if (!layers.hotspots) return;
    const markers = hotspots.data.map((h, i) => {
      const element = document.createElement("button");
      element.type = "button"; element.className = `map-pin ${selectedH3 === h.h3Index ? "map-pin-selected" : ""}`;
      element.style.setProperty("--pin-color", RISK_COLORS[h.riskLevel]);
      element.setAttribute("aria-label", `Open ${h.name}, ${h.riskLevel.toLowerCase()} risk`);
      element.setAttribute("aria-pressed", String(selectedH3 === h.h3Index));
      element.title = `${h.name} · ${h.riskLevel}`;
      const number = document.createElement("span"); number.textContent = String(i + 1); element.append(number);
      element.addEventListener("click", () => selectHotspot(h.h3Index));
      return new Marker({ element, anchor: "bottom" }).setLngLat([h.longitude, h.latitude]).addTo(map);
    });
    return () => markers.forEach((marker) => marker.remove());
  }, [revision, hotspots.data, layers.heatmap, layers.hotspots, selectedH3, selectHotspot]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !revision) return;
    const data = { type: "FeatureCollection" as const, features: (atms.data ?? []).map((a) => ({ type: "Feature" as const, geometry: { type: "Point" as const, coordinates: [a.longitude, a.latitude] }, properties: { ...a } })) };
    const source = map.getSource<GeoJSONSource>("atms");
    if (source) source.setData(data);
    else {
      map.addSource("atms", { type: "geojson", data, cluster: true, clusterRadius: 45 });
      map.addLayer({ id: "atms-clusters", type: "circle", source: "atms", filter: ["has", "point_count"], paint: { "circle-radius": 18, "circle-color": "#27456F", "circle-stroke-width": 2, "circle-stroke-color": "#ffffff" } });
      if (!fallback) map.addLayer({ id: "atms-count", type: "symbol", source: "atms", filter: ["has", "point_count"], layout: { "text-field": ["get", "point_count_abbreviated"], "text-size": 12, "text-font": ["Noto Sans Regular"] }, paint: { "text-color": "#ffffff" } });
      map.addLayer({ id: "atms-points", type: "circle", source: "atms", filter: ["!", ["has", "point_count"]], paint: { "circle-radius": 7, "circle-color": "#0E7C86", "circle-stroke-width": 2, "circle-stroke-color": "#ffffff" } });
    }
    for (const id of ["atms-clusters", "atms-count", "atms-points"]) if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", layers.atms ? "visible" : "none");
  }, [revision, atms.data, layers.atms, fallback]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !revision) return;
    if (map.getLayer("selected-outline")) map.removeLayer("selected-outline");
    if (map.getLayer("selected-fill")) map.removeLayer("selected-fill");
    if (map.getSource("selected-area")) map.removeSource("selected-area");
    if (!selectedH3 || !isValidCell(selectedH3)) return;
    map.addSource("selected-area", { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [cellToBoundary(selectedH3, true)] } } });
    map.addLayer({ id: "selected-fill", type: "fill", source: "selected-area", paint: { "fill-color": "#1B5FBF", "fill-opacity": 0.12 } });
    map.addLayer({ id: "selected-outline", type: "line", source: "selected-area", paint: { "line-color": "#1B5FBF", "line-width": 2, "line-dasharray": [3, 2] } });
  }, [revision, selectedH3]);

  const latitude = point?.latitude ?? selected?.latitude;
  const longitude = point?.longitude ?? selected?.longitude;
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !revision || latitude === undefined || longitude === undefined) return;
    map.easeTo({ center: [longitude, latitude], zoom: 15, duration: motionDuration() });
    const marker = new Marker({ color: "#1B5FBF" }).setLngLat([longitude, latitude]).addTo(map);
    return () => { marker.remove(); };
  }, [latitude, longitude, revision]);

  function retryTiles() {
    const map = mapRef.current;
    if (!map) return;
    setFallback(false); setTileWarning(false); setRevision(0);
    map.setStyle(STREET_STYLE);
    // A failed retry must still restore a usable canvas with overlays.
    setTimeout(() => { if (mapRef.current === map && !map.isStyleLoaded()) { setFallback(true); map.setStyle(EMPTY_STYLE); } }, 12_000);
  }

  const hasSelection = Boolean(selectedH3 || point);
  const rail = !compact || hasSelection;
  return <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm" aria-label="Geographic intelligence workspace">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
      <MapSearch onSelect={selectPoint} />
      <div className="flex items-center gap-2">
        <button onClick={() => { setShowTable(false); closeSelection(); fitResults(); }} className="map-tool">Fit hotspots</button>
        <button onClick={() => setShowTable((value) => !value)} aria-pressed={showTable || !webgl} className="map-tool">{showTable && webgl ? "Show map" : "Accessible table"}</button>
      </div>
    </div>
    <div className={`grid ${rail ? "xl:grid-cols-[minmax(0,1fr)_320px]" : ""}`}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-slate-100 px-4 py-3">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Map layers</span>
          {([["heatmap", "Risk heatmap"], ["hotspots", "Hotspot pins"], ["atms", "ATM locations"]] as const).map(([key, label]) => <label key={key} className="flex items-center gap-2 text-xs font-medium text-slate-700"><input type="checkbox" checked={layers[key]} onChange={(e) => setLayers((previous) => ({ ...previous, [key]: e.target.checked }))} className="h-4 w-4 accent-sih-blue-600"/>{label}</label>)}
        </div>
        {fallback || tileWarning ? <div role="status" className="flex items-center justify-between gap-3 bg-amber-50 px-4 py-3 text-xs text-amber-900"><span>{fallback ? "Street map unavailable. Location pins and the table remain available." : "Some street details could not load. Your map position is preserved."}</span><button onClick={retryTiles} className="shrink-0 font-semibold underline">Retry map</button></div> : null}
        {!webgl ? <StatePanel state="degraded" title="Map unavailable" message="WebGL is unavailable. Explore locations using the table below." /> : null}
        <div className={showTable || !webgl ? "hidden" : "relative"}>
          <div ref={containerRef} className="risk-map-canvas bg-slate-100" style={heightPx ? { height: heightPx } : undefined} aria-label="Interactive street map" />
          {!revision && webgl ? <div role="status" className="pointer-events-none absolute left-4 top-4 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">Loading street map…</div> : null}
          {hasSelection ? <div className="pointer-events-none absolute bottom-10 left-3 max-w-[75%] rounded-md border border-slate-200 bg-white/95 px-3 py-2 text-xs font-medium text-navy-900 shadow-sm">{selectedH3 ? "Dashed boundary · predicted area" : point?.atm ? "Synthetic ATM location" : "Geographic reference · no risk assessment"}</div> : null}
        </div>
        {showTable || !webgl ? <div className="overflow-x-auto p-4"><MapAccessibleTable hotspots={hotspots.data ?? []} onSelect={selectHotspot} />{layers.atms && atms.data?.length ? <ul aria-label="ATM locations" className="mt-4 space-y-2">{atms.data.map((a) => <li key={a.atmId}><button className="text-sm text-sih-blue-600 underline" onClick={() => selectPoint({ ...a, atm: a })}>{a.atmId} · {a.bankName} · {a.latitude.toFixed(5)}, {a.longitude.toFixed(5)}</button></li>)}</ul> : null}</div> : null}
        {hotspots.isLoading ? <StatePanel state="loading" title="Loading predicted hotspots" /> : hotspots.isError ? <StatePanel state="error" title="Hotspots could not load" onRetry={() => hotspots.refetch()} /> : hotspots.data?.length === 0 ? <StatePanel state="empty" message="No hotspots have been predicted yet. Search a location or analyze a complaint to begin." /> : null}
        {layers.atms && atms.isError ? <StatePanel state="error" title="ATM locations could not load" onRetry={() => atms.refetch()} /> : null}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
          <div className="flex flex-wrap gap-3 text-xs text-slate-600">{(["HIGH", "MEDIUM", "LOW"] as const).map((level) => <span key={level} className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: RISK_COLORS[level] }} />{level.charAt(0) + level.slice(1).toLowerCase()} risk</span>)}</div>
          <span className="text-[11px] text-slate-500">Synthetic risk data · geographic reference map</span>
        </div>
      </div>
      {rail ? <aside className="border-t border-slate-200 xl:max-h-[820px] xl:overflow-y-auto xl:border-l xl:border-t-0" aria-label="Map location panel">
        {selectedH3 ? <HotspotDrawer key={selectedH3} h3Index={selectedH3} onClose={closeSelection} embedded /> : point ? <div className="space-y-4 p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-semibold uppercase tracking-widest text-teal-600">{point.atm ? "ATM location" : "Place details"}</p><h2 className="mt-2 text-lg font-semibold text-navy-900">{point.atm?.bankName ?? point.place?.name ?? "Selected coordinates"}</h2></div><button onClick={closeSelection} className="map-tool" aria-label="Close location details">×</button></div>{point.atm ? <p className="text-xs text-slate-600">{point.atm.atmId} · {point.atm.status} · Synthetic recorded location</p> : null}<LocationDetails key={`${point.latitude},${point.longitude}`} latitude={point.latitude} longitude={point.longitude} {...(point.place ? { place: point.place } : {})} /></div> : <div className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-teal-600">Area intelligence</p>
          <h2 className="mt-2 text-lg font-semibold text-navy-900">Explore predicted hotspots</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Select a pin to inspect its locality, PIN code, withdrawal window, and risk factors.</p>
          <div className="my-5 border-t border-slate-100" />
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Ranked locations</p>
          <ul className="space-y-2">{hotspots.data?.map((h, index) => <li key={h.h3Index}><button onClick={() => selectHotspot(h.h3Index)} className="group flex w-full items-center gap-3 rounded-md border border-slate-100 p-3 text-left transition-colors hover:border-sih-blue-100 hover:bg-sih-blue-100/30"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 font-mono text-xs text-slate-600">{index + 1}</span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-800 group-hover:text-sih-blue-600">{h.name}</span><span className="mt-1 block text-xs text-slate-500">{h.city}, {h.state}</span></span><RiskBadge level={h.riskLevel}/></button></li>)}</ul>
        </div>}
      </aside> : null}
    </div>
  </section>;
}
