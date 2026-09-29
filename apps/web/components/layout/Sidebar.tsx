"use client"; // active route indication and mobile navigation disclosure

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ActorRole } from "@cyberpulse/shared/enums";

const defaultGroups = [
  { label: "Monitoring", items: [["/dashboard", "Dashboard", "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z"], ["/risk-map", "Risk Map", "m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6 M9 3v15 M15 6v15"], ["/alerts", "Alerts", "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4"]] },
  { label: "Casework", items: [["/complaints", "Complaints", "M6 3h9l4 4v14H6z M14 3v5h5 M9 12h7 M9 16h7"], ["/transactions", "Transactions", "M3 7h17m-4-4 4 4-4 4 M21 17H4m4-4-4 4 4 4"], ["/investigations", "Investigations", "M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14 M15 15l6 6"]] },
  { label: "Workspace", items: [["/reports", "Reports", "M4 3v18h17 M8 16v-4 M13 16V8 M18 16V5"], ["/settings", "Settings", "M4 7h16 M4 17h16 M8 4v6 M16 14v6"]] },
];

// GUARD is read-only and identity-free (ADR-021) — hotspots:read and
// settings:read only. It deliberately has no Risk Map link: the hotspot
// drawer behind that page also returns complaint-linked data (fraud type,
// amount) gated only by hotspots:read, and GUARD lacks complaints:read — the
// duty-post landing page below is the positional-data-only view DEC-010's
// intent requires.
const guardGroups = [
  { label: "Monitoring", items: [["/guard", "Duty Coverage", "M12 3l7 4v5c0 5-3 8-7 9-4-1-7-4-7-9V7z"]] },
  { label: "Workspace", items: [["/settings", "Settings", "M4 7h16 M4 17h16 M8 4v6 M16 14v6"]] },
];

// I4C has national read access to operational data, but Settings is not part
// of its dashboard surface. Keep this explicit so a future default-nav item
// cannot silently expose a capability outside the I4C profile.
const i4cGroups = [
  { label: "Monitoring", items: defaultGroups[0]!.items },
  { label: "Casework", items: defaultGroups[1]!.items },
  { label: "Workspace", items: [defaultGroups[2]!.items[0]!] },
];

export function Sidebar({ role }: { role: ActorRole }) {
  const groups = role === "GUARD" ? guardGroups : role === "I4C" ? i4cGroups : defaultGroups;
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { setOpen(false); }, [pathname]);
  return <aside className="shrink-0 bg-navy-900 text-white lg:sticky lg:top-0 lg:h-screen lg:w-60" onKeyDown={(e) => { if (e.key === "Escape") { setOpen(false); toggleRef.current?.focus(); } }}>
    <div className="flex items-center justify-between px-5 py-5 lg:px-6 lg:py-7">
      <Link href="/dashboard" className="flex items-center gap-3" aria-label="CyberPulse AI dashboard">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-white/5"><svg viewBox="0 0 24 24" fill="none" stroke="#77B3EF" strokeWidth="1.8" className="h-6 w-6" aria-hidden="true"><path d="M2 12h5l3-7 4 14 3-7h5"/></svg></span>
        <span><span className="block text-base font-semibold tracking-tight">CyberPulse <span className="text-blue-300">AI</span></span><span className="mt-0.5 block text-[10px] uppercase tracking-[0.17em] text-slate-400">Fraud intelligence</span></span>
      </Link>
      <button ref={toggleRef} onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls="workspace-navigation" className="rounded-md border border-white/20 px-3 py-2 text-xs lg:hidden">{open ? "Close menu" : "Menu"}</button>
    </div>
    <div id="workspace-navigation" className={`${open ? "block" : "hidden"} px-3 pb-5 lg:flex lg:h-[calc(100%-100px)] lg:flex-col`}>
      <nav aria-label="Primary" className="space-y-6 lg:flex-1">
        {groups.map((group) => <div key={group.label}><p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{group.label}</p><ul className="space-y-1">{group.items.map(([href, label, path]) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return <li key={href}><Link href={href!} aria-current={active ? "page" : undefined} className={`flex items-center gap-3 rounded-md border px-3 py-2.5 text-sm transition-colors ${active ? "border-white/10 bg-navy-700 font-medium text-white" : "border-transparent text-slate-300 hover:bg-white/5 hover:text-white"}`}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`h-[18px] w-[18px] ${active ? "text-blue-300" : "text-slate-400"}`}><path d={path}/></svg>{label}{active ? <span aria-hidden="true" className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-300"/> : null}</Link></li>;
        })}</ul></div>)}
      </nav>
      <div className="mx-2 mt-7 rounded-lg border border-white/10 bg-white/5 p-3"><p className="text-xs font-medium text-slate-200">Research prototype</p><p className="mt-1 text-[11px] leading-5 text-slate-400">Synthetic demonstration data.<br/>Not an MHA/I4C system.</p></div>
    </div>
  </aside>;
}
