-- 1. Create a secure enum for User Roles
create type user_role_type as enum (
  'internal',      -- TES Staff (Full Access, Clean Views)
  'client',        -- Licensed App Users (Watermarked, Restricted)
  'manufacturing'  -- Workshop (Dimensions Only, No Prices)
);

-- 2. Create the PROFILES table (Extends auth.users)
create table public.profiles (
  id uuid not null references auth.users(id) on delete cascade,
  email text,
  full_name text,
  company_name text,
  role user_role_type default 'client'::user_role_type,
  license_status text default 'active', -- 'active', 'revoked', 'expired'
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (id)
);

-- 3. Enable Strict Row Level Security (RLS)
alter table public.profiles enable row level security;

-- 4. Policies
-- Users can read their own profile
create policy "Users can view own profile" 
on public.profiles for select 
using ( auth.uid() = id );

-- Only Internal Admins can update roles/licenses
-- (You will need to manually seed your first Admin or add a policy for specific emails)

-- 5. Auto-Create Profile on Signup (Trigger)
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name',
    'client' -- Default to client, admin must manually upgrade to 'internal'
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 6. Grant Access
grant select, update, insert on public.profiles to authenticated;
grant select on public.profiles to service_role;
