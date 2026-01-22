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

function parseDataUrlPng(dataUrl: string): Uint8Array {
  const trimmed = String(dataUrl ?? '').trim();
  if (!trimmed) throw new Error('Empty sketch');
  const m = trimmed.match(/^data:(image\/png);base64,(.+)$/i);
  if (!m) throw new Error('Invalid sketch image format');
  const base64 = m[2] ?? '';
  const buf = Buffer.from(base64, 'base64');
  return new Uint8Array(buf);
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
  cap_end_required: z.boolean().default(false),
  cap_end_notes: z.string().optional(),
});

export async function createAsset(formData: FormData) {
  const capEndRequired = formData
    .getAll('cap_end_required')
    .map((v) => String(v))
    .some((v) => v === 'true' || v === 'on' || v === '1');

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
    cap_end_required: capEndRequired,
    cap_end_notes: String(formData.get('cap_end_notes') ?? ''),
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

  const capEndNotes = parsed.data.cap_end_notes?.trim() ? parsed.data.cap_end_notes.trim() : null;

  const baseInsert = {
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
  };

  const insertWithCapEnd = {
    ...baseInsert,
    cap_end_required: parsed.data.cap_end_required,
    cap_end_notes: parsed.data.cap_end_required ? capEndNotes : null,
  };

  let insertAttempt = await supabase.from('assets').insert(insertWithCapEnd).select('id').single();
  if (insertAttempt.error) {
    const msg = insertAttempt.error.message || '';
    // Backwards compatibility: if the DB hasn't been migrated yet, retry without cap-end columns.
    if (msg.includes('cap_end_required') || msg.includes('cap_end_notes')) {
      insertAttempt = await supabase.from('assets').insert(baseInsert).select('id').single();
    }
  }

  const asset = insertAttempt.data;
  const assetError = insertAttempt.error;
  if (assetError || !asset) throw new Error(assetError?.message ?? 'Failed to create asset');

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

  // Level 1: only a single main photo is required.
  const requiredCorePhotoTypes: string[] =
    complexity === 1
      ? ['main']
      : Array.isArray(config.required_photo_types)
        ? config.required_photo_types
        : ['overall', 'side', 'connection', 'tape_length', 'tape_diameter'];

  const photoTypes: Array<{ photo_type: string; input: string; label: string }> = requiredCorePhotoTypes.map((t) => ({
    photo_type: t,
    input: `p_${t}`,
    label: t === 'main' ? 'main photo' : t.replace(/_/g, ' '),
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

  const rowsToUpsert: Array<{
    asset_id: string;
    photo_type: string;
    kind?: string;
    storage_path: string;
    public_url: string | null;
    meta?: any;
  }> = [];

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
    rowsToUpsert.push({
      asset_id: asset.id,
      photo_type: p.photo_type,
      kind: 'photo',
      storage_path: path,
      public_url: publicData?.publicUrl ?? null,
    });
  }

  // Optional sketch (PNG data URL + optional JSON doc for future editing)
  const sketchPngDataUrl = String(formData.get('sketch_png_data_url') ?? '').trim();
  const sketchDocJson = String(formData.get('sketch_doc_json') ?? '').trim();
  if (sketchPngDataUrl) {
    const bytes = parseDataUrlPng(sketchPngDataUrl);
    if (bytes.byteLength > 6 * 1024 * 1024) {
      throw new Error('Sketch too large (max 6MB)');
    }

    const path = `surveys/${surveySeg}/assets/${assetSeg}/sketch-${now.getTime()}.png`;
    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, bytes, {
      contentType: 'image/png',
      upsert: true,
    });
    if (uploadError) throw new Error(uploadError.message);

    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path);

    let meta: any = undefined;
    if (sketchDocJson) {
      try {
        meta = { doc: JSON.parse(sketchDocJson), version: 1 };
      } catch {
        // If malformed, ignore doc but still save the PNG.
        meta = { version: 1 };
      }
    } else {
      meta = { version: 1 };
    }

    rowsToUpsert.push({
      asset_id: asset.id,
      photo_type: 'sketch',
      kind: 'sketch',
      storage_path: path,
      public_url: publicData?.publicUrl ?? null,
      meta,
    });
  }

  let photosAttempt = await supabase.from('photos').upsert(rowsToUpsert as any, { onConflict: 'asset_id,photo_type' });
  if (photosAttempt.error) {
    const msg = photosAttempt.error.message || '';
    // Backwards compatibility: if DB hasn't been migrated with kind/meta columns, retry without them.
    if (msg.includes('kind') || msg.includes('meta')) {
      const fallbackRows = rowsToUpsert.map(({ kind: _k, meta: _m, ...rest }) => rest);
      photosAttempt = await supabase.from('photos').upsert(fallbackRows as any, { onConflict: 'asset_id,photo_type' });
    }
  }

  if (photosAttempt.error) throw new Error(photosAttempt.error.message);

  redirect(`/surveys/${parsed.data.survey_id}`);
}
