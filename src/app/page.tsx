import Link from "next/link";

export default function Home() {
  return (
    <div className="grid gap-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h1 className="text-xl font-semibold tracking-tight">Survey dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">
          Create a site survey, capture assets, and keep everything structured for CAD and quoting.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/surveys"
            className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            View surveys
          </Link>
          <Link
            href="/surveys/new"
            className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
          >
            New survey
          </Link>
        </div>
      </div>
    </div>
  );
}
