'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

function isFile(value: unknown): value is File {
  return typeof File !== 'undefined' && value instanceof File;
}

function isSupportedImageType(mime: string) {
  return mime === 'image/png' || mime === 'image/jpeg';
}

function safeName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/-+/g, '-')
    .slice(0, 120);
}

const updateSchema = z.object({
  asset_type: z.string().min(1),
  display_name: z.string().min(1),
  asset_category: z.string().min(1),
  min_complexity_level: z.coerce.number().int().min(1).max(2),
  level1_measurement_keys: z.string().optional(),
  required_photo_types: z.string().optional(),
  level2_steps_json: z.string().optional(),
  level2_table_region_json: z.string().optional(),
});

const createVariantSchema = z.object({
  asset_type: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9_-]+$/i, 'Use only letters, numbers, underscore, dash'),
  display_name: z.string().min(1).max(120),
  asset_category: z.string().min(1).max(120),
  min_complexity_level: z.coerce.number().int().min(1).max(2).default(1),
});

export async function createAssetVariant(formData: FormData) {
  const parsed = createVariantSchema.safeParse({
    asset_type: String(formData.get('asset_type') ?? ''),
    display_name: String(formData.get('display_name') ?? ''),
    asset_category: String(formData.get('asset_category') ?? ''),
    min_complexity_level: formData.get('min_complexity_level') ?? '1',
  });

  if (!parsed.success) {
    throw new Error('Invalid variant input');
  }

  const supabase = createSupabaseAdminClient();

  const { error } = await supabase.from('asset_type_configs').insert({
    asset_type: parsed.data.asset_type,
    display_name: parsed.data.display_name,
    asset_category: parsed.data.asset_category,
    min_complexity_level: parsed.data.min_complexity_level,
    level1_measurement_keys: [],
    required_photo_types: [],
    level2_template: null,
  });

  if (error) {
    // Common case: duplicate primary key.
    if ((error.message || '').toLowerCase().includes('duplicate')) {
      throw new Error('That variant key already exists. Choose a unique asset_type key.');
    }
    throw new Error(error.message);
  }

  redirect(`/admin/templates/${parsed.data.asset_type}`);
}

function guessCategory(assetType: string, displayName: string): string {
  const hay = `${assetType} ${displayName}`.toLowerCase();

  // Keep this intentionally conservative and easy to override in the UI.
  if (hay.includes('strainer')) return 'Strainers';
  if (hay.includes('valve')) return 'Valves';
  if (hay.includes('flange') || hay.includes('flanged')) return 'Flanges';
  if (hay.includes('pipe') || hay.includes('pipework')) return 'Pipes';

  return 'uncategorized';
}

export async function autoCategorizeAssetVariants() {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from('asset_type_configs')
    .select('asset_type, display_name, asset_category');

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Array<{ asset_type: string; display_name: string; asset_category?: string | null }>;
  const toUpdate = rows
    .map((r) => {
      const current = String(r.asset_category ?? 'uncategorized').trim() || 'uncategorized';
      if (current !== 'uncategorized') return null;
      const next = guessCategory(String(r.asset_type ?? ''), String(r.display_name ?? ''));
      if (!next || next === 'uncategorized') return null;
      return { asset_type: r.asset_type, asset_category: next };
    })
    .filter(Boolean) as Array<{ asset_type: string; asset_category: string }>;

  if (toUpdate.length === 0) {
    redirect('/admin/templates');
  }

  // Batch per category to avoid per-row round trips.
  const byCategory = new Map<string, string[]>();
  for (const u of toUpdate) {
    const list = byCategory.get(u.asset_category) ?? [];
    list.push(u.asset_type);
    byCategory.set(u.asset_category, list);
  }

  for (const [cat, types] of byCategory.entries()) {
    const { error: updateErr } = await supabase
      .from('asset_type_configs')
      .update({ asset_category: cat })
      .in('asset_type', types);
    if (updateErr) throw new Error(updateErr.message);
  }

  redirect('/admin/templates');
}

export async function updateAssetTemplate(formData: FormData) {
  const parsed = updateSchema.safeParse({
    asset_type: String(formData.get('asset_type') ?? ''),
    display_name: String(formData.get('display_name') ?? ''),
    asset_category: String(formData.get('asset_category') ?? ''),
    min_complexity_level: formData.get('min_complexity_level') ?? '1',
    level1_measurement_keys: String(formData.get('level1_measurement_keys') ?? ''),
    required_photo_types: String(formData.get('required_photo_types') ?? ''),
    level2_steps_json: String(formData.get('level2_steps_json') ?? ''),
    level2_table_region_json: String(formData.get('level2_table_region_json') ?? ''),
  });

  if (!parsed.success) throw new Error('Invalid template input');

  const supabase = createSupabaseAdminClient();

  const { data: existing, error: existingErr } = await supabase
    .from('asset_type_configs')
    .select('*')
    .eq('asset_type', parsed.data.asset_type)
    .single();

  if (existingErr) throw new Error(existingErr.message);

  const level1Keys = parsed.data.level1_measurement_keys
    ? parsed.data.level1_measurement_keys
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const requiredPhotos = parsed.data.required_photo_types
    ? parsed.data.required_photo_types
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  let steps: any[] = [];
  if (parsed.data.level2_steps_json && parsed.data.level2_steps_json.trim() !== '') {
    try {
      const decoded = JSON.parse(parsed.data.level2_steps_json);
      if (!Array.isArray(decoded)) throw new Error('Steps must be an array');
      steps = decoded
        .map((s) => {
          const rawHotspot = (s as any).hotspot;
          const hotspot =
            rawHotspot &&
            typeof rawHotspot === 'object' &&
            Number.isFinite(Number(rawHotspot.x)) &&
            Number.isFinite(Number(rawHotspot.y)) &&
            Number.isFinite(Number(rawHotspot.w)) &&
            Number.isFinite(Number(rawHotspot.h))
              ? {
                  x: Number(rawHotspot.x),
                  y: Number(rawHotspot.y),
                  w: Number(rawHotspot.w),
                  h: Number(rawHotspot.h),
                }
              : null;

          return {
            key: String(s.key ?? ''),
            label: String(s.label ?? ''),
            sequence: Number(s.sequence ?? 0),
            requiresPhoto: Boolean(s.requiresPhoto),
            hotspot,
          };
        })
        .filter((s) => s.key && s.label && Number.isFinite(s.sequence))
        .sort((a, b) => a.sequence - b.sequence);
    } catch {
      throw new Error('Invalid steps JSON');
    }
  }

  // Optional table region (normalized rect)
  let tableRegion: any | null = (existing as any).level2_template?.table_region ?? null;
  if (parsed.data.level2_table_region_json && parsed.data.level2_table_region_json.trim() !== '') {
    try {
      const decoded = JSON.parse(parsed.data.level2_table_region_json);
      if (decoded == null) {
        tableRegion = null;
      } else if (
        typeof decoded === 'object' &&
        Number.isFinite(Number((decoded as any).x)) &&
        Number.isFinite(Number((decoded as any).y)) &&
        Number.isFinite(Number((decoded as any).w)) &&
        Number.isFinite(Number((decoded as any).h))
      ) {
        const r = {
          x: Number((decoded as any).x),
          y: Number((decoded as any).y),
          w: Number((decoded as any).w),
          h: Number((decoded as any).h),
        };
        // Treat empty as cleared
        tableRegion = r.w <= 0 || r.h <= 0 ? null : r;
      } else {
        throw new Error('Invalid table region');
      }
    } catch {
      throw new Error('Invalid table region JSON');
    }
  }

  const diagramsBucket = process.env.NEXT_PUBLIC_SUPABASE_DIAGRAMS_BUCKET ?? 'asset-diagrams';

  // Optional PDF upload
  const pdf = formData.get('diagram_pdf');
  let drawingUrl: string | null = (existing as any).level2_template?.drawing_url ?? null;

  // Optional image upload (recommended for mobile)
  const image = formData.get('diagram_image');
  let drawingImageUrl: string | null = (existing as any).level2_template?.drawing_image_url ?? null;

  if (isFile(pdf) && pdf.size > 0) {
    if (pdf.type !== 'application/pdf') {
      throw new Error('Diagram must be a PDF');
    }

    const fileName = safeName(pdf.name || `${parsed.data.asset_type}.pdf`);
    const path = `diagrams/${parsed.data.asset_type}/${Date.now()}-${fileName}`;
    const bytes = new Uint8Array(await pdf.arrayBuffer());

    const { error: uploadError } = await supabase.storage.from(diagramsBucket).upload(path, bytes, {
      contentType: 'application/pdf',
      upsert: true,
    });

    if (uploadError) throw new Error(uploadError.message);

    const { data: publicData } = supabase.storage.from(diagramsBucket).getPublicUrl(path);
    drawingUrl = publicData?.publicUrl ?? null;
  }

  if (isFile(image) && image.size > 0) {
    if (!isSupportedImageType(image.type)) {
      throw new Error('Diagram image must be PNG or JPG');
    }

    const ext = image.type === 'image/png' ? 'png' : 'jpg';
    const fileName = safeName(image.name || `${parsed.data.asset_type}.${ext}`);
    const path = `diagrams/${parsed.data.asset_type}/${Date.now()}-${fileName}`;
    const bytes = new Uint8Array(await image.arrayBuffer());

    const { error: uploadError } = await supabase.storage.from(diagramsBucket).upload(path, bytes, {
      contentType: image.type,
      upsert: true,
    });

    if (uploadError) throw new Error(uploadError.message);

    const { data: publicData } = supabase.storage.from(diagramsBucket).getPublicUrl(path);
    drawingImageUrl = publicData?.publicUrl ?? null;
  }

  const nextLevel2Template = {
    ...(existing as any).level2_template,
    drawing_url: drawingUrl,
    drawing_image_url: drawingImageUrl,
    table_region: tableRegion,
    steps,
  };

  const { error: updateErr } = await supabase
    .from('asset_type_configs')
    .update({
      display_name: parsed.data.display_name,
      asset_category: parsed.data.asset_category,
      min_complexity_level: parsed.data.min_complexity_level,
      level1_measurement_keys: level1Keys,
      required_photo_types: requiredPhotos,
      level2_template: nextLevel2Template,
    })
    .eq('asset_type', parsed.data.asset_type);

  if (updateErr) {
    throw new Error(updateErr.message);
  }

  redirect(`/admin/templates/${parsed.data.asset_type}`);
}
