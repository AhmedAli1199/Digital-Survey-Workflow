'use client';

import { useTransition } from 'react';
import { deleteAsset } from '@/app/actions/assets';

export function DeleteAssetButton(props: { assetId: string }) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (window.confirm('Delete this asset? This will renumber subsequent assets.')) {
      startTransition(async () => {
        try {
          await deleteAsset(props.assetId);
        } catch (error) {
          console.error('Failed to delete asset', error);
          alert('Failed to delete asset');
        }
      });
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="inline-flex rounded-lg border border-rose-200 bg-white px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
    >
      {isPending ? '...' : 'Delete'}
    </button>
  );
}
