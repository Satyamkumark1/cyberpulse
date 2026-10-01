"use client"; // mutation with in-flight state across a three-step flow

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { CITIZEN_AMOUNT_MAX_PAISE, CITIZEN_AMOUNT_MIN_PAISE } from "@cyberpulse/shared/constants";
import { FRAUD_TYPES, type FraudType } from "@cyberpulse/shared/enums";
import type { CitizenReportResponse } from "@cyberpulse/shared/citizen";
import { COPY, withLang, type Lang } from "@/lib/safety/copy";
import { saveLastReport } from "@/lib/safety/lastReport";
import { submitReport } from "./citizenApi";
import { ApiError } from "@/lib/apiFetch";

type Step = 1 | 2 | 3;
type Field = "fraudType" | "amount" | "city";

/** Whole rupees → integer paise (ADR-018). Commas, spaces and ₹ are tolerated. */
function parseAmountPaise(raw: string): number | null {
  const cleaned = raw.replace(/[,\s₹]/g, "");
  if (!/^\d+$/.test(cleaned)) return null;
  const paise = Number(cleaned) * 100;
  return paise >= CITIZEN_AMOUNT_MIN_PAISE && paise <= CITIZEN_AMOUNT_MAX_PAISE ? paise : null;
}

/**
 * FEAT-17 Report Now (FR-28, AC-017-05). Step 1 gets the citizen to 1930 before
 * anything else. Step 2 asks three questions and nothing personal. Step 3 shows
 * the complaint ID and tracking code exactly as the API returned them.
 */
export function ReportNow({ lang, cities }: { lang: Lang; cities: readonly string[] }) {
  const t = COPY[lang].report;
  const [step, setStep] = useState<Step>(1);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [result, setResult] = useState<CitizenReportResponse | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  // Move focus to the new step's heading so keyboard and screen-reader users
  // land on it — but never steal focus on first load.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  const mutation = useMutation({
    mutationFn: submitReport,
    retry: false,
    onSuccess: (data) => {
      saveLastReport({ complaintId: data.complaintId, trackingCode: data.trackingCode });
      setResult(data);
      setStep(3);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === "VALIDATION_ERROR" && error.field === "city") {
        setErrors({ city: t.errors.city });
      }
    },
  });

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const fraudType = String(form.get("fraudType") ?? "");
    const amountPaise = parseAmountPaise(String(form.get("amount") ?? ""));
    const city = String(form.get("city") ?? "");

    const next: Partial<Record<Field, string>> = {};
    if (!(FRAUD_TYPES as readonly string[]).includes(fraudType)) next.fraudType = t.errors.fraudType;
    if (amountPaise === null) next.amount = t.errors.amount;
    if (!city) next.city = t.errors.city;
    setErrors(next);

    const firstInvalid = (["fraudType", "amount", "city"] as const).find((f) => next[f]);
    if (firstInvalid) {
      document.getElementById(`report-${firstInvalid}`)?.focus();
      return;
    }
    mutation.mutate({ fraudType: fraudType as FraudType, amountPaise: amountPaise!, city });
  };

  const serverError =
    mutation.error instanceof ApiError && mutation.error.code === "RATE_LIMITED"
      ? t.errors.rateLimited
      : mutation.isError && !errors.city
        ? t.errors.generic
        : null;

  const copyCode = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.trackingCode);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  };

  const fieldProps = (field: Field) => ({
    id: `report-${field}`,
    name: field,
    "aria-invalid": errors[field] ? true : undefined,
    "aria-describedby": `report-${field}-hint${errors[field] ? ` report-${field}-error` : ""}`,
  });

  const fieldError = (field: Field) =>
    errors[field] ? (
      <p id={`report-${field}-error`} className="text-sm font-medium text-red-800">
        <span aria-hidden="true">▲ </span>
        {errors[field]}
      </p>
    ) : null;

  return (
    <div className="space-y-6">
      <ol className="flex flex-wrap gap-2 text-sm" aria-label={t.stepOf(step, 3)}>
        {t.stepNames.map((name, i) => (
          <li
            key={name}
            aria-current={i + 1 === step ? "step" : undefined}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-600 aria-[current=step]:border-teal-600 aria-[current=step]:bg-teal-100 aria-[current=step]:font-semibold aria-[current=step]:text-slate-800"
          >
            {i + 1}. {name}
          </li>
        ))}
      </ol>

      {step === 1 ? (
        <section className="space-y-5">
          <div className="rounded-lg bg-risk-high p-5 text-white">
            <h2 ref={headingRef} tabIndex={-1} className="text-lg font-semibold outline-none">
              {t.callHeading}
            </h2>
            <a
              href="tel:1930"
              className="mt-2 inline-block rounded-md font-mono text-5xl font-semibold tracking-wider focus-visible:outline-white"
            >
              1930
            </a>
            <p className="mt-2 max-w-prose text-sm text-white/95">{t.callWhy}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-800">{t.checklistHeading}</h3>
            <ul className="mt-2 space-y-2 text-sm text-slate-800">
              {t.checklist.map((item) => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden="true" className="text-teal-600">
                    ☐
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <button
            type="button"
            onClick={() => setStep(2)}
            className="min-h-11 rounded-md bg-sih-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sih-blue-500"
          >
            {t.continue}
          </button>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="max-w-xl space-y-4">
          <h2 ref={headingRef} tabIndex={-1} className="text-lg font-semibold text-slate-800 outline-none">
            {t.stepNames[1]}
          </h2>
          <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">
            <span aria-hidden="true">✓ </span>
            {t.formIntro}
          </p>
          <form noValidate onSubmit={onSubmit} className="space-y-5 rounded-lg border border-slate-200 bg-white p-4">
            <div className="space-y-1">
              <label htmlFor="report-fraudType" className="block text-sm font-semibold text-slate-800">
                {t.fraudType.label}
              </label>
              <p id="report-fraudType-hint" className="text-xs text-slate-600">
                {t.fraudType.hint}
              </p>
              <select
                {...fieldProps("fraudType")}
                defaultValue=""
                className="min-h-11 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800"
              >
                <option value="" disabled>
                  {t.fraudType.placeholder}
                </option>
                {FRAUD_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t.fraudTypes[type]}
                  </option>
                ))}
              </select>
              {fieldError("fraudType")}
            </div>

            <div className="space-y-1">
              <label htmlFor="report-amount" className="block text-sm font-semibold text-slate-800">
                {t.amount.label}
              </label>
              <p id="report-amount-hint" className="text-xs text-slate-600">
                {t.amount.hint}
              </p>
              <div className="flex items-center rounded-md border border-slate-200 bg-slate-50">
                <span aria-hidden="true" className="px-3 text-sm text-slate-600">
                  ₹
                </span>
                <input
                  {...fieldProps("amount")}
                  inputMode="numeric"
                  autoComplete="off"
                  className="min-h-11 w-full rounded-r-md bg-transparent py-2 pr-3 font-mono text-sm text-slate-800"
                />
              </div>
              {fieldError("amount")}
            </div>

            <div className="space-y-1">
              <label htmlFor="report-city" className="block text-sm font-semibold text-slate-800">
                {t.city.label}
              </label>
              <p id="report-city-hint" className="text-xs text-slate-600">
                {t.city.hint}
              </p>
              <select
                {...fieldProps("city")}
                defaultValue=""
                className="min-h-11 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800"
              >
                <option value="" disabled>
                  {t.city.placeholder}
                </option>
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
              {fieldError("city")}
            </div>

            <div role="alert">
              {serverError ? (
                <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">
                  <span aria-hidden="true">▲ </span>
                  {serverError}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="min-h-11 rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100"
              >
                {t.back}
              </button>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="min-h-11 rounded-md bg-sih-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-sih-blue-500 disabled:opacity-60"
              >
                {mutation.isPending ? t.submitting : t.submit}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {step === 3 && result ? (
        <section className="max-w-xl space-y-4">
          <h2 ref={headingRef} tabIndex={-1} className="text-lg font-semibold text-slate-800 outline-none">
            <span aria-hidden="true" className="text-emerald-800">
              ✓{" "}
            </span>
            {t.done.heading}
          </h2>
          <dl className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-600">{t.done.idLabel}</dt>
              <dd className="mt-1 font-mono text-lg font-semibold text-slate-800">{result.complaintId}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-600">{t.done.codeLabel}</dt>
              <dd className="mt-1 select-all break-all font-mono text-lg font-semibold text-slate-800">{result.trackingCode}</dd>
            </div>
          </dl>
          <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-slate-800">
            <span aria-hidden="true" className="text-amber-800">
              ●{" "}
            </span>
            {t.done.saveWarning}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void copyCode()}
              className="min-h-11 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100"
            >
              {t.done.copy}
            </button>
            <span role="status" className="text-sm text-slate-600">
              {copyState === "copied" ? t.done.copied : copyState === "failed" ? t.done.copyFailed : ""}
            </span>
            <Link
              href={withLang(`/safety/status?id=${encodeURIComponent(result.complaintId)}`, lang)}
              className="min-h-11 rounded-md bg-sih-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sih-blue-500"
            >
              {t.done.track}
            </Link>
          </div>
          <p className="text-sm text-slate-600">{t.done.stillCall}</p>
        </section>
      ) : null}
    </div>
  );
}
