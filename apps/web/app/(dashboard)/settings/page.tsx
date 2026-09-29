import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { resolveRoleFromNextHeaders } from "@/services/lib/auth";

export const metadata = { title: "Settings — CyberPulse AI" };

export default async function SettingsPage() {
  const role = await resolveRoleFromNextHeaders();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-800">Settings</h1>
      <p className="text-sm text-slate-600">Prototype governance, display thresholds, and service health.</p>
      <SettingsPanel role={role} />
    </div>
  );
}
