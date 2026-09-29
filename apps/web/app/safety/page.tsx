import Link from "next/link";
import { SafetyShell } from "@/components/safety/SafetyShell";
import { COPY, langFrom, withLang } from "@/lib/safety/copy";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const CARDS = [
  { key: "check", href: "/safety/check", icon: "?", tone: "border-slate-200 bg-white" },
  { key: "verify", href: "/safety/verify", icon: "✓", tone: "border-slate-200 bg-white" },
  { key: "report", href: "/safety/report", icon: "!", tone: "border-red-200 bg-red-50" },
  { key: "status", href: "/safety/status", icon: "→", tone: "border-slate-200 bg-white" },
] as const;

// FEAT-17 home. Server Component: static copy and links only.
export default async function SafetyHomePage({ searchParams }: { searchParams: SearchParams }) {
  const lang = langFrom((await searchParams).lang);
  const t = COPY[lang].home;

  return (
    <SafetyShell lang={lang} current="home">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-800 sm:text-3xl">{t.title}</h1>
      <p className="mt-2 max-w-prose text-slate-600">{t.lede}</p>

      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {CARDS.map((card) => (
          <li key={card.key}>
            <Link
              href={withLang(card.href, lang)}
              className={`flex h-full items-start gap-4 rounded-lg border p-4 hover:border-sih-blue-600 ${card.tone}`}
            >
              <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-900 text-lg font-semibold text-white"
              >
                {card.icon}
              </span>
              <span>
                <span className="block font-semibold text-slate-800">{t.cards[card.key].title}</span>
                <span className="mt-1 block text-sm text-slate-600">{t.cards[card.key].body}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-6 rounded-lg bg-slate-100 p-4 text-sm font-medium text-slate-800">{t.mule}</p>
    </SafetyShell>
  );
}
