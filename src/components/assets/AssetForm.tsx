'use client';

import { useEffect, useMemo, useState } from 'react';
import type { AssetRow, AssetTypeConfigRow } from '@/lib/supabase/types';
import { createAsset, updateAsset } from '@/app/actions/assets';
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

const CANONICAL_CATEGORIES = [
  'VALVES',
  'STRAINERS',
  'CONNECTORS',
  'PIPEWORK / BENDS',
  'VALVE ASSEMBLIES (DBB SETUPS)',
  'REFERENCE / NON-SELECTABLE',
];

const CANONICAL_CATEGORY_BY_UPPER = new Map(
  CANONICAL_CATEGORIES.map((c) => [c.toUpperCase(), c]),
);

function canonicalizeCategory(raw: unknown): string {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return 'uncategorized';
  const upper = trimmed.toUpperCase();
  return CANONICAL_CATEGORY_BY_UPPER.get(upper) ?? trimmed;
}

export function AssetForm(props: { 
  surveyId: string; 
  configs: AssetTypeConfigRow[];
  defaultTag?: string;
  initialData?: AssetRow & {
    measurements?: { key: string; value_mm: number }[];
    photos?: { photo_type: string; public_url: string | null; meta?: any }[];
  };
}) {
  const isEditing = !!props.initialData;
  const initialData = props.initialData;

  const initialConfig = isEditing 
    ? props.configs.find(c => c.asset_type === initialData?.asset_type) ?? props.configs[0]
    : props.configs[0];

  // Measurements State for persistence across type switching
  const initialMeasurements = useMemo(() => {
    if (!initialData?.measurements) return {};
    const map: Record<string, number> = {};
    for (const m of initialData.measurements) {
        map[m.key] = m.value_mm;
    }
    return map;
  }, [initialData]);

  const [measurements, setMeasurements] = useState<Record<string, number>>(initialMeasurements);

  const handleMeasurementChange = (key: string, value: number) => {
    setMeasurements((prev) => ({ ...prev, [key]: value }));
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const c of props.configs) {
      const cat = canonicalizeCategory((c as any).asset_category ?? 'uncategorized');
      set.add(cat);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [props.configs]);

  const initialCategory = canonicalizeCategory(
    (initialConfig as any)?.asset_category ?? categories[0] ?? 'uncategorized',
  );

  const [assetCategory, setAssetCategory] = useState<string>(initialCategory);

  const configsForCategory = useMemo(() => {
    return props.configs.filter(
      (c) => canonicalizeCategory((c as any).asset_category ?? 'uncategorized') === assetCategory,
    );
  }, [props.configs, assetCategory]);

  const [assetType, setAssetType] = useState<string>(initialData?.asset_type ?? configsForCategory[0]?.asset_type ?? initialConfig?.asset_type ?? '');
  
  const [requestedComplexity, setRequestedComplexity] = useState<1 | 2>(
    initialData?.complexity_level ?? (initialConfig?.min_complexity_level ?? 1) as 1 | 2,
  );
  
  // No persistent state for obstruction/cap end in logic yet, just used to drive UI toggles? 
  // Actually initialData drives defaultValue of inputs.
  // But complexity drives rendering.

  const [obstructionPresent, setObstructionPresent] = useState(initialData?.obstruction_present ?? false);
  const [capEndRequired, setCapEndRequired] = useState<boolean>(initialData?.cap_end_required ?? false);

  useEffect(() => {
    // When category changes, ensure the selected variant is valid for that category.
    // This must run in BOTH create + edit flows; otherwise the UI can show a new
    // category while still using the previous config (diagram/steps won't refresh).
    const allowed = new Set(configsForCategory.map((c) => c.asset_type));
    if (assetType && allowed.has(assetType)) return;

    const next = configsForCategory[0]?.asset_type ?? '';
    setAssetType(next);

    if (next) {
      const cfg = props.configs.find((c) => c.asset_type === next);
      if (cfg) {
        const min = (cfg.min_complexity_level ?? 1) as 1 | 2;
        setRequestedComplexity(min);
      }
    }
  }, [assetCategory, configsForCategory, assetType, props.configs]);

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
  }, [level2Steps]) as Array<{ key: string; label: string; sequence: number; [key: string]: any }>; // Explicit cast to fix implicit any

  const active = true; // Placeholder if needed

  // Existing photos map
  const existingPhotos = useMemo(() => {
      if (!initialData?.photos) return {};
      const map: Record<string, string> = {};
      for (const p of initialData.photos) {
          if (p.public_url) map[p.photo_type] = p.public_url;
      }
      return map;
  }, [initialData]);
  
  const existingSketchEntry = initialData?.photos?.find(p => p.photo_type === 'sketch');
  const existingSketchUrl = existingSketchEntry?.public_url;
  const existingSketchDoc = existingSketchEntry?.meta?.doc ? JSON.stringify(existingSketchEntry.meta.doc) : null;

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

  // When asset type changes, we generally reset data unless it's initial load.
  // We don't have easy form reset here as it's uncontrolled mostly. 
  // Key prop on form sections can help reset them if type changes.
  
  return (
    <form action={isEditing ? updateAsset : createAsset} className="grid gap-6">
      {isEditing ? <input type="hidden" name="asset_id" value={initialData?.id} /> : <input type="hidden" name="survey_id" value={props.surveyId} />}
      
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
           <div className="text-sm font-semibold tracking-tight">Asset identification</div>
           {isEditing && <span className="text-xs font-semibold px-2 py-1 rounded bg-amber-50 text-amber-700 border border-amber-200">Editing Mode</span>}
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-slate-600">Asset ID / Tag *</label>
            <input
              name="asset_tag"
              required
              defaultValue={initialData?.asset_tag ?? props.defaultTag}
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
              Placeholder list is small and editable later.
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">Quantity *</label>
            <input
              name="quantity"
              type="number"
              min={1}
              defaultValue={initialData?.quantity ?? 1}
              required
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">Location / Area</label>
            <input
              name="location_area"
              defaultValue={initialData?.location_area ?? ''}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              placeholder="e.g., Roof Level 2"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">Service</label>
            <select
              name="service"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
              defaultValue={initialData?.service ?? ''}
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
              Minimum complexity for this asset type is Level {minComplexity}.
            </div>
          </div>
        </div>
      </div>

      {effectiveComplexitySafe === 2 ? (
        drawingUrl ? (
          hasTableRegion ? (
            <Level2ImageTableEntry
              key={`${assetType}-table`}
              imageUrl={drawingImageUrl as string}
              pdfUrl={drawingUrl}
              steps={sortedLevel2Steps as any}
              tableRegion={tableRegion}
              values={measurements}
              onChange={handleMeasurementChange}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
               {/* Non-table Diagram View not implemented specifically with initialValues yet? 
                   Assuming Level2DiagramEntry deals with it or we fallback to list.
                   Actually Level2DiagramEntry is usually for viewing, inputs are in sidebar unless its "Fast mobile mode".
                   Let's see original NewAssetForm logic.
               */}
              <div className="self-start md:sticky md:top-4">
                 <Level2ImageEntry 
                    key={`${assetType}-i`}
                    imageUrl={drawingImageUrl as string}
                    pdfUrl={drawingUrl}
                    steps={sortedLevel2Steps as any}
                    values={measurements}
                    onChange={handleMeasurementChange}
                 />
              </div>
              <div>
                <MeasurementInputs 
                    key={`${assetType}-m`}
                    title="Measurements" 
                    measurementKeys={sortedLevel2Steps.map((s) => s.key)}
                    values={measurements}
                    onChange={handleMeasurementChange}
                />
              </div>
            </div>
          )
        ) : (
            <MeasurementInputs
                key={`${assetType}-m`} 
                title="Level 2 Measurements" 
                measurementKeys={sortedLevel2Steps.map((s) => s.key)}
                values={measurements}
                onChange={handleMeasurementChange}
            />
        )
      ) : (
        <MeasurementInputs
            key={`${assetType}-m`} 
            title="Measurements" 
            measurementKeys={level1Keys} 
            values={measurements}
            onChange={handleMeasurementChange}
        />
      )}

      {/* Obstruction Toggle */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            name="obstruction_present"
            value="true"
            checked={obstructionPresent}
            onChange={(e) => setObstructionPresent(e.target.checked)}
            className="h-5 w-5 rounded border-slate-300"
          />
          <span className="text-sm font-semibold text-slate-900">Obstruction present?</span>
        </label>

        {obstructionPresent ? (
          <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 md:grid-cols-2">
             {/* Fields... reuse defaultValues from initialData */}
             <div>
                <label className="text-xs font-semibold text-slate-600">Obstruction Type</label>
                <input name="obstruction_type" defaultValue={initialData?.obstruction_type ?? ''} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
             </div>
             <div>
                <label className="text-xs font-semibold text-slate-600">Offset (mm)</label>
                <input name="obstruction_offset_mm" type="number" defaultValue={initialData?.obstruction_offset_mm ?? ''} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
             </div>
             <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-600">Notes</label>
                <textarea name="obstruction_notes" defaultValue={initialData?.obstruction_notes ?? ''} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" rows={2}/>
             </div>
          </div>
        ) : null}
      </div>

      {/* Cap End Toggle */}
       <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            name="cap_end_required"
            value="true"
            checked={capEndRequired}
            onChange={(e) => setCapEndRequired(e.target.checked)}
            className="h-5 w-5 rounded border-slate-300"
          />
          <span className="text-sm font-semibold text-slate-900">Cap end required?</span>
        </label>
         {capEndRequired ? (
          <div className="mt-4 border-t border-slate-100 pt-4">
               <label className="text-xs font-semibold text-slate-600">Cap end notes</label>
                <textarea name="cap_end_notes" defaultValue={initialData?.cap_end_notes ?? ''} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" rows={2}/>
          </div>
         ): null}
      </div>

      <PhotoInputs 
        title="Core Photos" 
        fields={corePhotoFields} 
        note="At least one photo is required." 
        existingPhotos={existingPhotos}
      />

      {effectiveComplexitySafe === 2 ? (
        <PhotoInputs 
            title="Dimension Validation Photos" 
            fields={level2DimensionPhotoFields}
            existingPhotos={existingPhotos}
        />
      ) : null}

      {obstructionPresent ? (
        <PhotoInputs 
            title="Obstruction Photos" 
            fields={obstructionFields}
            existingPhotos={existingPhotos}
        />
      ) : null}

      <SketchPadSection 
         title="Sketch / Obstruction Drawing" 
         initialDocJson={existingSketchDoc}
         existingSketchUrl={existingSketchUrl}
      />

      <div className="flex items-center justify-end gap-3 pt-6">
        <button
          type="submit"
          className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
        >
          {isEditing ? 'Save Changes' : 'Create Asset'}
        </button>
      </div>
    </form>
  );
}
