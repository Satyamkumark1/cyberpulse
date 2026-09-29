import { SafetyShell } from "@/components/safety/SafetyShell";
import { VerifyChecks } from "@/components/safety/VerifyChecks";
import { COPY, langFrom } from "@/lib/safety/copy";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// FEAT-17 Verify Before You Pay (FR-27).
export default async function VerifyPage({ searchParams }: { searchParams: SearchParams }) {
  const lang = langFrom((await searchParams).lang);
  const t = COPY[lang].verify;
  return (
    <SafetyShell lang={lang} current="verify">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-800">{t.title}</h1>
      <p className="mb-6 mt-2 max-w-prose text-slate-600">{t.lede}</p>
      <div className="max-w-2xl">
        <VerifyChecks lang={lang} />
      </div>
    </SafetyShell>
  );
}
