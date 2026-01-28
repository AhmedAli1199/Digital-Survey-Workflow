'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function logSecurityEvent(action: string, metadata?: any) {
  const cookieStore = await cookies();
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          // No-op for read-only usage
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
      console.warn('Security Log attempted by unauthenticated user');
      return { success: false };
  }

  const { error } = await supabase.from('security_logs').insert({
    user_id: user.id,
    action,
    metadata,
    created_at: new Date().toISOString()
  });

  if (error) {
      console.error('Failed to write security log:', error);
      return { success: false, error: error.message };
  }

  return { success: true };
}
