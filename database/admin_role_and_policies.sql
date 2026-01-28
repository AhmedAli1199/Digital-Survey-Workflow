-- Admin Role + Policies (run in Supabase SQL editor)
-- This adds an 'admin' role and allows only admins to manage other users.

-- 1) Extend role enum to include admin
do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_enum e on t.oid = e.enumtypid
    where t.typname = 'user_role_type' and e.enumlabel = 'admin'
  ) then
    alter type user_role_type add value 'admin';
  end if;
end $$;

-- 2) Ensure profiles has expected columns (safe-guards)
alter table public.profiles
  add column if not exists company_name text,
  add column if not exists full_name text,
  add column if not exists license_status text default 'active';

-- 3) Replace/ensure RLS policies
alter table public.profiles enable row level security;

-- Users can always view their own profile
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
on public.profiles for select
using (auth.uid() = id);

-- Admins can view all profiles
drop policy if exists "Admins can view all profiles" on public.profiles;

-- IMPORTANT:
-- Do NOT create an "admins can view all profiles" policy that queries public.profiles
-- inside a policy on public.profiles. Postgres will detect infinite recursion.
--
-- In this codebase, admin user management uses the Supabase Service Role key
-- (server-side) which bypasses RLS, and access is enforced at the app layer
-- via `requireAdmin()` + middleware checks on the signed-in user's own profile.

-- Admins can update all profiles (role, license_status, company_name, etc.)
drop policy if exists "Admins can update all profiles" on public.profiles;

-- Admins can insert profiles (rare; usually created by trigger)
drop policy if exists "Admins can insert profiles" on public.profiles;

-- 4) Recommended: make new users default to 'client' in the trigger
-- If you have already created the trigger in init_roles.sql, you can keep it.
-- This replaces the function so the default role is always 'client'.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    'client'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

-- 5) Optional helper: promote a specific email to admin (run manually)
-- IMPORTANT: run this as a separate query AFTER step (1) has completed.
-- update public.profiles set role='admin', license_status='active' where email='you@tes.com';
