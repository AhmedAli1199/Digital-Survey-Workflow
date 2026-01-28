'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

function withTimeout<T>(promise: PromiseLike<T>, ms: number, message: string) {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timeoutId);
        resolve(value);
      },
      (err) => {
        clearTimeout(timeoutId);
        reject(err);
      },
    );
  });
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlError = searchParams.get('error');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const supabase = createSupabaseBrowserClient();

      // Authenticate with Supabase Auth (timeout prevents infinite "Verifying..." states)
      const { data: authData, error: authError } = await withTimeout(
        supabase.auth.signInWithPassword({
          email,
          password,
        }),
        12_000,
        'Login timed out. Check your internet connection and Supabase URL/keys in .env.',
      );

      if (authError || !authData.session) {
        setErrorMsg(authError?.message || 'Invalid credentials');
        return;
      }

      // Refresh page so Middleware sees the session cookie.
      // Before redirecting, verify the profile exists and is licensed.
      const { data: profile, error: profileError } = await withTimeout(
        supabase
          .from('profiles')
          .select('license_status, role')
          .eq('id', authData.session.user.id)
          .maybeSingle(),
        8_000,
        'Profile check timed out.',
      );

      if (profileError) {
        await supabase.auth.signOut();
        setErrorMsg(
          `Signed in, but profile lookup failed: ${profileError.message}. This is usually a missing RLS policy/grant, or you are pointing to a different Supabase project than your dashboard.`,
        );
        return;
      }

      if (!profile) {
        await supabase.auth.signOut();
        setErrorMsg(
          'Signed in, but your account profile row was not found for your user id. Ensure public.profiles.id equals auth.users.id (UUID), then try again.',
        );
        return;
      }

      if (profile.license_status !== 'active') {
        await supabase.auth.signOut();
        setErrorMsg('Your license is not active yet. Ask an admin to activate it.');
        return;
      }

      // Full page navigation is more reliable here because middleware auth
      // is cookie-based.
      window.location.assign('/surveys');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-900/10">
        <div className="bg-slate-900 px-8 py-6 text-center">
          <h1 className="text-lg font-bold text-white">TES Survey System</h1>
          <p className="mt-1 text-xs text-slate-400">© Thermal Engineering Solutions</p>
        </div>
        
        <div className="p-8">
          <h2 className="mb-6 text-center text-xl font-semibold text-slate-800">
            Secure Login
          </h2>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                placeholder="user@company.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                placeholder="••••••••"
              />
            </div>

            {(urlError || errorMsg) && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                {errorMsg ?? urlError}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-70"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-8 border-t pt-6 text-center">
            <p className="text-xs text-slate-400">
              Restricted Access. Unauthorised access is prohibited and logged.
              <br />
              System ID: TES-SEC-V1.0
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
