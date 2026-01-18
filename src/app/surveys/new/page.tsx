import Link from 'next/link';
import { createSurvey } from '@/app/actions/surveys';

export const dynamic = 'force-dynamic';

export default function NewSurveyPage() {
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">New survey</h1>
          <p className="mt-1 text-sm text-slate-600">Survey header fields for one site visit.</p>
        </div>
        <Link
          href="/surveys"
          className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
        >
          Back
        </Link>
      </div>

      <form action={createSurvey} className="grid gap-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-600">Client name *</label>
              <input
                name="client_name"
                required
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                placeholder="e.g., ABC Refinery"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Site name *</label>
              <input
                name="site_name"
                required
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                placeholder="e.g., Unit 3 Boiler House"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-600">Site address</label>
              <input
                name="site_address"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                placeholder="Street, city, postcode"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600">Survey date *</label>
              <input
                name="survey_date"
                required
                type="date"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Surveyor name *</label>
              <input
                name="surveyor_name"
                required
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                placeholder="e.g., John Smith"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600">Project reference</label>
              <input
                name="project_reference"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                placeholder="e.g., PRJ-2026-001"
              />
            </div>
            <div />

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-600">General notes</label>
              <textarea
                name="general_notes"
                className="mt-1 min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                placeholder="Access notes, hazards, general comments..."
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Create survey
          </button>
          <Link
            href="/surveys"
            className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
