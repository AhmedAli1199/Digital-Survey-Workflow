'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

function isFile(value: unknown): value is File {
  return typeof File !== 'undefined' && value instanceof File;
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
  min_complexity_level: z.coerce.number().int().min(1).max(2),
  level1_measurement_keys: z.string().optional(),
  required_photo_types: z.string().optional(),
  level2_steps_json: z.string().optional(),
});

export async function updateAssetTemplate(formData: FormData) {
  const parsed = updateSchema.safeParse({
    asset_type: String(formData.get('asset_type') ?? ''),
    display_name: String(formData.get('display_name') ?? ''),
    min_complexity_level: formData.get('min_complexity_level') ?? '1',
    level1_measurement_keys: String(formData.get('level1_measurement_keys') ?? ''),
    required_photo_types: String(formData.get('required_photo_types') ?? ''),
    level2_steps_json: String(formData.get('level2_steps_json') ?? ''),
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
        .map((s) => ({
          key: String(s.key ?? ''),
          label: String(s.label ?? ''),
          sequence: Number(s.sequence ?? 0),
          requiresPhoto: Boolean(s.requiresPhoto),
        }))
        .filter((s) => s.key && s.label && Number.isFinite(s.sequence))
        .sort((a, b) => a.sequence - b.sequence);
    } catch {
      throw new Error('Invalid steps JSON');
    }
  }

  const diagramsBucket = process.env.NEXT_PUBLIC_SUPABASE_DIAGRAMS_BUCKET ?? 'asset-diagrams';

  // Optional PDF upload
  const pdf = formData.get('diagram_pdf');
  let drawingUrl: string | null = (existing as any).level2_template?.drawing_url ?? null;

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

  const nextLevel2Template = {
    ...(existing as any).level2_template,
    drawing_url: drawingUrl,
    steps,
  };

  const { error: updateErr } = await supabase
    .from('asset_type_configs')
    .update({
      display_name: parsed.data.display_name,
      min_complexity_level: parsed.data.min_complexity_level,
      level1_measurement_keys: level1Keys,
      required_photo_types: requiredPhotos,
      level2_template: nextLevel2Template,
    })
    .eq('asset_type', parsed.data.asset_type);

  if (updateErr) throw new Error(updateErr.message);

  redirect(`/admin/templates/${parsed.data.asset_type}`);
}
