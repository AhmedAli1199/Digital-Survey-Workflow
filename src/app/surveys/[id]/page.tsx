import Link from 'next/link';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { AssetRow, SurveyRow } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export default async function SurveyDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  const supabase = createSupabaseAdminClient();

  const { data: survey, error: surveyError } = await supabase
    .from('surveys')
    .select('*')
    .eq('id', id)
    .single();

  if (surveyError) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-950">
        Failed to load survey: {surveyError.message}
      </div>
    );
  }

  const { data: assetsData, error: assetsError } = await supabase
    .from('assets')
    .select('*')
    .eq('survey_id', id)
    .order('created_at', { ascending: true });

  const assets = (assetsData ?? []) as AssetRow[];

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-slate-500">Survey</div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {(survey as SurveyRow).client_name} — {(survey as SurveyRow).site_name}
          </h1>
          <div className="mt-1 text-sm text-slate-600">
            {(survey as SurveyRow).survey_date} · {(survey as SurveyRow).surveyor_name}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/surveys/${id}/assets/new`}
            className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Add asset
          </Link>
          <Link
            href="/surveys"
            className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
          >
            Back
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 md:col-span-2">
          <div className="text-sm font-semibold">Survey header</div>
          <div className="mt-3 grid gap-2 text-sm text-slate-700">
            <div>
              <span className="text-xs font-semibold text-slate-500">Site address:</span>{' '}
              {(survey as SurveyRow).site_address || '—'}
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500">Project reference:</span>{' '}
              {(survey as SurveyRow).project_reference || '—'}
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500">Notes:</span>{' '}
              {(survey as SurveyRow).general_notes || '—'}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="text-sm font-semibold">Progress</div>
          <div className="mt-3 text-3xl font-semibold tracking-tight">{assets.length}</div>
          <div className="text-xs text-slate-500">assets captured</div>
          <div className="mt-3">
            <span className="inline-flex rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-700">
              Status: {(survey as SurveyRow).status}
            </span>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-sm font-semibold">Assets</div>
          <div className="text-xs text-slate-500">Each asset is captured independently</div>
        </div>

        {assetsError ? (
          <div className="px-4 py-6 text-sm text-rose-700">Failed to load assets: {assetsError.message}</div>
        ) : assets.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-600">
            No assets yet. Click “Add asset” to start.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {assets.map((a) => (
              <div key={a.id} className="grid grid-cols-12 items-center gap-2 px-4 py-3 text-sm">
                <div className="col-span-4">
                  <div className="font-medium text-slate-900">{a.asset_tag}</div>
                  <div className="text-xs text-slate-500">{a.asset_type}</div>
                </div>
                <div className="col-span-3 text-slate-700">{a.location_area || '—'}</div>
                <div className="col-span-2 text-slate-700">Qty {a.quantity}</div>
                <div className="col-span-2">
                  <span className="inline-flex rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-700">
                    L{a.complexity_level}
                  </span>
                </div>
                <div className="col-span-1 text-right text-xs text-slate-500">
                  {(a as any).cap_end_required ? 'Cap' : a.obstruction_present ? 'Obs' : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
