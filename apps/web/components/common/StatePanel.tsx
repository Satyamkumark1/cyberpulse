// RULE-frontend.md non-negotiable #3: four states or it is incomplete.
// Degraded renders no numbers (#4) — enforced by callers never passing a
// figure into this panel's children for that state, not by this component.
export type PanelState = "loading" | "empty" | "error" | "degraded";

export interface StatePanelProps {
  state: PanelState;
  title?: string;
  message?: string;
  onRetry?: () => void;
}

const DEFAULTS: Record<PanelState, { title: string; message: string }> = {
  loading: { title: "Loading", message: "Fetching the latest data." },
  empty: { title: "Nothing here yet", message: "No records match the current filters." },
  error: { title: "Something went wrong", message: "The request could not be completed. Retry." },
  degraded: { title: "Prediction service unavailable", message: "Retry." },
};

export function StatePanel({ state, title, message, onRetry }: StatePanelProps) {
  const defaults = DEFAULTS[state];
  return (
    <div role={state === "error" || state === "degraded" ? "alert" : "status"} className="rounded-sm border border-slate-200 bg-slate-50 p-6 text-center">
      {state === "loading" ? (
        <div
          aria-hidden="true"
          className="mx-auto mb-3 h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-sih-blue-600 motion-reduce:animate-none"
        />
      ) : null}
      <p className="text-sm font-semibold text-slate-800">{title ?? defaults.title}</p>
      <p className="mt-1 text-sm text-slate-600">{message ?? defaults.message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-sm border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sih-blue-600"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}
