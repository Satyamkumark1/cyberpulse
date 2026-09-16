"use client"; // next/dynamic with ssr:false requires a client boundary

import dynamic from "next/dynamic";
import { StatePanel } from "@/components/common/StatePanel";
import type { MapCanvasProps } from "./MapCanvas";

// RULE-frontend.md §Performance: the map is never in the initial route
// bundle — maplibre-gl (~200KB gz, ADR-006) only loads once this mounts.
const MapCanvas = dynamic(() => import("./MapCanvas").then((m) => m.MapCanvas), {
  ssr: false,
  loading: () => <StatePanel state="loading" title="Loading map" message="Preparing the risk map." />,
});

export function MapCanvasLazy(props: MapCanvasProps) {
  return <MapCanvas {...props} />;
}
