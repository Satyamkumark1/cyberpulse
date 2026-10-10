import { Suspense } from "react";
import { Disclaimer } from "@/components/common/Disclaimer";
import { PrototypeBadge } from "@/components/common/PrototypeBadge";
import { RoleSwitcher } from "@/components/common/RoleSwitcher";
import { StatePanel } from "@/components/common/StatePanel";
import { DemoResetControl } from "@/components/demo/DemoResetControl";
import { DemoWalkthrough } from "@/components/demo/DemoWalkthrough";
import { resolveRoleFromNextHeaders } from "@/services/lib/auth";

// engineering/folder-structure.md §2: standalone shell, no sidebar — the
// walkthrough surface used for live demonstrations.
export default async function DemoPage() {
  const role = await resolveRoleFromNextHeaders();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-navy-900 px-4 py-3 text-white sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-white/5"><svg viewBox="0 0 24 24" fill="none" stroke="#77B3EF" strokeWidth="1.8" className="h-6 w-6"><path d="M2 12h5l3-7 4 14 3-7h5"/></svg></span>
          <div><span className="block text-sm font-semibold">CyberPulse AI</span><span className="block text-[10px] uppercase tracking-[0.16em] text-slate-400">Demonstration walkthrough</span></div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <RoleSwitcher role={role} dark />
          <DemoResetControl />
          <PrototypeBadge />
        </div>
      </header>
      <main className="flex-1">
        {/* useSearchParams (step state lives in the query string) opts this
            subtree out of static rendering — Suspense is the documented boundary. */}
        <Suspense fallback={<StatePanel state="loading" title="Loading demonstration" />}>
          <DemoWalkthrough />
        </Suspense>
      </main>
      <Disclaimer />
    </div>
  );
}
