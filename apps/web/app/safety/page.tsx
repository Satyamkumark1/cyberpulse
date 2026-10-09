import Link from "next/link";
import { SafetyShell } from "@/components/safety/SafetyShell";
import { COPY, langFrom, withLang } from "@/lib/safety/copy";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const ACTIONS = [
  { key: "check", href: "/safety/check", label: "Check a message", accent: "bg-blue-50 text-blue-700", icon: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4M8.5 11l1.7 1.7 3.5-4" /></> },
  { key: "verify", href: "/safety/verify", label: "Verify details", accent: "bg-emerald-50 text-emerald-700", icon: <><path d="M12 3 5 6v5c0 5 2.9 8.2 7 10 4.1-1.8 7-5 7-10V6Z" /><path d="m9 12 2 2 4-4" /></> },
  { key: "report", href: "/safety/report", label: "Get urgent help", accent: "bg-red-50 text-red-700", icon: <><path d="M12 8v5M12 17h.01" /><path d="M10.3 3.7 2.8 17a2 2 0 0 0 1.8 3h14.8a2 2 0 0 0 1.8-3L13.7 3.7a2 2 0 0 0-3.4 0Z" /></> },
  { key: "status", href: "/safety/status", label: "Track progress", accent: "bg-violet-50 text-violet-700", icon: <><path d="M5 5h14v14H5z" /><path d="m8 12 2.5 2.5L16 9" /></> },
] as const;

export default async function SafetyHomePage({ searchParams }: { searchParams: SearchParams }) {
  const lang = langFrom((await searchParams).lang);
  const t = COPY[lang].home;

  return (
    <SafetyShell lang={lang} current="home">
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,.65fr)] lg:gap-7">
        <div className="min-w-0 space-y-5">
          <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#0b2760] via-[#123f88] to-[#087da1] p-5 text-white shadow-[0_18px_50px_rgba(15,62,130,.22)] sm:p-7">
            <div aria-hidden="true" className="absolute -right-16 -top-20 h-56 w-56 rounded-full border-[36px] border-white/5" />
            <div aria-hidden="true" className="absolute -bottom-24 right-16 h-52 w-52 rounded-full bg-cyan-300/10 blur-2xl" />
            <div className="relative">
              <div className="mb-5 flex items-center justify-between gap-4">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1.5 text-xs font-bold text-emerald-100"><span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_0_4px_rgba(110,231,183,.15)]" />Scam Shield is ready</span>
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-9 w-9 text-white/70"><path d="M12 3 5 6v5c0 5 2.9 8.2 7 10 4.1-1.8 7-5 7-10V6Z" /><path d="m9 12 2 2 4-4" /></svg>
              </div>
              <h1 className="max-w-xl text-2xl font-bold leading-tight tracking-tight sm:text-4xl">{t.title}</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-blue-100 sm:text-base">{t.lede}</p>
              <Link href={withLang("/safety/check", lang)} className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-bold text-blue-800 shadow-lg shadow-blue-950/15 transition hover:bg-blue-50">
                Check before you pay
                <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="M4 10h12m-5-5 5 5-5 5" /></svg>
              </Link>
            </div>
          </section>

          <section aria-labelledby="quick-actions-heading">
            <div className="mb-3 flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-blue-700">Quick actions</p><h2 id="quick-actions-heading" className="mt-1 text-xl font-bold tracking-tight text-slate-950">What do you need help with?</h2></div><span className="hidden text-xs text-slate-500 sm:block">Choose one to begin</span></div>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {ACTIONS.map((action) => <li key={action.key}><Link href={withLang(action.href, lang)} className="group flex h-full min-h-36 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_4px_18px_rgba(15,23,42,.04)] transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg"><span className={`grid h-11 w-11 place-items-center rounded-2xl ${action.accent}`}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">{action.icon}</svg></span><span className="mt-4 block text-sm font-bold leading-5 text-slate-950">{t.cards[action.key].title}</span><span className="mt-1 hidden text-xs leading-5 text-slate-500 sm:block">{action.label}</span></Link></li>)}
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_18px_rgba(15,23,42,.04)]">
            <div className="flex gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-700"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><path d="M12 3 4 7v5c0 4.7 3.1 7.6 8 9 4.9-1.4 8-4.3 8-9V7Z" /><path d="M12 8v5m0 3h.01" /></svg></span><div><p className="text-xs font-bold uppercase tracking-[.12em] text-amber-700">Remember</p><p className="mt-1 text-sm font-semibold leading-6 text-slate-800">{t.mule}</p></div></div>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,.05)]">
            <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-emerald-700">Before you pay</p><h2 className="mt-1 text-lg font-bold text-slate-950">Take 30 seconds</h2></div><span className="grid h-10 w-10 place-items-center rounded-full bg-emerald-50 text-emerald-700"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><path d="M12 7v5l3 2" /><circle cx="12" cy="12" r="9" /></svg></span></div>
            <ol className="mt-5 space-y-4">
              {["Pause. Do not pay while someone is rushing you.", "Verify the caller, link or UPI ID independently.", "Ask someone you trust before sending money."].map((step, index) => <li key={step} className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">{index + 1}</span><span className="pt-0.5 text-sm leading-6 text-slate-600">{step}</span></li>)}
            </ol>
          </section>

          <section className="overflow-hidden rounded-[24px] border border-red-200 bg-gradient-to-br from-red-50 to-orange-50 p-5">
            <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-red-600 text-white"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M5 4h4l2 5-2.5 1.5a14 14 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2C9.7 21 3 14.3 3 6a2 2 0 0 1 2-2Z" /></svg></span><div><p className="font-bold text-red-950">Already sent money?</p><p className="mt-1 text-sm leading-5 text-red-800">Act quickly. Call the national helpline and contact your bank now.</p></div></div>
            <a href="tel:1930" className="mt-4 flex min-h-12 w-full items-center justify-center rounded-2xl bg-red-600 px-4 text-sm font-bold text-white shadow-sm hover:bg-red-700">Call 1930 now</a>
          </section>
        </aside>
      </div>
    </SafetyShell>
  );
}
