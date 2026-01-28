import { createBrowserClient } from '@supabase/ssr';

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }

  // IMPORTANT:
  // Use the SSR-aware browser client so auth sets cookies.
  // Next.js Middleware reads auth from cookies, not localStorage.
  return createBrowserClient(url, anonKey);
}
