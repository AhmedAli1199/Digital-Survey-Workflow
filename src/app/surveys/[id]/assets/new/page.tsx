import Link from 'next/link';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { AssetTypeConfigRow, SurveyRow } from '@/lib/supabase/types';
import { AssetForm } from '@/components/assets/AssetForm';

export const dynamic = 'force-dynamic';

export default async function NewAssetPage(props: { params: Promise<{ id: string }> }) {
  const { id: surveyId } = await props.params;

  const supabase = createSupabaseAdminClient();

  const { data: survey, error: surveyError } = await supabase
    .from('surveys')
    .select('*')
    .eq('id', surveyId)
    .single();

  if (surveyError) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-950">
        Failed to load survey: {surveyError.message}
      </div>
    );
  }

  const { data: configsData, error: configsError } = await supabase
    .from('asset_type_configs')
    .select('*');

  if (configsError) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-950">
        Failed to load asset types: {configsError.message}
      </div>
    );
  }

  const configs = (configsData ?? []) as AssetTypeConfigRow[];

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-slate-500">Add asset</div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {(survey as SurveyRow).client_name} — {(survey as SurveyRow).site_name}
          </h1>
          <div className="mt-1 text-sm text-slate-600">Asset-level complexity and mandatory capture.</div>
        </div>
        <Link
          href={`/surveys/${surveyId}`}
          className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
        >
          Back
        </Link>
      </div>

      <AssetForm surveyId={surveyId} configs={configs} />
    </div>
  );
}
