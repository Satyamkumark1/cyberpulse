import { CITIZEN_STAGES, type CitizenStage } from "@cyberpulse/shared/enums";
import { COPY, type Lang } from "@/lib/safety/copy";

/** FEAT-17 status progress. Renders the stage the API returned and nothing
 *  else — no score, hotspot, window or amount exists on this path (AC-017-08).
 *  Colour AND icon AND text for every state (RULE-frontend #2). */
export function StatusTimeline({ lang, stage }: { lang: Lang; stage: CitizenStage }) {
  const t = COPY[lang].status;
  const currentIndex = CITIZEN_STAGES.indexOf(stage);

  return (
    <ol className="space-y-0" data-testid="citizen-stage-timeline">
      {CITIZEN_STAGES.map((s, i) => {
        const state = i < currentIndex ? "done" : i === currentIndex ? "current" : "pending";
        return (
          <li key={s} className="relative flex gap-3 pb-5 last:pb-0" aria-current={state === "current" ? "step" : undefined}>
            {i < CITIZEN_STAGES.length - 1 ? (
              <span aria-hidden="true" className="absolute left-[11px] top-7 h-[calc(100%-1.75rem)] w-0.5 bg-slate-200" />
            ) : null}
            <span
              aria-hidden="true"
              className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${
                state === "done"
                  ? "border-teal-600 bg-teal-600 text-white"
                  : state === "current"
                    ? "border-sih-blue-600 bg-sih-blue-100 text-sih-blue-600"
                    : "border-slate-400 bg-white text-slate-400"
              }`}
            >
              {state === "done" ? "✓" : state === "current" ? "●" : "○"}
            </span>
            <span className={`pt-0.5 text-sm ${state === "current" ? "font-semibold text-slate-800" : state === "done" ? "text-slate-800" : "text-slate-600"}`}>
              {t.stages[s]}
              {state !== "pending" ? <span className="sr-only"> ({state === "done" ? t.done : t.current})</span> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
