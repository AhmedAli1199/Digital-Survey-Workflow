import Link from 'next/link';
import { EnvNotice } from '@/components/EnvNotice';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { SurveyRow } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export default async function SurveysPage() {
  let surveys: SurveyRow[] = [];
  let errorMessage: string | null = null;

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from('surveys')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    surveys = (data ?? []) as SurveyRow[];
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : 'Failed to load surveys';
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Surveys</h1>
          <p className="mt-1 text-sm text-slate-600">One survey = one site visit.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/templates"
            className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
          >
            Template admin
          </Link>
          <Link
            href="/surveys/new"
            className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            New survey
          </Link>
        </div>
      </div>

      <EnvNotice />

      {errorMessage ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-950">
          {errorMessage}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="grid grid-cols-12 gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600">
          <div className="col-span-4">Client / Site</div>
          <div className="col-span-3">Surveyor</div>
          <div className="col-span-2">Date</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-1 text-right">Open</div>
        </div>

        {surveys.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-600">
            No surveys yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {surveys.map((s) => (
              <div key={s.id} className="grid grid-cols-12 items-center gap-2 px-4 py-3 text-sm">
                <div className="col-span-4">
                  <div className="font-medium text-slate-900">{s.client_name}</div>
                  <div className="text-xs text-slate-500">{s.site_name}</div>
                </div>
                <div className="col-span-3 text-slate-700">{s.surveyor_name}</div>
                <div className="col-span-2 text-slate-700">{s.survey_date}</div>
                <div className="col-span-2">
                  <span className="inline-flex rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-700">
                    {s.status}
                  </span>
                </div>
                <div className="col-span-1 text-right">
                  <Link
                    href={`/surveys/${s.id}`}
                    className="text-sm font-medium text-slate-900 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-900"
                  >
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="text-xs text-slate-500">
        Placeholder asset types live in <span className="font-mono">supabase/seed.sql</span> and are safe to delete later.
      </div>
    </div>
  );
}
