import Link from "next/link";
import { Disclaimer } from "@/components/common/Disclaimer";
import { PrototypeBadge } from "@/components/common/PrototypeBadge";
import { COPY, REPORT_NOTICE, withLang, type Lang } from "@/lib/safety/copy";
import { localeDirection, SAFETY_LOCALES } from "@/lib/safety/locales";
import { VoiceAssistant } from "./VoiceAssistant";
import { BrandMark, CheckIcon, CloseIcon, GlobeIcon, HomeIcon, ReportIcon, ScanIcon, TrackIcon, VerifyIcon } from "./SafetyIcons";

export type SafetyPage = keyof typeof COPY.en.shell.nav;

const PATHS: Record<SafetyPage, string> = {
  home: "/safety", check: "/safety/check", verify: "/safety/verify", report: "/safety/report", status: "/safety/status",
};

const NAV_ICONS: Record<SafetyPage, React.ReactNode> = {
  home: <HomeIcon />,
  check: <ScanIcon />,
  verify: <VerifyIcon />,
  report: <ReportIcon />,
  status: <TrackIcon />,
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
            <BrandMark aria-hidden="true" className="h-10 w-10 shrink-0 sm:h-11 sm:w-11" />
            <span className="min-w-0"><span className="block truncate text-base font-extrabold tracking-[-.02em] text-[#092B4C]">{t.brand}</span><span className="hidden truncate text-[9px] font-bold uppercase tracking-[.2em] text-[#0E6B73] sm:block">Citizen safety by CyberPulse</span></span>
          </Link>

          <div className="flex items-center gap-2">
            {/* Native popover (no client JS): renders in the top layer, so the header's
                backdrop-filter can't trap it the way it trapped a fixed <details> panel;
                light-dismiss and Esc come free. key={lang} remounts it closed after a switch. */}
            <button type="button" popoverTarget="language-menu" aria-label={`Choose language. Current: ${selected.englishName}`} className="flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:border-blue-300 hover:bg-blue-50 sm:min-h-11 sm:gap-2 sm:px-3" dir="ltr">
              <GlobeIcon className="h-5 w-5 text-[#0E6B73]" />
              <span lang={selected.code} dir={localeDirection(lang)} className="hidden max-w-24 truncate sm:inline">{selected.nativeName}</span><span className="sm:hidden">{lang.toUpperCase()}</span>
              <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="hidden h-4 w-4 sm:block"><path d="m5.5 7.5 4.5 4 4.5-4" /></svg>
            </button>
            <div key={lang} id="language-menu" popover="auto" dir="ltr" aria-labelledby="language-menu-title" className="lang-sheet fixed inset-x-0 bottom-0 top-auto m-0 hidden max-h-[85dvh] w-full flex-col overflow-hidden rounded-t-[28px] [&:popover-open]:flex border-0 bg-white p-0 text-slate-900 shadow-[0_-12px_40px_rgba(15,23,42,.18)] backdrop:bg-slate-950/40 sm:inset-auto sm:right-[max(1.5rem,calc((100vw-72rem)/2+1.5rem))] sm:top-16 sm:max-h-[72vh] sm:w-[440px] sm:rounded-2xl sm:border sm:border-slate-200 sm:shadow-2xl sm:backdrop:bg-transparent">
              <div className="shrink-0 border-b border-slate-100 px-5 pb-3 pt-2.5 sm:px-4 sm:pt-4">
                <span aria-hidden="true" className="mx-auto mb-3 block h-1.5 w-10 rounded-full bg-slate-300 sm:hidden" />
                <div className="flex items-center justify-between gap-3">
                  <div><h2 id="language-menu-title" className="text-xl font-bold tracking-[-.01em] text-slate-950 sm:text-base">Choose your language</h2><p className="mt-0.5 text-sm text-slate-600 sm:text-xs">28 Indian language options</p></div>
                  <button type="button" popoverTarget="language-menu" popoverTargetAction="hide" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200" aria-label="Close language selector"><CloseIcon className="h-5 w-5" /></button>
                </div>
              </div>
              <div className="overflow-y-auto overscroll-contain px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 sm:px-3 sm:pb-3">
                {lang !== "en" && lang !== "hi" ? <p className="mb-3 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">Safety instructions currently use reviewed English while this language completes native-speaker validation.</p> : null}
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-1.5">
                  {SAFETY_LOCALES.map((locale) => {
                    const tile = "group flex min-h-[60px] w-full items-center justify-between gap-2 rounded-2xl border border-slate-200 px-3.5 py-2.5 text-start active:bg-slate-100 hover:border-blue-300 hover:bg-blue-50 aria-[current=true]:border-blue-600 aria-[current=true]:bg-blue-50 sm:min-h-12 sm:rounded-xl sm:border-transparent sm:px-3 sm:py-2";
                    const body = <><span className="min-w-0"><span className="block truncate text-base font-semibold text-slate-900 sm:text-sm">{locale.nativeName}</span>{locale.nativeName !== locale.englishName ? <span lang="en" className="block truncate text-xs text-slate-600 sm:text-[11px]">{locale.englishName}</span> : null}</span><CheckIcon className="hidden h-5 w-5 shrink-0 text-blue-700 group-aria-[current=true]:block" /></>;
                    // The current language links to this same URL, which would not
                    // remount the popover — so it closes the sheet instead.
                    return (
                      <li key={locale.code}>
                        {locale.code === lang
                          ? <button type="button" popoverTarget="language-menu" popoverTargetAction="hide" lang={locale.code} dir={localeDirection(locale.code)} aria-current="true" className={tile}>{body}</button>
                          : <Link href={withLang(here, locale.code)} hrefLang={locale.code} lang={locale.code} dir={localeDirection(locale.code)} className={tile}>{body}</Link>}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <nav aria-label={t.brand} className="hidden border-t border-slate-100 md:block" lang={contentLang}>
          <ul className="mx-auto flex max-w-6xl gap-1 px-6">{(Object.keys(PATHS) as SafetyPage[]).map((page) => <li key={page}><Link href={withLang(PATHS[page], lang)} aria-current={page === current ? "page" : undefined} className="flex min-h-12 items-center gap-2 border-b-2 border-transparent px-4 text-sm font-medium text-slate-600 hover:text-[#0E6B73] aria-[current=page]:border-[#0E6B73] aria-[current=page]:font-bold aria-[current=page]:text-[#092B4C]">{NAV_ICONS[page]}{t.nav[page]}</Link></li>)}</ul>
        </nav>
      </header>

      <div role="note" className="border-b border-amber-200/70 bg-amber-50">
        <div className="mx-auto flex max-w-6xl items-start gap-2.5 px-4 py-2 text-[11px] leading-4 text-slate-700 sm:items-center sm:px-6 sm:text-xs">
          <PrototypeBadge />
          <div className="min-w-0 border-l border-amber-300 pl-2.5">
            <p lang="en">{REPORT_NOTICE}</p>
            {lang === "hi" ? <p className="mt-0.5" lang="hi">{t.reportNotice}</p> : null}
          </div>
        </div>
      </div>

      <VoiceAssistant lang={lang} />

      <main id="main-content" tabIndex={-1} lang={contentLang} className="mx-auto w-full max-w-6xl px-4 pb-24 pt-4 outline-none sm:px-6 sm:pt-8 md:pb-12">{children}</main>

      {current !== "report" ? <div className="sticky bottom-0 z-20 hidden border-t border-red-200 bg-red-50/95 backdrop-blur md:block" lang={contentLang}><div className="mx-auto flex min-h-14 max-w-6xl items-center justify-between gap-3 px-6 py-2"><span className="text-sm font-semibold text-red-950">{t.alreadyPaid} <span className="font-normal text-red-800">{t.helpline}</span></span><a href="tel:1930" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-bold text-white shadow-sm hover:bg-red-700">{t.call1930}</a></div></div> : null}

      <nav aria-label={t.brand} className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(15,23,42,.08)] backdrop-blur md:hidden"><ul className="mx-auto grid h-[68px] max-w-lg grid-cols-5 px-1">{(Object.keys(PATHS) as SafetyPage[]).map((page) => <li key={page}><Link href={withLang(PATHS[page], lang)} aria-current={page === current ? "page" : undefined} className="flex h-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[11px] font-semibold leading-tight text-slate-500 aria-[current=page]:text-[#0E6B73]"><span className="grid h-8 w-10 place-items-center rounded-xl aria-[current=page]:bg-[#E7F4F4]">{NAV_ICONS[page]}</span><span className="w-full text-center">{MOBILE_LABELS[lang === "hi" ? "hi" : "en"][page]}</span></Link></li>)}</ul></nav>

      <div className="pb-[68px] md:pb-0"><Disclaimer /></div>
    </div>
  );
}
