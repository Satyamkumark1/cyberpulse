"use client"; // mutation with in-flight state (RULE-frontend.md §Server vs client)

import { useState } from "react";
import type { PredictionResponse } from "@cyberpulse/shared/zod/prediction";
import { FactorBar } from "@/components/common/FactorBar";
import { RiskBadge } from "@/components/common/RiskBadge";
import { StatePanel } from "@/components/common/StatePanel";
import { AlertModal } from "@/components/alerts/AlertModal";
import { formatPaise, formatScorePercent, formatWindowIst } from "@/lib/formatters";
import { usePrediction } from "./usePrediction";

interface PredictionPanelProps {
  complaintId: string;
  initialPrediction: PredictionResponse | null;
}

export function PredictionPanel({ complaintId, initialPrediction }: PredictionPanelProps) {
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const mutation = usePrediction(complaintId);

  const prediction = mutation.data ?? initialPrediction;

  return (
    <section aria-labelledby="prediction-heading" className="rounded-sm border border-slate-200 p-4">
      <div className="flex items-center justify-between">
        <h2 id="prediction-heading" className="text-base font-semibold text-slate-800">
          Prediction
        </h2>
        <div className="flex items-center gap-2">
          {prediction && !mutation.isPending ? (
            <button
              type="button"
              onClick={() => setIsAlertModalOpen(true)}
              className="rounded-sm bg-red-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
            >
              Generate Alert
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
export function PredictionSummary({ prediction }: { prediction: PredictionResponse }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <RiskBadge level={prediction.riskLevel} />
        <span className="text-2xl font-semibold text-slate-800">{formatScorePercent(prediction.riskScore)}</span>
        <span className="text-sm text-slate-500">confidence: {prediction.confidence}</span>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-700">Predicted hotspot</h3>
        <p className="text-sm text-slate-600">
          {prediction.predictedLocation.name}, {prediction.predictedLocation.district}, {prediction.predictedLocation.state}
        </p>
        <p className="font-mono text-xs text-slate-400">{prediction.predictedLocation.h3Index}</p>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-700">Expected withdrawal window</h3>
        <p className="text-sm text-slate-600">{formatWindowIst(prediction.expectedWindow.start, prediction.expectedWindow.end)}</p>
        <p className="text-xs text-slate-500">
          Predicted window based on temporal patterns in related transactions and withdrawals.
        </p>
        {prediction.expectedWindow.fallback ? (
          <p className="text-xs text-amber-700">Window widened — low confidence in the exact bin.</p>
        ) : null}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-700">Estimated exposure</h3>
        <p className="text-sm text-slate-600">{formatPaise(prediction.estimatedExposurePaise)}</p>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-700">Ranked hotspots</h3>
        <ol className="mt-1 space-y-1 text-sm text-slate-600">
          {prediction.rankedHotspots.map((h) => (
            <li key={h.h3Index} className="flex items-start justify-between gap-2">
              <span>
                <span className="block">
                  {h.rank}. {h.name}
                </span>
                <span className="block font-mono text-xs text-slate-400">
                  {h.h3Index} · {h.lat.toFixed(5)}, {h.lon.toFixed(5)}
                </span>
              </span>
              <span className="shrink-0 font-mono text-xs text-slate-400">{formatScorePercent(h.score)}</span>
            </li>
          ))}
        </ol>
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
          <p className="mt-1 text-xs text-slate-500">Contributions sum to 100% of the {prediction.riskLevel} risk score.</p>
          <ul className="mt-1 divide-y divide-slate-100">
            {prediction.factors.map((f) => (
              <FactorBar key={f.name} name={f.name} contribution={f.contribution} direction={f.direction} />
            ))}
          </ul>
        </>
      )}
      {prediction.clusteringFallback ? (
        <p className="mt-1 text-xs text-slate-500">Clustering fallback — hotspot ranking used H3 aggregation alone.</p>
      ) : null}
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
