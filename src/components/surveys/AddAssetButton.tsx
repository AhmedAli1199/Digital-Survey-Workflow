'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createPlaceholderAsset } from '@/app/actions/assets';

export function AddAssetButton(props: { surveyId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleClick = () => {
    startTransition(async () => {
      try {
        await createPlaceholderAsset(props.surveyId);
        // The action revalidates, but we can also refresh locally or just wait.
        // revalidatePath in action should update the server component payload.
      } catch (error) {
        console.error('Failed to create asset', error);
        alert('Failed to create asset');
      }
    });
  };

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-wait"
    >
      {isPending ? 'Adding...' : 'Add asset'}
    </button>
  );
}
