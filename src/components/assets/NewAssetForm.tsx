'use client';

import { useEffect, useMemo, useState } from 'react';
import type { AssetTypeConfigRow } from '@/lib/supabase/types';
import { createAsset } from '@/app/actions/assets';
import { AssetTypeSelect } from '@/components/assets/AssetTypeSelect';
import { MeasurementInputs } from '@/components/assets/MeasurementInputs';
import { Level2Stepper } from '@/components/assets/Level2Stepper';
import { PhotoInputs, type PhotoField } from '@/components/assets/PhotoInputs';
import { DiagramViewer } from '@/components/assets/DiagramViewer';
import { DiagramHotspotViewer } from '@/components/assets/DiagramHotspotViewer';
import { Level2DiagramEntry } from '@/components/assets/Level2DiagramEntry';
import { Level2ImageEntry } from '@/components/assets/Level2ImageEntry';
import { Level2ImageTableEntry } from '@/components/assets/Level2ImageTableEntry';
import { SketchPadSection } from '@/components/sketch/SketchPadSection';

const CORE_PHOTOS: Array<{ photoType: string; label: string }> = [
  { photoType: 'overall', label: 'Overall asset view' },
  { photoType: 'side', label: 'Side view' },
  { photoType: 'connection', label: 'Connection close-up' },
  { photoType: 'tape_length', label: 'Tape on key length' },
  { photoType: 'tape_diameter', label: 'Tape on key diameter' },
];

const LEVEL1_MAIN_PHOTO: PhotoField = {
  photoType: 'main',
  label: 'Main photo (overall view)',
  required: true,
};

export function NewAssetForm(props: { surveyId: string; configs: AssetTypeConfigRow[] }) {
  const initialConfig = props.configs[0];

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const c of props.configs) {
      const cat = String((c as any).asset_category ?? 'uncategorized').trim();
      set.add(cat || 'uncategorized');
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [props.configs]);

  const initialCategory = String((initialConfig as any)?.asset_category ?? categories[0] ?? 'uncategorized');

  const [assetCategory, setAssetCategory] = useState<string>(initialCategory);

  const configsForCategory = useMemo(() => {
    return props.configs.filter((c) => String((c as any).asset_category ?? 'uncategorized') === assetCategory);
  }, [props.configs, assetCategory]);

  const [assetType, setAssetType] = useState<string>(configsForCategory[0]?.asset_type ?? initialConfig?.asset_type ?? '');
  const [requestedComplexity, setRequestedComplexity] = useState<1 | 2>(
    (initialConfig?.min_complexity_level ?? 1) as 1 | 2,
  );
  const [obstructionPresent, setObstructionPresent] = useState(false);

  useEffect(() => {
    // When category changes, pick the first variant in that category.
    const next = configsForCategory[0]?.asset_type ?? '';
    if (next && next !== assetType) {
      setAssetType(next);
    }
    // If category has no variants, clear selection.
    if (!next) setAssetType('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetCategory]);

  const config = useMemo(
    () => props.configs.find((c) => c.asset_type === assetType) ?? configsForCategory[0] ?? initialConfig,
    [assetType, props.configs, configsForCategory, initialConfig],
  );

  const minComplexity = (config?.min_complexity_level ?? 1) as 1 | 2;
  const effectiveComplexity = (Math.max(minComplexity, requestedComplexity) as 1 | 2) ?? 1;

  const level1Keys = config?.level1_measurement_keys?.length
    ? config.level1_measurement_keys
    : ['length_mm', 'max_diameter_mm', 'pipe_dn'];

  const level2Steps = Array.isArray(config?.level2_template?.steps) ? config.level2_template.steps : [];
  const hasLevel2Template = level2Steps.length > 0;
  const drawingUrl = typeof config?.level2_template?.drawing_url === 'string' ? config.level2_template.drawing_url : null;
  const drawingImageUrl =
    typeof (config as any)?.level2_template?.drawing_image_url === 'string'
      ? ((config as any).level2_template.drawing_image_url as string)
      : null;
  const tableRegion = ((config as any)?.level2_template?.table_region ?? null) as any;

  const hasTableRegion = Boolean(
    drawingImageUrl && tableRegion && typeof tableRegion === 'object' && tableRegion.w > 0 && tableRegion.h > 0,
  );

  const effectiveComplexitySafe: 1 | 2 = effectiveComplexity === 2 && !hasLevel2Template ? 1 : effectiveComplexity;

  const sortedLevel2Steps = useMemo(() => {
    const arr = (level2Steps ?? []).map((s: any, i: number) => ({
      ...s,
      key: String(s?.key ?? i),
      label: String(s?.label ?? s?.key ?? `Step ${i + 1}`),
      sequence: typeof s?.sequence === 'number' ? s.sequence : i + 1,
    }));
    return arr.sort((a: any, b: any) => (a.sequence ?? 0) - (b.sequence ?? 0));
  }, [level2Steps]);

  const [activeLevel2Key, setActiveLevel2Key] = useState<string | null>(null);
  const [capEndRequired, setCapEndRequired] = useState<boolean>(false);

  useEffect(() => {
    if (effectiveComplexitySafe !== 2) return;
    if (!sortedLevel2Steps.length) {
      setActiveLevel2Key(null);
      return;
    }

    // Reset active step when asset type/template changes.
    setActiveLevel2Key(sortedLevel2Steps[0]?.key ?? null);
  }, [assetType, effectiveComplexitySafe, sortedLevel2Steps]);


  const corePhotoFields: PhotoField[] = useMemo(() => {
    // Level 1: only a single main photo (overall) is required.
    if (effectiveComplexitySafe === 1) return [LEVEL1_MAIN_PHOTO];

    // Level 2: prefer config.required_photo_types if present, but fall back to CORE_PHOTOS labels.
    const configTypes = Array.isArray(config?.required_photo_types) ? config.required_photo_types : null;
    const types = configTypes?.length ? configTypes : CORE_PHOTOS.map((p) => p.photoType);

    return types.map((t) => {
      const found = CORE_PHOTOS.find((p) => p.photoType === t);
      return {
        photoType: t,
        label: found?.label ?? t.replace(/_/g, ' '),
        required: true,
      };
    });
  }, [config, effectiveComplexitySafe]);

  const obstructionFields: PhotoField[] = useMemo(
    () => [
      { photoType: 'obstruction_wide', label: 'Obstruction wide shot', required: true },
      { photoType: 'obstruction_close', label: 'Obstruction close-up', required: true },
    ],
    [],
  );

  const level2DimensionPhotoFields: PhotoField[] = useMemo(() => {
    if (effectiveComplexitySafe !== 2) return [];
    const fields: PhotoField[] = [];
    for (const s of level2Steps) {
      if (!s?.requiresPhoto) continue;
      const key = String(s.key);
      fields.push({
        photoType: `dim_${key}`,
        label: String(s.label ?? key),
        required: true,
        hint: 'Photo must show tape on this dimension',
      });
    }
    return fields;
  }, [effectiveComplexitySafe, level2Steps]);

  return (
    <form action={createAsset} className="grid gap-6">
      <input type="hidden" name="survey_id" value={props.surveyId} />

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="text-sm font-semibold tracking-tight">Asset identification</div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-slate-600">Asset ID / Tag *</label>
            <input
              name="asset_tag"
              required
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              placeholder="e.g., CV-001"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">Asset category *</label>
            <select
              name="asset_category"
              value={assetCategory}
              onChange={(e) => {
                setAssetCategory(e.target.value);
                setCapEndRequired(false);
              }}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
              required
            >
              <option value="" disabled>
                Select category
              </option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <div className="mt-1 text-xs text-slate-500">Pick a broad category, then choose the variant.</div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">Variant *</label>
            <AssetTypeSelect
              name="asset_type"
              configs={configsForCategory}
              value={assetType}
              onChange={(v) => {
                setAssetType(v);
                setCapEndRequired(false);
                const cfg = props.configs.find((c) => c.asset_type === v);
                if (cfg) {
                  const min = (cfg.min_complexity_level ?? 1) as 1 | 2;
                  setRequestedComplexity(min);
                }
              }}
            />
            <div className="mt-1 text-xs text-slate-500">
              Placeholder list is small and editable later in <span className="font-mono">asset_type_configs</span>.
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">Quantity *</label>
            <input
              name="quantity"
              type="number"
              min={1}
              defaultValue={1}
              required
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">Location / Area</label>
            <input
              name="location_area"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              placeholder="e.g., Roof Level 2"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">Service</label>
            <select
              name="service"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
              defaultValue=""
            >
              <option value="">Select</option>
              <option value="steam">Steam</option>
              <option value="hot_water">Hot water</option>
              <option value="chilled_water">Chilled water</option>
              <option value="oil">Oil</option>
              <option value="gas">Gas</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">Complexity level *</label>
            <select
              name="complexity_level"
              value={String(requestedComplexity)}
              onChange={(e) => setRequestedComplexity((Number(e.target.value) as 1 | 2) ?? 1)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
            >
              <option value="1" disabled={minComplexity === 2}>
                Level 1 (simple)
              </option>
              <option value="2" disabled={!hasLevel2Template}>
                Level 2 (structured)
              </option>
            </select>
            <div className="mt-1 text-xs text-slate-500">
              Minimum complexity for this asset type is Level {minComplexity}. You can escalate if needed.
            </div>
            {!hasLevel2Template ? (
              <div className="mt-1 text-xs text-amber-700">
                Level 2 is unavailable for this asset type until a measurement template + diagram are configured.
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {effectiveComplexitySafe === 2 ? (
        drawingUrl ? (
          hasTableRegion ? (
            <Level2ImageTableEntry
              imageUrl={drawingImageUrl as string}
              pdfUrl={drawingUrl}
              steps={sortedLevel2Steps as any}
              tableRegion={tableRegion}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="self-start md:sticky md:top-4">
                {/* Mobile: enter values directly on the diagram */}
                <div className="md:hidden">
                  {drawingImageUrl ? (
                    <Level2ImageEntry imageUrl={drawingImageUrl} pdfUrl={drawingUrl} steps={sortedLevel2Steps as any} />
                  ) : (
                    <Level2DiagramEntry url={drawingUrl} steps={sortedLevel2Steps as any} />
                  )}
                </div>

                {/* Desktop/tablet: diagram click-to-focus + step list */}
                <div className="hidden md:block">
                  <DiagramHotspotViewer
                    url={drawingUrl}
                    steps={sortedLevel2Steps as any}
                    activeKey={activeLevel2Key}
                    onSelectKey={(k) => {
                      setActiveLevel2Key(k);
                      // Defensive: if focusing fails for any reason, still attempt scroll.
                      const el = document.getElementById(`l2_${k}`);
                      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      (el as HTMLInputElement | null)?.focus?.();
                    }}
                  />
                </div>
              </div>
              <div className="min-w-0">
                {/* Keep the stepper on larger screens; mobile uses the diagram overlay inputs. */}
                <div className="hidden md:block">
                  <Level2Stepper
                    steps={sortedLevel2Steps as any}
                    activeKey={activeLevel2Key}
                    onActiveKeyChange={(k: string) => setActiveLevel2Key(k)}
                  />
                </div>
              </div>
            </div>
          )
        ) : (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950">
            No diagram PDF is configured for this asset type yet.
          </div>
        )
      ) : (
        <MeasurementInputs title="Measurements (Level 1)" measurementKeys={level1Keys} />
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="text-sm font-semibold tracking-tight">Cap end</div>
        <div className="mt-1 text-xs text-slate-500">Set this per asset (not per template). Add notes only if needed.</div>
        <div className="mt-4 flex items-center gap-2">
          <input
            id="cap_end_required"
            type="checkbox"
            name="cap_end_required"
            value="true"
            checked={capEndRequired}
            onChange={(e) => setCapEndRequired(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          <label htmlFor="cap_end_required" className="text-sm font-medium text-slate-900">
            Cap end required
          </label>
        </div>

        {capEndRequired ? (
          <div className="mt-4">
            <label className="text-xs font-semibold text-slate-600">Cap end notes</label>
            <textarea
              name="cap_end_notes"
              className="mt-1 min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              placeholder="e.g., Cap end needed on outlet side; match DN; include gasket..."
            />
          </div>
        ) : null}
      </div>

      <PhotoInputs
        title={effectiveComplexitySafe === 1 ? 'Main photo' : 'Mandatory photos'}
        fields={corePhotoFields}
        note={
          effectiveComplexitySafe === 1
            ? 'Level 1 assets only require one clear overall photo.'
            : 'These are required for every Level 2 asset. Keep them consistent for CAD and quoting.'
        }
      />

      {effectiveComplexitySafe === 2 && level2DimensionPhotoFields.length ? (
        <PhotoInputs title="Dimension photos" fields={level2DimensionPhotoFields} />
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="text-sm font-semibold tracking-tight">Obstructions / cut-outs / uni-strut</div>
        <div className="mt-1 text-xs text-slate-500">
          Capture presence, type, approximate offset and notes. CAD interprets exact geometry later.
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-slate-600">Obstruction present? *</label>
            <select
              name="obstruction_present"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
              value={String(obstructionPresent)}
              onChange={(e) => setObstructionPresent(e.target.value === 'true')}
            >
              <option value="false">No</option>
              <option value="true">Yes</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">Obstruction type</label>
            <input
              name="obstruction_type"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              placeholder="e.g., Junction box, cable tray"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">Approximate offset (mm)</label>
            <input
              name="obstruction_offset_mm"
              inputMode="decimal"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              placeholder="e.g., 180"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-slate-600">Obstruction notes</label>
            <textarea
              name="obstruction_notes"
              className="mt-1 min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              placeholder="Describe what it is and where it sits relative to the asset..."
            />
          </div>
        </div>
      </div>

      {obstructionPresent ? <PhotoInputs title="Obstruction photos" fields={obstructionFields} /> : null}

      <SketchPadSection />

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Save asset
        </button>
        <a
          href={`/surveys/${props.surveyId}`}
          className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
        >
          Cancel
        </a>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
        For now, photos are stored in Supabase Storage bucket and linked to the asset record.
      </div>
    </form>
  );
}
