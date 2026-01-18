'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getMeasurementDefinition } from '@/lib/domain/measurementCatalog';

function isFile(value: unknown): value is File {
  return typeof File !== 'undefined' && value instanceof File;
}

function requireFile(formData: FormData, name: string, label: string): File {
  const value = formData.get(name);
  if (!isFile(value) || value.size === 0) {
    throw new Error(`Missing required photo: ${label}`);
  }
  return value;
}

function safeExt(file: File): string {
  const byType = file.type?.split('/')[1];
  if (byType && /^[a-z0-9.+-]+$/i.test(byType)) return byType.replace('jpeg', 'jpg');
  const byName = file.name?.split('.').pop();
  if (byName && /^[a-z0-9]+$/i.test(byName)) return byName.toLowerCase();
  return 'jpg';
}

function safeSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

const createAssetSchema = z.object({
  survey_id: z.string().uuid(),
  asset_tag: z.string().min(1),
  asset_type: z.string().min(1),
  quantity: z.coerce.number().int().min(1).default(1),
  location_area: z.string().optional(),
  service: z.string().optional(),
  complexity_level: z.coerce.number().int().min(1).max(2),
  obstruction_present: z.coerce.boolean().default(false),
  obstruction_type: z.string().optional(),
  obstruction_offset_mm: z.coerce.number().optional(),
  obstruction_notes: z.string().optional(),
});

export async function createAsset(formData: FormData) {
  const raw = {
    survey_id: String(formData.get('survey_id') ?? ''),
    asset_tag: String(formData.get('asset_tag') ?? ''),
    asset_type: String(formData.get('asset_type') ?? ''),
    quantity: formData.get('quantity') ?? '1',
    location_area: String(formData.get('location_area') ?? ''),
    service: String(formData.get('service') ?? ''),
    complexity_level: formData.get('complexity_level') ?? '1',
    obstruction_present: String(formData.get('obstruction_present') ?? 'false') === 'true',
    obstruction_type: String(formData.get('obstruction_type') ?? ''),
    obstruction_offset_mm: formData.get('obstruction_offset_mm') || undefined,
    obstruction_notes: String(formData.get('obstruction_notes') ?? ''),
  };

  const parsed = createAssetSchema.safeParse(raw);
  if (!parsed.success) throw new Error('Invalid asset input');

  const supabase = createSupabaseAdminClient();

  // Enforce minimum complexity by asset type
  const { data: config, error: configError } = await supabase
    .from('asset_type_configs')
    .select('*')
    .eq('asset_type', parsed.data.asset_type)
    .single();

  if (configError) throw new Error(configError.message);

  const minComplexity = Number(config.min_complexity_level ?? 1);
  const requestedComplexity = Number(parsed.data.complexity_level);
  const complexity = Math.max(minComplexity, requestedComplexity);

  const { data: asset, error: assetError } = await supabase
    .from('assets')
    .insert({
      survey_id: parsed.data.survey_id,
      asset_tag: parsed.data.asset_tag,
      asset_type: parsed.data.asset_type,
      quantity: parsed.data.quantity,
      location_area: parsed.data.location_area || null,
      service: parsed.data.service || null,
      complexity_level: complexity,
      obstruction_present: parsed.data.obstruction_present,
      obstruction_type: parsed.data.obstruction_present ? parsed.data.obstruction_type || null : null,
      obstruction_offset_mm:
        parsed.data.obstruction_present && parsed.data.obstruction_offset_mm != null
          ? parsed.data.obstruction_offset_mm
          : null,
      obstruction_notes: parsed.data.obstruction_present ? parsed.data.obstruction_notes || null : null,
    })
    .select('id')
    .single();

  if (assetError) throw new Error(assetError.message);

  // Measurements
  const measurementRows: Array<{ asset_id: string; key: string; label: string; value_mm: number; sequence?: number | null }> = [];

  if (complexity === 1) {
    const keys: string[] = Array.isArray(config.level1_measurement_keys) ? config.level1_measurement_keys : [];

    for (const key of keys) {
      const rawValue = formData.get(`m_${key}`);
      if (rawValue == null || String(rawValue).trim() === '') {
        throw new Error(`Missing required measurement: ${getMeasurementDefinition(key).label}`);
      }

      const num = Number(rawValue);
      if (!Number.isFinite(num) || num <= 0) {
        throw new Error(`Invalid measurement: ${getMeasurementDefinition(key).label}`);
      }

      const def = getMeasurementDefinition(key);
      measurementRows.push({ asset_id: asset.id, key, label: def.label, value_mm: num });
    }
  } else {
    const steps = config.level2_template?.steps ?? [];
    if (!Array.isArray(steps) || steps.length === 0) {
      throw new Error('No Level 2 template configured for this asset type');
    }

    for (const step of steps) {
      const key = String(step.key);
      const label = String(step.label ?? getMeasurementDefinition(key).label);
      const seq = step.sequence != null ? Number(step.sequence) : null;

      const rawValue = formData.get(`m_${key}`);
      if (rawValue == null || String(rawValue).trim() === '') {
        throw new Error(`Missing required measurement: ${label}`);
      }

      const num = Number(rawValue);
      if (!Number.isFinite(num) || num <= 0) {
        throw new Error(`Invalid measurement: ${label}`);
      }

      measurementRows.push({ asset_id: asset.id, key, label, value_mm: num, sequence: seq });
    }
  }

  const { error: measurementError } = await supabase.from('measurements').insert(measurementRows);
  if (measurementError) throw new Error(measurementError.message);

  // Photos
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ?? 'survey-photos';

  const requiredCorePhotoTypes: string[] = Array.isArray(config.required_photo_types)
    ? config.required_photo_types
    : ['overall', 'side', 'connection', 'tape_length', 'tape_diameter'];

  const photoTypes: Array<{ photo_type: string; input: string; label: string }> = requiredCorePhotoTypes.map((t) => ({
    photo_type: t,
    input: `p_${t}`,
    label: t.replace(/_/g, ' '),
  }));

  if (parsed.data.obstruction_present) {
    photoTypes.push(
      { photo_type: 'obstruction_wide', input: 'p_obstruction_wide', label: 'obstruction wide' },
      { photo_type: 'obstruction_close', input: 'p_obstruction_close', label: 'obstruction close-up' },
    );
  }

  if (complexity === 2) {
    const steps = config.level2_template?.steps ?? [];
    for (const step of steps) {
      if (!step?.requiresPhoto) continue;
      const key = String(step.key);
      const photoType = `dim_${key}`;
      photoTypes.push({
        photo_type: photoType,
        input: `p_${photoType}`,
        label: String(step.label ?? key),
      });
    }
  }

  const now = new Date();
  const surveySeg = safeSegment(parsed.data.survey_id);
  const assetSeg = safeSegment(asset.id);

  const rowsToUpsert: Array<{ asset_id: string; photo_type: string; storage_path: string; public_url: string | null }> = [];

  for (const p of photoTypes) {
    const file = requireFile(formData, p.input, p.label);
    if (file.size > 15 * 1024 * 1024) {
      throw new Error(`Photo too large: ${p.label} (max 15MB)`);
    }

    const ext = safeExt(file);
    const path = `surveys/${surveySeg}/assets/${assetSeg}/${p.photo_type}-${now.getTime()}.${ext}`;
    const bytes = new Uint8Array(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, bytes, {
      contentType: file.type || undefined,
      upsert: true,
    });
    if (uploadError) throw new Error(uploadError.message);

    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path);
    rowsToUpsert.push({ asset_id: asset.id, photo_type: p.photo_type, storage_path: path, public_url: publicData?.publicUrl ?? null });
  }

  const { error: photosError } = await supabase
    .from('photos')
    .upsert(rowsToUpsert, { onConflict: 'asset_id,photo_type' });

  if (photosError) throw new Error(photosError.message);

  redirect(`/surveys/${parsed.data.survey_id}`);
}
