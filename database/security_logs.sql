-- Create Security Logs Table
create table public.security_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id),
  action text not null, -- 'SCREENSHOT_ATTEMPT', 'LOGIN', etc.
  metadata jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz default now()
);

-- RLS: Only Insert allowed (Users log their own actions), No viewing
alter table public.security_logs enable row level security;

create policy "Users can insert logs" 
on public.security_logs for insert 
to authenticated 
with check ( auth.uid() = user_id );

-- No select policy = Write Only log (Admins can read via service role)
