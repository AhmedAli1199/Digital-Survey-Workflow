import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function requireAdmin() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthorized');

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role, license_status')
    .eq('id', user.id)
    .single();

  if (error) throw new Error('Failed to verify admin');
  if (profile?.license_status !== 'active') throw new Error('License not active');
  if (profile?.role !== 'admin') throw new Error('Forbidden');

  return { userId: user.id };
}
