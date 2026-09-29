"use client"; // interactivity: each check runs on the citizen's own input, in the browser

import { useId, useState, type FormEvent } from "react";
import { COPY, type Lang } from "@/lib/safety/copy";
import { checkCaller, checkLink, checkUpi, type CheckLevel, type CheckResult } from "@/lib/safety/verifyChecks";

const LEVEL_STYLE: Record<CheckLevel, { box: string; text: string; icon: string }> = {
  PASS: { box: "border-emerald-200 bg-emerald-50", text: "text-emerald-800", icon: "▼" },
  CAUTION: { box: "border-amber-200 bg-amber-50", text: "text-amber-800", icon: "●" },
  WARNING: { box: "border-red-200 bg-red-50", text: "text-red-800", icon: "▲" },
};

interface CheckFormProps<R extends string> {
  lang: Lang;
  label: string;
  hint: string;
  button: string;
  inputMode: "url" | "tel" | "email";
  check: (value: string) => CheckResult<R> | null;
  reasons: Record<R, string>;
}

function CheckForm<R extends string>({ lang, label, hint, button, inputMode, check, reasons }: CheckFormProps<R>) {
  const id = useId();
  const [value, setValue] = useState("");
  // The value the result was computed for. Editing the field hides the old
  // result instead of leaving a stale verdict beside a different value.
  const [checked, setChecked] = useState<string | null>(null);
  const result = checked !== null && checked === value ? check(value) : null;
  const t = COPY[lang].verify;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setChecked(value);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-2 rounded-lg border border-slate-200 bg-white p-4">
      <label htmlFor={`${id}-input`} className="block text-sm font-semibold text-slate-800">
        {label}
      </label>
      <p id={`${id}-hint`} className="text-xs text-slate-600">
        {hint}
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={`${id}-input`}
          aria-describedby={`${id}-hint`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          inputMode={inputMode}
          autoComplete="off"
          spellCheck={false}
          className="min-h-11 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-800"
        />
        <button
          type="submit"
          className="min-h-11 shrink-0 rounded-md bg-sih-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sih-blue-500"
        >
          {button}
        </button>
      </div>
      <div role="status" aria-live="polite">
        {result ? (
          <div className={`flex items-start gap-2 rounded-md border p-3 text-sm ${LEVEL_STYLE[result.level].box}`}>
            <span aria-hidden="true" className={LEVEL_STYLE[result.level].text}>
              {LEVEL_STYLE[result.level].icon}
            </span>
            <p className="text-slate-800">
              <strong className={LEVEL_STYLE[result.level].text}>{t.level[result.level]}.</strong> {reasons[result.reason]}
            </p>
          </div>
        ) : null}
      </div>
    </form>
  );
}

/** FEAT-17 Verify Before You Pay (FR-27, AC-017-04). Nothing typed here is
 *  sent anywhere: the checks are pure functions in lib/safety/verifyChecks. */
export function VerifyChecks({ lang }: { lang: Lang }) {
  const t = COPY[lang].verify;
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">{t.privacy}</p>
      <CheckForm lang={lang} {...t.link} inputMode="url" check={checkLink} reasons={t.linkReason} />
      <CheckForm lang={lang} {...t.caller} inputMode="tel" check={checkCaller} reasons={t.callerReason} />
      <CheckForm lang={lang} {...t.upi} inputMode="email" check={checkUpi} reasons={t.upiReason} />

      <section aria-labelledby="verify-report-heading" className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
        <h2 id="verify-report-heading" className="font-semibold text-slate-800">
          {t.reportHeading}
        </h2>
        <ul className="mt-2 space-y-2">
          <li>
            <a href="https://sancharsaathi.gov.in/sfc/" target="_blank" rel="noopener noreferrer" className="text-sih-blue-600 underline">
              {t.chakshu}
            </a>
          </li>
          <li>
            <a
              href="https://siportal.sebi.gov.in/intermediary/sebi-check"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sih-blue-600 underline"
            >
              {t.sebiCheck}
            </a>
          </li>
          <li>
            <a href="https://sachet.rbi.org.in" target="_blank" rel="noopener noreferrer" className="text-sih-blue-600 underline">
              {t.sachet}
            </a>
          </li>
        </ul>
      </section>
    </div>
  );
}
