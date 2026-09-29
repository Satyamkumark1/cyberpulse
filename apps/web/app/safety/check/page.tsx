import { SafetyShell } from "@/components/safety/SafetyShell";
import { ScamCheck } from "@/components/safety/ScamCheck";
import { COPY, langFrom } from "@/lib/safety/copy";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// FEAT-17 Scam Check (FR-26).
export default async function ScamCheckPage({ searchParams }: { searchParams: SearchParams }) {
  const lang = langFrom((await searchParams).lang);
  const t = COPY[lang].check;
  return (
    <SafetyShell lang={lang} current="check">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-800">{t.title}</h1>
      <p className="mb-6 mt-2 max-w-prose text-slate-600">{t.lede}</p>
      <ScamCheck lang={lang} />
    </SafetyShell>
  );
}
