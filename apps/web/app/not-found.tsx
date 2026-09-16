import Link from "next/link";

export default function NotFound() {
  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold text-slate-800">Page not found.</h1>
      <p className="mt-2 text-sm text-slate-600">
        <Link href="/dashboard" className="text-sih-blue-600 underline">
          Return to the dashboard
        </Link>
        .
      </p>
    </div>
  );
}
