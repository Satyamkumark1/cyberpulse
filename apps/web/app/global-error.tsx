"use client"; // Next.js requires error boundaries to be Client Components.

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-800">
        <div className="p-6">
          <h1 className="text-lg font-semibold">The application failed to load.</h1>
          <p className="mt-2 text-sm text-slate-600">Retry.</p>
          <button
            type="button"
            onClick={reset}
            className="mt-4 rounded-sm bg-sih-blue-600 px-3 py-2 text-sm font-medium text-white"
          >
            Retry
          </button>
        </div>
      </body>
    </html>
  );
}
