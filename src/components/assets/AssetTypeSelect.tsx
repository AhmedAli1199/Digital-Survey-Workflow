'use client';

import { useMemo } from 'react';
import type { AssetTypeConfigRow } from '@/lib/supabase/types';

export function AssetTypeSelect(props: {
  name: string;
  configs: AssetTypeConfigRow[];
  value?: string;
  onChange?: (value: string) => void;
}) {
  const options = useMemo(
    () =>
      [...props.configs]
        .sort((a, b) => a.display_name.localeCompare(b.display_name))
        .map((c) => ({ value: c.asset_type, label: c.display_name })),
    [props.configs],
  );

  return (
    <select
      name={props.name}
      defaultValue={props.value}
      onChange={(e) => props.onChange?.(e.target.value)}
      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
      required
    >
      <option value="" disabled>
        Select asset type
      </option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
