"use client"; // on-demand geographic lookup and clipboard interaction

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { LocationResponse, PlaceLocation } from "@/lib/location";

export async function fetchLocations(params: URLSearchParams, signal?: AbortSignal): Promise<LocationResponse> {
  const response = await fetch(`/api/locations?${params}`, { ...(signal ? { signal } : {}) });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error?.message ?? "Location lookup unavailable. Retry.");
  }
  return response.json();
}

export function LocationDetails({ latitude, longitude, place, predicted = false }: {
  latitude: number; longitude: number; place?: PlaceLocation; predicted?: boolean;
}) {
  const [copyState, setCopyState] = useState("");
  const query = useQuery({
    queryKey: ["location", latitude, longitude],
    queryFn: ({ signal }) => fetchLocations(new URLSearchParams({ lat: String(latitude), lon: String(longitude) }), signal),
    enabled: !place, staleTime: 3_600_000, retry: 1, retryDelay: 1200, refetchOnWindowFocus: false,
  });
  const location = place ?? query.data?.data[0];
  return (
    <section className="space-y-4" aria-label="Location details">
      <div className="rounded-lg border border-sih-blue-100 bg-sih-blue-100/40 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-sih-blue-600">{predicted ? "Predicted area reference" : "Selected location"}</p>
        <p className="mt-2 font-mono text-sm font-medium text-navy-900">{latitude.toFixed(5)}, {longitude.toFixed(5)}</p>
        <button className="mt-2 text-xs font-medium text-sih-blue-600 hover:underline" onClick={async () => {
          try { await navigator.clipboard.writeText(`${latitude}, ${longitude}`); setCopyState("Coordinates copied"); }
          catch { setCopyState("Copy unavailable. Select the coordinates above."); }
        }}>Copy coordinates</button>
        <span className="ml-2 text-xs text-slate-600" role="status">{copyState}</span>
      </div>
      <div aria-live="polite">
        {query.isLoading && !place ? <p className="animate-pulse text-sm text-slate-600">Looking up locality and PIN code…</p> : null}
        {query.isError && !place ? <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-900"><p>Locality lookup unavailable. Coordinates are still available.</p><button onClick={() => query.refetch()} className="mt-2 font-semibold underline">Retry location lookup</button></div> : null}
        {location ? <>
          <p className="text-sm font-medium leading-6 text-slate-800">{location.label}</p>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-xs text-slate-600">PIN code</dt><dd className="mt-1 font-mono text-lg font-semibold text-navy-900">{location.postalCode ?? "Unavailable"}</dd></div>
            <div><dt className="text-xs text-slate-600">State</dt><dd className="mt-1">{location.state ?? "Unavailable"}</dd></div>
          </dl>
          <p className="mt-3 text-xs leading-5 text-slate-600">{location.matchType === "nearby" ? "Nearby mapped place · approximate postal match. A PIN code may not cover the entire predicted area." : "Mapped place · location precision depends on the source."}</p>
        </> : !query.isLoading && !query.isError ? <p className="text-sm text-slate-600">No mapped locality found. PIN code unavailable.</p> : null}
      </div>
      <p className="text-xs text-slate-500">Place data: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline">© OpenStreetMap contributors</a> via Photon.</p>
    </section>
  );
}
