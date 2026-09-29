import Link from "next/link";
import { Disclaimer } from "@/components/common/Disclaimer";
import { PrototypeBadge } from "@/components/common/PrototypeBadge";
import { COPY, REPORT_NOTICE, withLang, type Lang } from "@/lib/safety/copy";

export type SafetyPage = keyof typeof COPY.en.shell.nav;

const PATHS: Record<SafetyPage, string> = {
  home: "/safety",
  check: "/safety/check",
  verify: "/safety/verify",
  report: "/safety/report",
  status: "/safety/status",
};

/**
 * FEAT-17 public shell (Server Component). Carries the prototype badge, the
 * global disclaimer and the report notice on every /safety route (AC-017-01);
 * the notice is the fixed English string, with its Hindi translation added
 * when Hindi is selected. Language is a query-string link, not client state.
 */
export function SafetyShell({ lang, current, children }: { lang: Lang; current: SafetyPage; children: React.ReactNode }) {
  const t = COPY[lang].shell;
  const here = PATHS[current];

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-white p-3 text-sih-blue-600 focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        {t.skip}
      </a>

      <header className="bg-navy-900 text-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link href={withLang("/safety", lang)} className="flex items-center gap-3">
            <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-white/5">
              <svg viewBox="0 0 24 24" fill="none" stroke="#77B3EF" strokeWidth="1.8" className="h-6 w-6">
                <path d="M12 3l7 4v5c0 5-3 8-7 9-4-1-7-4-7-9V7z M9 12l2 2 4-4" />
              </svg>
            </span>
            <span>
              <span className="block text-base font-semibold">{t.brand}</span>
              <span className="block text-[11px] uppercase tracking-[0.14em] text-slate-400">{t.brandSub}</span>
            </span>
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <nav aria-label={t.language} className="flex items-center gap-1 text-sm">
              <Link
                href={here}
                lang="en"
                aria-current={lang === "en" ? "true" : undefined}
                className="rounded-md px-2 py-1.5 text-slate-300 hover:text-white aria-[current=true]:bg-white/10 aria-[current=true]:font-semibold aria-[current=true]:text-white"
              >
                English
              </Link>
              <Link
                href={withLang(here, "hi")}
                lang="hi"
                aria-current={lang === "hi" ? "true" : undefined}
                className="rounded-md px-2 py-1.5 text-slate-300 hover:text-white aria-[current=true]:bg-white/10 aria-[current=true]:font-semibold aria-[current=true]:text-white"
              >
                हिन्दी
              </Link>
            </nav>
            <PrototypeBadge />
          </div>
        </div>
        <nav aria-label={t.brand} className="border-t border-white/10" lang={lang}>
          <ul className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-2">
            {(Object.keys(PATHS) as SafetyPage[]).map((page) => (
              <li key={page} className="shrink-0">
                <Link
                  href={withLang(PATHS[page], lang)}
                  aria-current={page === current ? "page" : undefined}
                  className="block border-b-2 border-transparent px-3 py-3 text-sm text-slate-300 hover:text-white aria-[current=page]:border-blue-300 aria-[current=page]:font-medium aria-[current=page]:text-white"
                >
                  {t.nav[page]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <div role="note" className="border-b border-amber-200 bg-amber-50">
        <div className="mx-auto flex max-w-5xl gap-2 px-4 py-2.5 text-sm text-slate-800">
          <span aria-hidden="true" className="font-semibold text-amber-800">ⓘ</span>
          <div className="space-y-0.5">
            <p lang="en">{REPORT_NOTICE}</p>
            {lang === "hi" ? <p lang="hi">{t.reportNotice}</p> : null}
          </div>
        </div>
      </div>

      <main id="main-content" tabIndex={-1} lang={lang} className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 outline-none sm:py-8">
        {children}
      </main>

      {/* Report Now opens on the 1930 call itself; the bar would repeat it. */}
      {current !== "report" ? (
        <div className="sticky bottom-0 z-10 bg-risk-high text-white shadow-[0_-2px_8px_#0b1b3326]" lang={lang}>
          <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2">
            <span className="text-sm font-medium">{t.alreadyPaid}</span>
            <a
              href="tel:1930"
              className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-risk-high focus-visible:outline-white"
            >
              {t.call1930}
            </a>
            <span className="hidden text-xs text-white/90 sm:inline">{t.helpline}</span>
          </div>
        </div>
      ) : null}

      <Disclaimer />
    </div>
  );
}
