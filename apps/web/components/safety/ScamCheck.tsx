"use client"; // interactivity: scenario choice and answer ticks update the result as the citizen goes

import { useState } from "react";
import Link from "next/link";
import { COPY, withLang, type Lang } from "@/lib/safety/copy";
import {
  ADVISORY_SOURCES,
  SCENARIO_IDS,
  SCENARIOS,
  evaluateAnswers,
  type ScamVerdict,
  type ScenarioId,
} from "@/lib/safety/scamRules";

// Colour AND text AND icon (RULE-frontend #2), same palette as RiskBadge.
const VERDICT_STYLE: Record<ScamVerdict, { box: string; text: string; icon: string }> = {
  STOP: { box: "border-red-200 bg-red-50", text: "text-red-800", icon: "▲" },
  CAUTION: { box: "border-amber-200 bg-amber-50", text: "text-amber-800", icon: "●" },
  NONE: { box: "border-emerald-200 bg-emerald-50", text: "text-emerald-800", icon: "▼" },
};

const noAnswers = () => Object.fromEntries(SCENARIO_IDS.map((id) => [id, [false, false, false, false]])) as Record<ScenarioId, boolean[]>;

/** FEAT-17 Scam Check (FR-26, AC-017-02). A count of the citizen's own ticks
 *  and the reasons behind them — never a score, percentage or probability. */
export function ScamCheck({ lang }: { lang: Lang }) {
  const t = COPY[lang].check;
  const contentLang = lang === "hi" ? "hi" : "en";
  const [scenarioId, setScenarioId] = useState<ScenarioId>("DIGITAL_ARREST");
  const [answers, setAnswers] = useState(noAnswers);
  // A verdict before the first tick would read "no red flags" for questions
  // nobody has answered yet.
  const [touched, setTouched] = useState<ReadonlySet<ScenarioId>>(new Set());

  const scenario = SCENARIOS[scenarioId];
  const ticked = answers[scenarioId]!;
  const matched = scenario.questions.filter((_, i) => ticked[i]);
  const verdict = evaluateAnswers(matched.length);
  const style = VERDICT_STYLE[verdict];
  const sources = [...new Set(matched.map((q) => q.source))];

  const toggle = (index: number, checked: boolean) => {
    setAnswers((prev) => ({ ...prev, [scenarioId]: prev[scenarioId]!.map((v, i) => (i === index ? checked : v)) }));
    setTouched((prev) => new Set(prev).add(scenarioId));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-6">
        <fieldset>
          <legend className="mb-3 text-sm font-semibold text-slate-800">{t.scenarioLegend}</legend>
          <div className="flex flex-wrap gap-2">
            {SCENARIO_IDS.map((id) => (
              <label
                key={id}
                className="cursor-pointer rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 has-[:checked]:border-sih-blue-600 has-[:checked]:bg-sih-blue-600 has-[:checked]:text-white has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-sih-blue-600"
              >
                <input
                  type="radio"
                  name="scenario"
                  value={id}
                  checked={id === scenarioId}
                  onChange={() => setScenarioId(id)}
                  className="sr-only"
                />
                {SCENARIOS[id].name[contentLang]}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-3 text-sm font-semibold text-slate-800">{t.questionsLegend}</legend>
          <div className="space-y-2">
            {scenario.questions.map((q, i) => (
              <label
                key={`${scenarioId}-${i}`}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-800 has-[:checked]:border-red-300 has-[:checked]:bg-red-50"
              >
                <input
                  type="checkbox"
                  checked={ticked[i]}
                  onChange={(e) => toggle(i, e.target.checked)}
                  className="mt-1 h-5 w-5 shrink-0 accent-risk-high"
                />
                <span>{q.text[contentLang]}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <section aria-labelledby="scam-check-result" className="space-y-4">
        <div aria-live="polite" aria-atomic="true">
          {touched.has(scenarioId) ? (
            <div className={`rounded-lg border p-4 ${style.box}`}>
              <h2 id="scam-check-result" className={`flex items-start gap-2 text-base font-semibold ${style.text}`}>
                <span aria-hidden="true">{style.icon}</span>
                {t.verdict[verdict]}
              </h2>
              <p className="mt-1 text-sm text-slate-800">{t.flagCount(matched.length, scenario.questions.length)}</p>
            </div>
          ) : (
            <h2 id="scam-check-result" className="sr-only">
              {t.questionsLegend}
            </h2>
          )}
        </div>

        {touched.has(scenarioId) ? (
          <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-800">
            {matched.length > 0 ? (
              <>
                <div>
                  <h3 className="font-semibold">{t.whyHeading}</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {matched.map((q) => (
                      <li key={q.text.en}>{q.reason[contentLang]}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold">{t.stepsHeading}</h3>
                  <ol className="mt-2 list-decimal space-y-1 pl-5">
                    {scenario.steps.map((step) => (
                      <li key={step.en}>{step[contentLang]}</li>
                    ))}
                  </ol>
                </div>
                <p className="text-xs text-slate-600">
                  {t.sourcesHeading}: {sources.map((s) => ADVISORY_SOURCES[s]).join(" · ")}
                </p>
              </>
            ) : (
              <p>{t.noneNext}</p>
            )}
            <Link href={withLang("/safety/verify", lang)} className="inline-block font-medium text-sih-blue-600 underline">
              {t.verifyLink}
            </Link>
            <p className="rounded-md bg-slate-100 p-3 font-medium">{t.mule}</p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
