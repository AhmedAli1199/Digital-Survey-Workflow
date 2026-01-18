/*
Uploads local PDF diagrams into the Supabase Storage bucket `asset-diagrams`
then updates `public.asset_type_configs.level2_template.drawing_url`.

Run:
  node scripts/upload-asset-diagrams.mjs

Prereqs:
  - .env has NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
  - Bucket `asset-diagrams` exists
  - Local files exist under ../Asset Diagrams/
*/

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { createClient } from '@supabase/supabase-js';

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function safeName(filename) {
  return filename
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/-+/g, '-')
    .slice(0, 120);
}

async function main() {
  // Load .env (Next reads it automatically; this script needs it too)
  // eslint-disable-next-line global-require
  const dotenv = await import('dotenv');
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });

  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

  const bucket = process.env.NEXT_PUBLIC_SUPABASE_DIAGRAMS_BUCKET || 'asset-diagrams';

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  const root = path.resolve(process.cwd(), '..');
  const diagramsDir = path.join(root, 'Asset Diagrams');

  // Map asset types to local filenames
  const mapping = {
    check_valve: 'Check Valve.pdf',
    y_strainer: 'Strainer Flanged (1).pdf',
  };

  for (const [assetType, fileName] of Object.entries(mapping)) {
    const localPath = path.join(diagramsDir, fileName);
    const file = await fs.readFile(localPath);

    const remoteName = safeName(fileName);
    const remotePath = `diagrams/${assetType}/${remoteName}`;

    console.log(`Uploading ${assetType}: ${fileName} -> ${remotePath}`);

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(remotePath, file, { contentType: 'application/pdf', upsert: true });

    if (uploadError) throw new Error(uploadError.message);

    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(remotePath);
    const drawingUrl = publicData?.publicUrl;
    if (!drawingUrl) throw new Error('Failed to build public URL');

    const { data: cfg, error: cfgErr } = await supabase
      .from('asset_type_configs')
      .select('level2_template')
      .eq('asset_type', assetType)
      .single();

    if (cfgErr) throw new Error(cfgErr.message);

    const nextTemplate = {
      ...(cfg?.level2_template ?? {}),
      drawing_url: drawingUrl,
    };

    const { error: upErr } = await supabase
      .from('asset_type_configs')
      .update({ level2_template: nextTemplate })
      .eq('asset_type', assetType);

    if (upErr) throw new Error(upErr.message);

    console.log(`Updated ${assetType} drawing_url.`);
  }

  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
