"use client"; // Next.js requires error boundaries to be Client Components.

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold text-slate-800">Something failed to load.</h1>
      <p className="mt-2 text-sm text-slate-600">Retry, or return to the dashboard.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-sm bg-sih-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-sih-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sih-blue-600"
      >
        Retry
      </button>
    </div>
  );
}
