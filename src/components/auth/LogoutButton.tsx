'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

export default function LogoutButton() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const onLogout = async () => {
    try {
      setIsLoading(true);
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
    } finally {
      setIsLoading(false);
      // Full page navigation ensures middleware sees cleared cookies.
      window.location.assign('/login');
    }
  };

  return (
    <button
      type="button"
      onClick={onLogout}
      disabled={isLoading}
      className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-70"
    >
      {isLoading ? 'Signing out…' : 'Logout'}
    </button>
  );
}
