import { SafetyShell } from "@/components/safety/SafetyShell";
import { StatusLookup } from "@/components/safety/StatusLookup";
import { COPY, langFrom } from "@/lib/safety/copy";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// FEAT-17 status tracking (FR-29). The complaint ID may arrive in the query
// string from Report Now; the tracking code never does.
export default async function StatusPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const lang = langFrom(params.lang);
  const t = COPY[lang].status;
  const id = typeof params.id === "string" && /^C-\d{5}$/.test(params.id) ? params.id : null;

  return (
    <SafetyShell lang={lang} current="status">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-800">{t.title}</h1>
      <p className="mb-6 mt-2 max-w-prose text-slate-600">{t.lede}</p>
      <StatusLookup lang={lang} initialComplaintId={id} />
    </SafetyShell>
  );
}
