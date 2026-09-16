import { Disclaimer } from "@/components/common/Disclaimer";
import { PrototypeBadge } from "@/components/common/PrototypeBadge";

// engineering/folder-structure.md §2: standalone shell, no sidebar — the
// walkthrough surface used for live demonstrations.
export default function DemoPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-slate-200 bg-navy-800 px-4 py-3 text-white">
        <span className="text-sm font-medium">CyberPulse AI — demonstration walkthrough</span>
        <PrototypeBadge />
      </header>
      <main className="flex-1 p-6">
        <p className="text-sm text-slate-600">The guided walkthrough arrives with the features it demonstrates.</p>
      </main>
      <Disclaimer />
    </div>
  );
}
