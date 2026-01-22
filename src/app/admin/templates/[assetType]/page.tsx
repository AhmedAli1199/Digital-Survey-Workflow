import Link from 'next/link';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { AssetTypeConfigRow } from '@/lib/supabase/types';
import { updateAssetTemplate } from '@/app/actions/templates';
import { StepsEditor, type TemplateStep } from '@/components/admin/StepsEditor';

export const dynamic = 'force-dynamic';

export default async function TemplateAdminEdit(props: { params: Promise<{ assetType: string }> }) {
  const { assetType } = await props.params;

  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from('asset_type_configs')
    .select('*')
    .eq('asset_type', assetType)
    .single();

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-950">
        Failed to load template: {error.message}
      </div>
    );
  }

  const cfg = data as AssetTypeConfigRow;
  const level2Steps: TemplateStep[] = Array.isArray((cfg as any).level2_template?.steps)
    ? (cfg as any).level2_template.steps
    : [];
  const drawingUrl = (cfg as any).level2_template?.drawing_url as string | undefined;
  const drawingImageUrl = (cfg as any).level2_template?.drawing_image_url as string | undefined;
  const tableRegion = ((cfg as any).level2_template?.table_region ?? null) as any;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-slate-500">Template</div>
          <h1 className="text-2xl font-semibold tracking-tight">{cfg.display_name}</h1>
          <div className="mt-1 text-sm text-slate-600">{cfg.asset_type}</div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/templates"
            className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
          >
            Back
          </Link>
          <Link
            href="/surveys"
            className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
          >
            Surveys
          </Link>
        </div>
      </div>

      <form action={updateAssetTemplate} className="grid gap-6">
        <input type="hidden" name="asset_type" value={cfg.asset_type} />

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="text-sm font-semibold tracking-tight">Basic settings</div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-600">Display name *</label>
              <input
                name="display_name"
                defaultValue={cfg.display_name}
                required
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600">Minimum complexity *</label>
              <select
                name="min_complexity_level"
                defaultValue={String(cfg.min_complexity_level)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
              >
                <option value="1">Level 1</option>
                <option value="2">Level 2</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-600">Level 1 measurement keys (comma-separated)</label>
              <input
                name="level1_measurement_keys"
                defaultValue={(cfg.level1_measurement_keys ?? []).join(', ')}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                placeholder="length_mm, max_diameter_mm, flange_od_mm, pipe_dn"
              />
              <div className="mt-1 text-xs text-slate-500">
                Used when complexity is Level 1. Keys must match your measurement catalog.
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-600">Required photo types (comma-separated)</label>
              <input
                name="required_photo_types"
                defaultValue={(cfg.required_photo_types ?? []).join(', ')}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                placeholder="overall, side, connection, tape_length, tape_diameter"
              />
              <div className="mt-1 text-xs text-slate-500">
                These are mandatory for every asset of this type.
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold tracking-tight">Level 2 diagram (PDF)</div>
              <div className="mt-1 text-xs text-slate-500">
                Upload a reference drawing for surveyors. Stored in the <span className="font-mono">asset-diagrams</span> bucket.
              </div>
            </div>
            {drawingUrl ? (
              <a
                href={drawingUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-slate-900 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-900"
              >
                View current PDF
              </a>
            ) : (
              <span className="text-xs text-slate-500">No PDF uploaded</span>
            )}
          </div>

          <div className="mt-4">
            <label className="text-xs font-semibold text-slate-600">Upload new PDF</label>
            <input
              type="file"
              accept="application/pdf"
              name="diagram_pdf"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
            />
          </div>

          <div className="mt-6 border-t border-slate-200 pt-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold tracking-tight">Mobile diagram (image)</div>
                <div className="mt-1 text-xs text-slate-500">
                  Optional but recommended. Using an image on mobile avoids PDF flicker and loads much faster.
                </div>
              </div>
              {drawingImageUrl ? (
                <a
                  href={drawingImageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-slate-900 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-900"
                >
                  View current image
                </a>
              ) : (
                <span className="text-xs text-slate-500">No image uploaded</span>
              )}
            </div>

            <div className="mt-4">
              <label className="text-xs font-semibold text-slate-600">Upload PNG/JPG</label>
              <input
                type="file"
                accept="image/png,image/jpeg"
                name="diagram_image"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
              />
              <div className="mt-1 text-xs text-slate-500">
                Tip: export page 1 of the PDF as an image at ~1500–2500px wide.
              </div>
            </div>
          </div>
        </div>

        <StepsEditor
          initialSteps={level2Steps as any}
          pdfUrl={drawingUrl ?? null}
          imageUrl={drawingImageUrl ?? null}
          initialTableRegion={tableRegion}
        />

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Save template
          </button>
          <Link
            href="/admin/templates"
            className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
          >
            Cancel
          </Link>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-950">
          Tip: For Level 2, define steps like <span className="font-mono">d1_mm</span>, <span className="font-mono">d2_mm</span> with labels matching the diagram.
        </div>
      </form>
    </div>
  );
}
