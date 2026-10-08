"use client"; // mutation with in-flight state (RULE-frontend.md §Server vs client)

import { useState } from "react";
import type { PredictionResponse } from "@cyberpulse/shared/zod/prediction";
import { FactorBar } from "@/components/common/FactorBar";
import { RiskBadge } from "@/components/common/RiskBadge";
import { StatePanel } from "@/components/common/StatePanel";
import { AlertModal } from "@/components/alerts/AlertModal";
import { formatPaise, formatScorePercent, formatWindowIst } from "@/lib/formatters";
import { HotspotMapLazy } from "./HotspotMapLoader";
import { usePrediction } from "./usePrediction";

interface PredictionPanelProps {
  complaintId: string;
  initialPrediction: PredictionResponse | null;
}

export function PredictionPanel({ complaintId, initialPrediction }: PredictionPanelProps) {
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const mutation = usePrediction(complaintId);

  const prediction = mutation.data ?? initialPrediction;
  const refreshFailedWithOlderResult = Boolean(mutation.isError && initialPrediction && !mutation.data);

  return (
    <section aria-labelledby="prediction-heading" className="rounded-sm border border-slate-200 p-4">
      <div className="flex items-center justify-between">
        <h2 id="prediction-heading" className="text-base font-semibold text-slate-800">
          Prediction
        </h2>
        <div className="flex items-center gap-2">
          {prediction && !mutation.isPending && !refreshFailedWithOlderResult ? (
            <button
              type="button"
              onClick={() => setIsAlertModalOpen(true)}
              className="rounded-sm bg-red-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
            >
              Queue Internal Alert
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => mutation.mutate(true)}
            disabled={mutation.isPending}
            className="rounded-sm bg-sih-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sih-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sih-blue-600 disabled:opacity-50"
          >
            {mutation.isPending ? "Analyzing…" : "Analyze Complaint"}
          </button>
        </div>
      </div>

      <div aria-live="polite" className="mt-4">
        {refreshFailedWithOlderResult ? (
          <div className="mb-3 rounded-sm border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" role="alert">
            Refresh failed. The result below is historical and cannot be used to queue a current alert.
          </div>
        ) : null}
        {mutation.isPending ? (
          <StatePanel state="loading" title="Running prediction" message="Scoring candidate locations." />
        ) : mutation.isError ? (
          <StatePanel state="error" message={mutation.error.message} onRetry={() => mutation.mutate(true)} />
        ) : !prediction ? (
          <StatePanel state="empty" title="Not yet analysed" message="Click Analyze Complaint to run the model." />
        ) : (
          <PredictionResult prediction={prediction} />
        )}
      </div>

      {isAlertModalOpen && prediction && !mutation.isPending ? (
        <AlertModal
          prediction={{
            predictionRef: prediction.predictionRef,
            location: prediction.predictedLocation,
            window: prediction.expectedWindow,
            riskScore: prediction.riskScore,
            riskLevel: prediction.riskLevel,
            estimatedExposurePaise: prediction.estimatedExposurePaise,
            factors: prediction.factors,
          }}
          onClose={() => setIsAlertModalOpen(false)}
        />
      ) : null}
    </section>
  );
}

// Split so /demo's guided steps can reveal "hotspot prediction" and
// "explanation" as separate steps from the same single prediction response,
// rather than issuing a second request for a narrower view (AC-P7-03: step 3
// issues exactly one real POST /api/predict).
export function PredictionSummary({
  prediction,
  showMap = true,
}: {
  prediction: PredictionResponse;
  showMap?: boolean;
}) {
  const [selectedH3, setSelectedH3] = useState<string | null>(
    prediction.predictedLocation.h3Index
  );

  return (
    <div className="space-y-5">
      {/* ── Top Metric Overview ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50/70 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <RiskBadge level={prediction.riskLevel} />
          <span className="text-2xl font-bold tracking-tight text-slate-800">
            {formatScorePercent(prediction.riskScore)}
          </span>
          <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-xs font-medium text-slate-700">
            confidence: {prediction.confidence}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-sm">
          <div>
            <span className="block text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Estimated exposure
            </span>
            <span className="font-semibold text-slate-800">
              {formatPaise(prediction.estimatedExposurePaise)}
            </span>
          </div>

          <div>
            <span className="block text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Withdrawal window
            </span>
            <span className="font-semibold text-slate-800">
              {formatWindowIst(prediction.expectedWindow.start, prediction.expectedWindow.end)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Main Hotspot Grid: Details & Map ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Left Column (5 cols): Hotspot info & Ranked List */}
        <div className="space-y-4 lg:col-span-5">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Predicted Hotspot
              </h3>
              <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                Primary
              </span>
            </div>
            <p className="mt-1 text-base font-semibold text-slate-800">
              {prediction.predictedLocation.name}
            </p>
            <p className="text-xs text-slate-600">
              {prediction.predictedLocation.district}, {prediction.predictedLocation.state}
            </p>
            <p className="mt-1 font-mono text-xs text-slate-400">
              {prediction.predictedLocation.h3Index}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between pb-1.5">
              <h3 className="text-sm font-semibold text-slate-700">Ranked hotspots</h3>
              <span className="text-[11px] text-slate-400">Select to focus map</span>
            </div>
            <ol className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white shadow-xs">
              {prediction.rankedHotspots.map((h) => {
                const isSelected = (selectedH3 ?? prediction.predictedLocation.h3Index) === h.h3Index;
                return (
                  <li key={h.h3Index}>
                    <button
                    type="button"
                    onClick={() => setSelectedH3(h.h3Index)}
                    aria-pressed={isSelected}
                    className={`flex w-full items-start justify-between gap-2 p-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-blue-600 ${
                      isSelected
                        ? "border-l-4 border-blue-600 bg-blue-50/60"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <span>
                      <span className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                            isSelected
                              ? "bg-blue-600 text-white"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {h.rank}
                        </span>
                        {h.name}
                      </span>
                      <span className="block pl-6 font-mono text-xs text-slate-400">
                        {h.h3Index} · {h.lat.toFixed(5)}, {h.lon.toFixed(5)}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="font-mono text-xs font-semibold text-slate-700">
                        {formatScorePercent(h.score)}
                      </span>
                      <span className="block text-[10px] text-slate-400">
                        {h.likelyAtms} ATMs
                      </span>
                    </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-700">Expected withdrawal window</h3>
            <p className="text-sm text-slate-600">
              {formatWindowIst(prediction.expectedWindow.start, prediction.expectedWindow.end)}
            </p>
            <p className="text-xs text-slate-500">
              Predicted window based on temporal patterns in related transactions and withdrawals.
            </p>
            {prediction.expectedWindow.fallback ? (
              <p className="mt-1 text-xs text-amber-700">Window widened — low confidence in the exact bin.</p>
            ) : null}
          </div>
        </div>

        {/* Right Column (7 cols): Interactive Hotspot Map */}
        {showMap && (
          <div className="lg:col-span-7">
            <HotspotMapLazy
              prediction={prediction}
              selectedH3={selectedH3}
              onSelectHotspot={(h3) => setSelectedH3(h3)}
              heightPx={460}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function PredictionFactors({ prediction }: { prediction: PredictionResponse }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-700">Factors</h3>
      {!prediction.explanationAvailable ? (
        <p className="text-sm text-slate-600">Explanation could not be generated for this prediction.</p>
      ) : (
        <>
          <p className="mt-1 text-xs text-slate-500">Relative SHAP contributions to the underlying classifier output; they do not decompose the blended ranking score.</p>
          <ul className="mt-1 divide-y divide-slate-100">
            {prediction.factors.map((f) => (
              <FactorBar key={f.name} name={f.name} contribution={f.contribution} direction={f.direction} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function PredictionResult({ prediction }: { prediction: PredictionResponse }) {
  return (
    <div className="space-y-4">
      <PredictionSummary prediction={prediction} />
      <PredictionFactors prediction={prediction} />
    </div>
  );
}
