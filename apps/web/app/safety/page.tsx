import Link from "next/link";
import { SafetyShell } from "@/components/safety/SafetyShell";
import { ArrowIcon, ClockIcon, PhoneIcon, ReportIcon, ScanIcon, SignalShieldIcon, TrackIcon, VerifyIcon } from "@/components/safety/SafetyIcons";
import { COPY, langFrom, withLang } from "@/lib/safety/copy";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const ACTIONS = [
  { key: "check", href: "/safety/check", label: "Check a message", accent: "bg-[#E9F2F8] text-[#0A5275]", icon: <ScanIcon className="h-6 w-6" /> },
  { key: "verify", href: "/safety/verify", label: "Verify details", accent: "bg-[#E7F4F4] text-[#0E6B73]", icon: <VerifyIcon className="h-6 w-6" /> },
  { key: "report", href: "/safety/report", label: "Get urgent help", accent: "bg-[#FFF0EC] text-[#B33A2B]", icon: <ReportIcon className="h-6 w-6" /> },
  { key: "status", href: "/safety/status", label: "Track progress", accent: "bg-[#F2EEFA] text-[#69509A]", icon: <TrackIcon className="h-6 w-6" /> },
] as const;

export default async function SafetyHomePage({ searchParams }: { searchParams: SearchParams }) {
  const lang = langFrom((await searchParams).lang);
  const t = COPY[lang].home;

  return (
    <SafetyShell lang={lang} current="home">
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,.65fr)] lg:gap-7">
        <div className="min-w-0 space-y-5">
          <section className="relative overflow-hidden rounded-2xl border border-[#164866] bg-[#092B4C] p-5 text-white shadow-[0_10px_30px_rgba(9,43,76,.16)] sm:rounded-[24px] sm:p-7">
            <svg aria-hidden="true" viewBox="0 0 260 220" className="absolute -right-8 -top-4 hidden h-52 w-60 text-white/[.055] sm:block"><path d="M130 16 230 53v72c0 58-39 95-100 119C69 220 30 183 30 125V53Z" fill="currentColor" /><path d="M50 118h42l18-42 35 82 21-40h45" fill="none" stroke="white" strokeOpacity=".16" strokeWidth="7" /></svg>
            <div className="relative">
              <div className="mb-5 flex items-center justify-between gap-4">
                <span className="inline-flex items-center gap-2 rounded-lg border border-[#5CA7A9]/50 bg-[#0E6B73]/50 px-3 py-1.5 text-xs font-bold text-[#D7F5F2]"><span className="h-2 w-2 rounded-full bg-[#F4B942]" />Scam Shield is ready</span>
                <SignalShieldIcon className="h-9 w-9 text-[#BDEBF0]" />
              </div>
              <h1 className="max-w-xl text-[28px] font-extrabold leading-[1.12] tracking-[-.03em] sm:text-4xl">{t.title}</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[#C8DCE8] sm:text-base">{t.lede}</p>
              <Link href={withLang("/safety/check", lang)} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#F4B942] px-5 text-sm font-extrabold text-[#092B4C] shadow-[0_4px_0_#B57D11] transition hover:bg-[#F8C85C] sm:mt-6 sm:w-auto">
                Check before you pay
                <ArrowIcon className="h-4 w-4" />
              </Link>
            </div>
          </section>

          <section aria-labelledby="quick-actions-heading">
            <div className="mb-3 flex items-end justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[.14em] text-[#0E6B73]">Quick actions</p><h2 id="quick-actions-heading" className="mt-1 text-xl font-extrabold tracking-[-.02em] text-[#092B4C]">What do you need help with?</h2></div><span className="hidden text-xs text-slate-500 sm:block">Choose one to begin</span></div>
            <ul className="grid gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
              {ACTIONS.map((action) => <li key={action.key}><Link href={withLang(action.href, lang)} className="group flex min-h-[76px] items-center gap-3 rounded-xl border border-[#D9E2E8] bg-white p-3 shadow-[0_2px_0_#D9E2E8] transition hover:border-[#7CB5B8] sm:h-full sm:min-h-36 sm:flex-col sm:items-start sm:p-4 sm:shadow-[0_3px_0_#D9E2E8]"><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${action.accent}`}>{action.icon}</span><span className="min-w-0 flex-1 sm:mt-1"><span className="block text-sm font-extrabold leading-5 text-[#102B3A]">{t.cards[action.key].title}</span><span className="mt-0.5 block text-xs leading-5 text-slate-500 sm:mt-1">{action.label}</span></span><ArrowIcon className="h-4 w-4 shrink-0 text-slate-400 sm:hidden" /></Link></li>)}
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_18px_rgba(15,23,42,.04)]">
            <div className="flex gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#FFF6DE] text-[#A66C00]"><SignalShieldIcon /></span><div><p className="text-xs font-bold uppercase tracking-[.12em] text-[#A66C00]">Remember</p><p className="mt-1 text-sm font-semibold leading-6 text-slate-800">{t.mule}</p></div></div>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,.05)]">
            <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#0E6B73]">Before you pay</p><h2 className="mt-1 text-lg font-extrabold text-[#092B4C]">Take 30 seconds</h2></div><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#E7F4F4] text-[#0E6B73]"><ClockIcon /></span></div>
            <ol className="mt-5 space-y-4">
              {["Pause. Do not pay while someone is rushing you.", "Verify the caller, link or UPI ID independently.", "Ask someone you trust before sending money."].map((step, index) => <li key={step} className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">{index + 1}</span><span className="pt-0.5 text-sm leading-6 text-slate-600">{step}</span></li>)}
            </ol>
          </section>

          <section className="overflow-hidden rounded-[24px] border border-red-200 bg-gradient-to-br from-red-50 to-orange-50 p-5">
            <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-600 text-white"><PhoneIcon /></span><div><p className="font-bold text-red-950">Already sent money?</p><p className="mt-1 text-sm leading-5 text-red-800">Act quickly. Call the national helpline and contact your bank now.</p></div></div>
            <a href="tel:1930" className="mt-4 flex min-h-12 w-full items-center justify-center rounded-2xl bg-red-600 px-4 text-sm font-bold text-white shadow-sm hover:bg-red-700">Call 1930 now</a>
          </section>
        </aside>
      </div>
    </SafetyShell>
  );
}
