import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { AssetForm } from '@/components/assets/AssetForm';
import type { AssetTypeConfigRow, SurveyRow } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export default async function EditAssetPage({
  params,
}: {
  params: Promise<{ id: string; assetId: string }>;
}) {
  const { id: surveyId, assetId } = await params;
  const supabase = createSupabaseAdminClient();

  // Fetch survey
  const { data: survey, error: surveyError } = await supabase
    .from('surveys')
    .select('*')
    .eq('id', surveyId)
    .single();

  if (surveyError) return <div>Error loading survey: {surveyError.message}</div>;

  // Fetch configs
  const { data: configsData } = await supabase.from('asset_type_configs').select('*');
  const configs = (configsData ?? []) as AssetTypeConfigRow[];

  // Fetch asset with related data
  const { data: asset, error: assetError } = await supabase
    .from('assets')
    .select('*, measurements(*), photos(*)')
    .eq('id', assetId)
    .single();

  if (assetError || !asset) return notFound();

  return (
    <div className="grid gap-6">
       <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-slate-500">Edit asset</div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {(survey as SurveyRow).client_name} — {(survey as SurveyRow).site_name}
          </h1>
          <div className="mt-1 text-sm text-slate-600">Editing asset {asset.asset_tag}</div>
        </div>
        <Link
          href={`/surveys/${surveyId}`}
          className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
        >
          Cancel
        </Link>
      </div>

      <AssetForm 
        surveyId={surveyId} 
        configs={configs} 
        initialData={asset as any} 
      />
    </div>
  );
}
