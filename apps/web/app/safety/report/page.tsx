import { randomUUID } from "node:crypto";
import { StatePanel } from "@/components/common/StatePanel";
import { ReportNow } from "@/components/safety/ReportNow";
import { SafetyShell } from "@/components/safety/SafetyShell";
import { COPY, langFrom } from "@/lib/safety/copy";
import { cities } from "@/services/citizenReportService";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// FEAT-17 Report Now (FR-28). Server Component: loads the city list through the
// service as CITIZEN — every /safety caller is CITIZEN, whatever cookie the
// browser holds (ADR-022).
export default async function ReportPage({ searchParams }: { searchParams: SearchParams }) {
  const lang = langFrom((await searchParams).lang);
  const t = COPY[lang].report;

  let cityList: string[] | null = null;
  try {
    cityList = await cities({ role: "CITIZEN", requestId: `req_${randomUUID()}`, origin: "DEMO" });
  } catch {
    cityList = null;
  }

  return (
    <SafetyShell lang={lang} current="report">
      <h1 className="mb-4 text-2xl font-semibold tracking-tight text-slate-800">{t.title}</h1>
      {cityList && cityList.length > 0 ? (
        <ReportNow lang={lang} cities={cityList} />
      ) : (
        <StatePanel state="error" title={t.callHeading} message={`${COPY[lang].shell.helpline}. ${t.errors.cities}`} />
      )}
    </SafetyShell>
  );
}
