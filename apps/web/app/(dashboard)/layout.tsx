import Link from "next/link";
import { Sidebar } from "@/components/layout/Sidebar";
import { Disclaimer } from "@/components/common/Disclaimer";
import { PrototypeBadge } from "@/components/common/PrototypeBadge";
import { RoleSwitcher } from "@/components/common/RoleSwitcher";
import { StatePanel } from "@/components/common/StatePanel";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { hasCapability, resolveRoleFromNextHeaders } from "@/services/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const role = await resolveRoleFromNextHeaders();
  // ADR-022: CITIZEN holds no officer capability, so every page here would
  // 403. Say so once, point to the citizen pages, and keep the role switcher
  // so a presenter can switch back. The 403s behind this remain the control.
  if (role === "CITIZEN") return <CitizenGate />;
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main-content" className="sr-only z-50 rounded-md bg-white p-3 text-sih-blue-600 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to content</a>
      <div className="flex flex-1 flex-col lg:flex-row">
        <Sidebar role={role} />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-4 text-slate-800 lg:px-8">
            <span className="text-sm font-medium text-slate-600">Decision-support workspace</span>
            <div className="flex flex-wrap items-center gap-4">
              {hasCapability(role, "alerts:read") && <NotificationBell role={role} />}
              <RoleSwitcher role={role} />
              <PrototypeBadge />
            </div>
          </header>

          <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 p-4 outline-none sm:p-6 lg:p-8">{children}</main>

          <Disclaimer />
        </div>
      </div>
    </div>
  );
}

function CitizenGate() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-4 lg:px-8">
        <span className="text-sm font-medium text-slate-600">Decision-support workspace</span>
        <div className="flex flex-wrap items-center gap-4">
          <RoleSwitcher role="CITIZEN" />
          <PrototypeBadge />
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-xl flex-1 p-6 outline-none">
        <StatePanel
          state="empty"
          title="This workspace is for officers"
          message="The CITIZEN role has no access here. Switch to an officer role, or open the citizen pages."
        />
        <p className="mt-4 text-center">
          <Link href="/safety" className="text-sm font-medium text-sih-blue-600 underline">
            Open Scam Shield
          </Link>
        </p>
      </main>
      <Disclaimer />
    </div>
  );
}
