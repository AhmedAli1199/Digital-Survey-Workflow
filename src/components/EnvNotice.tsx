export function EnvNotice() {
  const missing: string[] = [];

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');

  if (missing.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <div className="font-semibold">Setup required</div>
      <div className="mt-1">
        Missing env vars: <span className="font-mono">{missing.join(', ')}</span>. Copy{' '}
        <span className="font-mono">.env.local.example</span> to <span className="font-mono">.env.local</span>{' '}
        and fill in your Supabase keys.
      </div>
    </div>
  );
}
