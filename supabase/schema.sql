-- Digital Survey System (Phase 1) - Supabase schema
-- Apply this in Supabase SQL editor.

create extension if not exists pgcrypto;

-- Surveys (one site visit)
create table if not exists public.surveys (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  site_name text not null,
  site_address text,
  survey_date date not null,
  surveyor_name text not null,
  project_reference text,
  general_notes text,
  status text not null default 'in_progress', -- in_progress | complete | synced
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Assets captured within a survey
create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys(id) on delete cascade,

  asset_tag text not null,
  asset_type text not null,
  quantity integer not null default 1,
  location_area text,
  service text, -- dropdown values later

  complexity_level integer not null default 1, -- 1 | 2

  obstruction_present boolean not null default false,
  obstruction_type text,
  obstruction_offset_mm numeric,
  obstruction_notes text,

  cap_end_required boolean not null default false,
  cap_end_notes text,

  calculated_price numeric(12,2),
  pricing_breakdown jsonb,

  cad_ready_payload jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint assets_complexity_level_chk check (complexity_level in (1,2))
);
create index if not exists assets_survey_id_idx on public.assets(survey_id);

-- Measurements (both Level 1 and Level 2)
create table if not exists public.measurements (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  key text not null,          -- machine key, e.g. length_mm, diameter_mm, dim_a_mm
  label text not null,        -- UI label, e.g. Overall length (mm)
  value_mm numeric not null,  -- store normalized to mm for Phase 1
  sequence integer,
  created_at timestamptz not null default now()
);
create index if not exists measurements_asset_id_idx on public.measurements(asset_id);

-- Photos stored in Supabase Storage, linked to assets
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  photo_type text not null,   -- overall | side | connection | tape_length | tape_diameter | obstruction_wide | obstruction_close | dim_a | ...
  storage_path text not null, -- path in bucket
  public_url text,
  created_at timestamptz not null default now(),

  constraint photos_asset_type_unique unique (asset_id, photo_type)
);
create index if not exists photos_asset_id_idx on public.photos(asset_id);

-- Asset type configuration (small placeholder set; update later)
create table if not exists public.asset_type_configs (
  asset_type text primary key,
  display_name text not null,
  min_complexity_level integer not null default 1,
  requires_cap_end boolean not null default false,
  level1_measurement_keys text[] not null default array[]::text[],
  level2_template jsonb, -- { drawing_url?: string, steps: [{key,label,requiresPhoto}] }
  required_photo_types text[] not null default array[]::text[],
  created_at timestamptz not null default now(),

  constraint asset_type_configs_min_complexity_chk check (min_complexity_level in (1,2))
);

-- Migration helpers (safe to run multiple times)
alter table public.assets add column if not exists cap_end_required boolean not null default false;
alter table public.assets add column if not exists cap_end_notes text;

alter table public.asset_type_configs add column if not exists requires_cap_end boolean not null default false;

-- Pricing rules (simple and replaceable)
create table if not exists public.pricing_rules (
  complexity_level integer primary key,
  base_price numeric(12,2) not null,
  obstruction_multiplier numeric(8,3) not null default 1.0,
  created_at timestamptz not null default now(),

  constraint pricing_rules_complexity_chk check (complexity_level in (1,2))
);

-- Google Sheets sync log
create table if not exists public.sheets_sync_log (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys(id) on delete cascade,
  status text not null, -- pending | synced | failed
  sheet_id text,
  synced_at timestamptz,
  error_message text,
  created_at timestamptz not null default now()
);
create index if not exists sheets_sync_log_survey_id_idx on public.sheets_sync_log(survey_id);

-- Lightweight trigger to maintain updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at_surveys on public.surveys;
create trigger set_updated_at_surveys
before update on public.surveys
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_assets on public.assets;
create trigger set_updated_at_assets
before update on public.assets
for each row execute function public.set_updated_at();
