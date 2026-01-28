
'use client';

import { useMemo, useState } from 'react';
import { ImageRegionPicker, type NormalizedRect } from '@/components/admin/ImageRegionPicker';

export type TemplateStep = {
  key: string;
  label: string;
  sequence: number;
  requiresPhoto: boolean;
  hotspot?: unknown | null;
};

type EditorStep = TemplateStep & { _rowId: string };

function createRowId() {
  // Avoid losing focus on inputs by keeping a stable React key per row.
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function normalizeKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

export function StepsEditor(props: {
  initialSteps: TemplateStep[];
  pdfUrl?: string | null;
  imageUrl?: string | null;
  initialTableRegion?: NormalizedRect | null;
}) {
  const [steps, setSteps] = useState<EditorStep[]>(() => {
    const base = props.initialSteps?.length ? props.initialSteps : [];
    return base
      .map((s, idx) => ({
        _rowId: String((s as any)?._rowId ?? createRowId()),
        key: String(s.key ?? ''),
        label: String(s.label ?? ''),
        sequence: Number(s.sequence ?? idx + 1),
        requiresPhoto: Boolean(s.requiresPhoto),
        hotspot: (s as any).hotspot ?? null,
      }))
      .sort((a, b) => a.sequence - b.sequence);
  });

  const [tableRegion, setTableRegion] = useState<NormalizedRect | null>(() => props.initialTableRegion ?? null);
  const [nextStepPrefix, setNextStepPrefix] = useState('A');

  const json = useMemo(
    () => JSON.stringify(steps.map(({ _rowId: _ignored, ...rest }) => rest)),
    [steps],
  );
  const tableRegionJson = useMemo(() => JSON.stringify(tableRegion), [tableRegion]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold tracking-tight">Level 2 dimension steps</div>
          <div className="mt-1 text-xs text-slate-500">
            Each row becomes a required measurement input (e.g., D1, D2). For photo enforcement, enable “Photo required”.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={nextStepPrefix}
            onChange={(e) => setNextStepPrefix(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-slate-400"
          >
            {['A', 'B', 'C', 'D', 'E'].map((letter) => (
              <option key={letter} value={letter}>
                {letter}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() =>
              setSteps((prev) => {
                // Find next number for this prefix
                const existingNums = prev
                  .map((s) => {
                    const match = s.label.match(new RegExp(`^${nextStepPrefix}(\\d+)`));
                    return match ? parseInt(match[1], 10) : 0;
                  });
                const nextNum = Math.max(0, ...existingNums) + 1;
                
                return [
                  ...prev,
                  {
                    _rowId: createRowId(),
                    key: `${nextStepPrefix.toLowerCase()}${nextNum}_mm`,
                    label: `${nextStepPrefix}${nextNum} (mm)`,
                    sequence: prev.length + 1,
                    requiresPhoto: true,
                    hotspot: null,
                  },
                ];
              })
            }
            className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-50"
          >
            Add step
          </button>
        </div>
      </div>

      <input type="hidden" name="level2_steps_json" value={json} />
      <input type="hidden" name="level2_table_region_json" value={tableRegionJson} />

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
        <div className="grid grid-cols-12 gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600">
          <div className="col-span-2">Order</div>
          <div className="col-span-3">Key</div>
          <div className="col-span-5">Label</div>
          <div className="col-span-1">Photo</div>
          <div className="col-span-1 text-right">Remove</div>
        </div>

        {steps.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-600">No steps configured.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {steps.map((s, idx) => (
              <div key={s._rowId} className="grid grid-cols-12 items-center gap-2 px-4 py-3 text-sm">
                <div className="col-span-2">
                  <input
                    type="number"
                    min={1}
                    value={s.sequence}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setSteps((prev) =>
                        prev.map((x, i) => (i === idx ? { ...x, sequence: Number.isFinite(v) ? v : x.sequence } : x)),
                      );
                    }}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                  />
                </div>

                <div className="col-span-3">
                  <input
                    value={s.key}
                    onChange={(e) => {
                      const v = normalizeKey(e.target.value);
                      setSteps((prev) => prev.map((x, i) => (i === idx ? { ...x, key: v } : x)));
                    }}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                    placeholder="e.g., d1_mm"
                  />
                  <div className="mt-1 text-[11px] text-slate-500">Used in exports; keep stable once in use.</div>
                </div>

                <div className="col-span-5">
                  <input
                    value={s.label}
                    onChange={(e) => {
                      const v = e.target.value;
                      setSteps((prev) => prev.map((x, i) => (i === idx ? { ...x, label: v } : x)));
                    }}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                    placeholder="e.g., D1 – Inlet to outlet (mm)"
                  />
                </div>

                <div className="col-span-1 flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={s.requiresPhoto}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setSteps((prev) => prev.map((x, i) => (i === idx ? { ...x, requiresPhoto: checked } : x)));
                    }}
                    className="h-4 w-4"
                  />
                </div>

                <div className="col-span-1 text-right">
                  <button
                    type="button"
                    onClick={() => setSteps((prev) => prev.filter((_, i) => i !== idx))}
                    className="text-xs font-semibold text-rose-700 underline decoration-rose-200 underline-offset-4 hover:decoration-rose-700"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 text-xs text-slate-500">
        Note: “Key” is the stored identifier (recommended: d1_mm, d2_mm, etc.).
      </div>

      <div className="mt-6 grid gap-6">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm font-semibold tracking-tight">Mobile: input table region (recommended)</div>
          <div className="mt-1 text-xs text-slate-600">
            Drag a large rectangle where you want the mobile input table to appear (usually a blank area on the right of the diagram).
          </div>

          {!props.imageUrl ? (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-950">
              Upload a diagram image above, save, then come back to set the table region.
            </div>
          ) : steps.length === 0 ? (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-950">
              Add at least one Level 2 step first.
            </div>
          ) : (
            <div className="mt-4">
              <ImageRegionPicker
                imageUrl={props.imageUrl}
                value={tableRegion}
                title="Input table region"
                description="Select a big blank area. The app will render a clean table there listing all steps in order."
                onChange={(r) => {
                  if (r.w === 0 || r.h === 0) {
                    setTableRegion(null);
                  } else {
                    setTableRegion(r);
                  }
                }}
              />
            </div>
          )}

          <div className="mt-3 text-xs text-slate-600">
            If you don’t set this, the mobile screen falls back to individual overlay inputs.
          </div>
        </div>
      </div>
    </div>
  );
}
