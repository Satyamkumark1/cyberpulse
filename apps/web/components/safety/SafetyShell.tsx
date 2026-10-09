import Link from "next/link";
import { Disclaimer } from "@/components/common/Disclaimer";
import { PrototypeBadge } from "@/components/common/PrototypeBadge";
import { COPY, REPORT_NOTICE, withLang, type Lang } from "@/lib/safety/copy";
import { localeDirection, SAFETY_LOCALES } from "@/lib/safety/locales";
import { VoiceAssistant } from "./VoiceAssistant";

export type SafetyPage = keyof typeof COPY.en.shell.nav;

const PATHS: Record<SafetyPage, string> = {
  home: "/safety", check: "/safety/check", verify: "/safety/verify", report: "/safety/report", status: "/safety/status",
};

const NAV_ICONS: Record<SafetyPage, React.ReactNode> = {
  home: <path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" />,
  check: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4M8.5 11l1.7 1.7 3.5-4" /></>,
  verify: <><path d="M12 3 5 6v5c0 5 2.9 8.2 7 10 4.1-1.8 7-5 7-10V6Z" /><path d="m9 12 2 2 4-4" /></>,
  report: <><path d="M12 8v5M12 17h.01" /><path d="M10.3 3.7 2.8 17a2 2 0 0 0 1.8 3h14.8a2 2 0 0 0 1.8-3L13.7 3.7a2 2 0 0 0-3.4 0Z" /></>,
  status: <><path d="M4 6h16M4 12h10M4 18h7" /><circle cx="18" cy="17" r="3" /></>,
};

const MOBILE_LABELS: Record<"en" | "hi", Record<SafetyPage, string>> = {
  en: { home: "Home", check: "Check", verify: "Verify", report: "Report", status: "Track" },
  hi: { home: "होम", check: "जाँच", verify: "सत्यापित", report: "रिपोर्ट", status: "ट्रैक" },
};

export function SafetyShell({ lang, current, children }: { lang: Lang; current: SafetyPage; children: React.ReactNode }) {
  const t = COPY[lang].shell;
  const contentLang = lang === "hi" ? "hi" : "en";
  const here = PATHS[current];
  const selected = SAFETY_LOCALES.find((locale) => locale.code === lang) ?? SAFETY_LOCALES[0];

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-900" dir={localeDirection(contentLang)}>
      <a href="#main-content" className="sr-only z-50 rounded-xl bg-white p-3 text-blue-700 shadow-lg focus:not-sr-only focus:fixed focus:left-4 focus:top-4">{t.skip}</a>

      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:h-16 sm:px-6">
          <Link href={withLang("/safety", lang)} className="flex min-w-0 items-center gap-3" aria-label={`${t.brand} home`}>
            <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-[0_8px_24px_rgba(37,99,235,.22)] sm:h-10 sm:w-10 sm:rounded-2xl">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-6 w-6"><path d="M12 3 5 6v5c0 5 2.9 8.2 7 10 4.1-1.8 7-5 7-10V6Z" /><path d="m9 12 2 2 4-4" /></svg>
            </span>
            <span className="min-w-0"><span className="block truncate text-base font-bold tracking-tight text-slate-950">{t.brand}</span><span className="hidden truncate text-[10px] font-semibold uppercase tracking-[.16em] text-slate-500 sm:block">{t.brandSub}</span></span>
          </Link>

          <div className="flex items-center gap-2">
            <details className="group relative" dir="ltr">
              <summary aria-label={`Choose language. Current: ${selected.englishName}`} className="flex min-h-10 list-none items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:border-blue-300 hover:bg-blue-50 sm:min-h-11 sm:gap-2 sm:px-3 [&::-webkit-details-marker]:hidden">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5 text-blue-600"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>
                <span lang={selected.code} dir={localeDirection(lang)} className="hidden max-w-24 truncate sm:inline">{selected.nativeName}</span><span className="sm:hidden">{lang.toUpperCase()}</span>
                <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="hidden h-4 w-4 transition group-open:rotate-180 sm:block"><path d="m5.5 7.5 4.5 4 4.5-4" /></svg>
              </summary>
              <div className="fixed inset-0 bottom-[68px] z-50 overflow-y-auto bg-white p-4 shadow-2xl sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-12 sm:max-h-[72vh] sm:w-[440px] sm:rounded-2xl sm:border sm:border-slate-200 sm:p-3">
                <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3"><div><p className="text-lg font-bold text-slate-950 sm:text-base">Choose your language</p><p className="text-xs text-slate-500">28 Indian language options</p></div><Link href={withLang(here, lang)} className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-xl text-slate-700" aria-label="Close language selector">×</Link></div>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  {SAFETY_LOCALES.map((locale) => (
                    <Link key={locale.code} href={withLang(here, locale.code)} hrefLang={locale.code} lang={locale.code} dir={localeDirection(locale.code)} aria-current={locale.code === lang ? "true" : undefined} className="min-h-12 rounded-xl border border-transparent px-3 py-2 text-left hover:border-blue-200 hover:bg-blue-50 aria-[current=true]:border-blue-200 aria-[current=true]:bg-blue-50">
                      <span className="block text-sm font-semibold text-slate-900">{locale.nativeName}</span>{locale.nativeName !== locale.englishName ? <span className="block text-[11px] text-slate-500">{locale.englishName}</span> : null}
                    </Link>
                  ))}
                </div>
                {lang !== "en" && lang !== "hi" ? <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">Safety instructions currently use reviewed English while this language completes native-speaker validation.</p> : null}
              </div>
            </details>
          </div>
        </div>

        <nav aria-label={t.brand} className="hidden border-t border-slate-100 md:block" lang={contentLang}>
          <ul className="mx-auto flex max-w-6xl gap-1 px-6">{(Object.keys(PATHS) as SafetyPage[]).map((page) => <li key={page}><Link href={withLang(PATHS[page], lang)} aria-current={page === current ? "page" : undefined} className="flex min-h-12 items-center gap-2 border-b-2 border-transparent px-4 text-sm font-medium text-slate-600 hover:text-blue-700 aria-[current=page]:border-blue-600 aria-[current=page]:font-bold aria-[current=page]:text-blue-700"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">{NAV_ICONS[page]}</svg>{t.nav[page]}</Link></li>)}</ul>
        </nav>
      </header>

      <div role="note" className="border-b border-amber-200/70 bg-amber-50"><div className="mx-auto max-w-6xl px-4 py-2.5 text-xs leading-5 text-slate-700 sm:px-6 sm:text-sm"><div className="mb-1.5"><PrototypeBadge /></div><div className="flex gap-2.5"><span aria-hidden="true" className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-amber-200 text-xs font-bold text-amber-900">i</span><div><p lang="en">{REPORT_NOTICE}</p>{lang === "hi" ? <p className="mt-0.5" lang="hi">{t.reportNotice}</p> : null}</div></div></div></div>

      <main id="main-content" tabIndex={-1} lang={contentLang} className="mx-auto w-full max-w-6xl px-4 pb-24 pt-4 outline-none sm:px-6 sm:pt-8 md:pb-12">{children}</main>

      {current !== "report" ? <div className="sticky bottom-0 z-20 hidden border-t border-red-200 bg-red-50/95 backdrop-blur md:block" lang={contentLang}><div className="mx-auto flex min-h-14 max-w-6xl items-center justify-between gap-3 px-6 py-2"><span className="text-sm font-semibold text-red-950">{t.alreadyPaid} <span className="font-normal text-red-800">{t.helpline}</span></span><a href="tel:1930" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-bold text-white shadow-sm hover:bg-red-700">{t.call1930}</a></div></div> : null}

      <nav aria-label={t.brand} className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(15,23,42,.08)] backdrop-blur md:hidden"><ul className="mx-auto grid h-[68px] max-w-lg grid-cols-5 px-1">{(Object.keys(PATHS) as SafetyPage[]).map((page) => <li key={page}><Link href={withLang(PATHS[page], lang)} aria-current={page === current ? "page" : undefined} className="flex h-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[11px] font-semibold leading-tight text-slate-500 aria-[current=page]:text-blue-700"><span className="grid h-8 w-10 place-items-center rounded-xl aria-[current=page]:bg-blue-50"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">{NAV_ICONS[page]}</svg></span><span className="w-full text-center">{MOBILE_LABELS[lang === "hi" ? "hi" : "en"][page]}</span></Link></li>)}</ul></nav>

      <div className="pb-[68px] md:pb-0"><Disclaimer /></div>
      <VoiceAssistant lang={lang} />
    </div>
  );
}
