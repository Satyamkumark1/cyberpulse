"use client"; // submitted place search and keyboard-accessible result selection

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { parseCoordinateSearch, type PlaceLocation } from "@/lib/location";
import { fetchLocations } from "./LocationDetails";

export function MapSearch({ onSelect }: { onSelect: (point: { latitude: number; longitude: number; place?: PlaceLocation }) => void }) {
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [validation, setValidation] = useState("");
  const query = useQuery({
    queryKey: ["place-search", search],
    queryFn: ({ signal }) => fetchLocations(new URLSearchParams({ q: search }), signal),
    enabled: Boolean(search) && open, retry: 1, retryDelay: 1200, staleTime: 3_600_000, refetchOnWindowFocus: false,
  });
  return <div className="relative w-full max-w-xl">
    <form onSubmit={(event) => {
      event.preventDefault(); setValidation("");
      const value = draft.trim();
      const coordinates = parseCoordinateSearch(value);
      if (coordinates) { setOpen(false); onSelect(coordinates); return; }
      if (/^[\d.,\s-]+$/.test(value) && !/^[1-9]\d{5}$/.test(value)) {
        setOpen(false); setValidation("Enter a six-digit PIN code or latitude, longitude within India."); return;
      }
      if (value.length < 2) { setValidation("Enter a locality, PIN code, or latitude, longitude."); return; }
      setSearch(value); setOpen(true);
      if (value === search && query.isError) void query.refetch();
    }} className="flex gap-2">
      <div className="relative min-w-0 flex-1">
        <label className="sr-only" htmlFor="map-place-search">Search locality, PIN code, or coordinates</label>
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>
        <input id="map-place-search" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }} maxLength={120} placeholder="Search locality, PIN code, or lat, lon" className="h-11 w-full rounded-md border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm" aria-describedby={validation ? "map-search-error" : undefined}/>
      </div>
      <button type="submit" className="rounded-md bg-sih-blue-600 px-4 text-sm font-medium text-white hover:bg-navy-700">Search</button>
    </form>
    {validation ? <p id="map-search-error" role="alert" className="mt-2 text-xs text-red-700">{validation}</p> : null}
    {open ? <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Places in India</span><button onClick={() => setOpen(false)} className="text-xs text-sih-blue-600">Close results</button></div>
      <div role="status" className="text-sm text-slate-600">
        {query.isFetching ? <p className="p-4">Searching places…</p> : query.isError ? <div className="p-4"><p>{query.error.message}</p><button onClick={() => query.refetch()} className="mt-2 text-sih-blue-600 underline">Retry search</button></div> : query.data?.data.length === 0 ? <p className="p-4">No matching places. Try a nearby locality or coordinates.</p> : null}
      </div>
      {!query.isFetching && !query.isError ? <ul aria-label="Place search results">{query.data?.data.map((place) => <li key={place.id}><button className="w-full border-b border-slate-100 px-4 py-3 text-left hover:bg-sih-blue-100/40" onClick={() => { onSelect({ latitude: place.latitude, longitude: place.longitude, place }); setOpen(false); }}><span className="block text-sm font-semibold text-slate-800">{place.name}{place.postalCode ? ` · ${place.postalCode}` : ""}</span><span className="mt-1 block text-xs leading-5 text-slate-600">{place.label}</span></button></li>)}</ul> : null}
      <p className="bg-slate-50 px-4 py-2 text-xs text-slate-600">Geographic results only · no risk assessment</p>
    </div> : null}
  </div>;
}
