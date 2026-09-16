import Link from "next/link";
import { Disclaimer } from "@/components/common/Disclaimer";
import { PrototypeBadge } from "@/components/common/PrototypeBadge";

// engineering/folder-structure.md §2 route list. Server Component — static
// navigation shell, no client state (RULE-frontend.md §Server vs client).
const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/complaints", label: "Complaints" },
  { href: "/risk-map", label: "Risk Map" },
  { href: "/transactions", label: "Transactions" },
  { href: "/investigations", label: "Investigations" },
  { href: "/alerts", label: "Alerts" },
  { href: "/reports", label: "Reports" },
  { href: "/settings", label: "Settings" },
] as const;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1">
        <nav
          aria-label="Primary"
          className="w-56 shrink-0 bg-navy-900 px-3 py-4 text-white"
        >
          <div className="mb-6 px-2 text-lg font-semibold">CyberPulse AI</div>
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block rounded-sm px-2 py-2 text-sm text-white/90 hover:bg-navy-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sih-blue-600"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-slate-200 bg-navy-800 px-4 py-3 text-white">
            <span className="text-sm font-medium">Decision-support intelligence — prototype</span>
            <PrototypeBadge />
          </header>

          <main className="flex-1 p-6">{children}</main>

          <Disclaimer />
        </div>
      </div>
    </div>
  );
}
