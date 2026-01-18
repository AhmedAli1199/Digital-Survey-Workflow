'use client';

import { useMemo, useState } from 'react';

export type TemplateStep = {
  key: string;
  label: string;
  sequence: number;
  requiresPhoto: boolean;
};

function normalizeKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

export function StepsEditor(props: { initialSteps: TemplateStep[] }) {
  const [steps, setSteps] = useState<TemplateStep[]>(() => {
    const base = props.initialSteps?.length ? props.initialSteps : [];
    return base
      .map((s, idx) => ({
        key: String(s.key ?? ''),
        label: String(s.label ?? ''),
        sequence: Number(s.sequence ?? idx + 1),
        requiresPhoto: Boolean(s.requiresPhoto),
      }))
      .sort((a, b) => a.sequence - b.sequence);
  });

  const json = useMemo(() => JSON.stringify(steps), [steps]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold tracking-tight">Level 2 dimension steps</div>
          <div className="mt-1 text-xs text-slate-500">
            Each row becomes a required measurement input (e.g., D1, D2). For photo enforcement, enable “Photo required”.
          </div>
        </div>
        <button
          type="button"
          onClick={() =>
            setSteps((prev) => [
              ...prev,
              {
                key: `d${prev.length + 1}_mm`,
                label: `D${prev.length + 1} (mm)`,
                sequence: prev.length + 1,
                requiresPhoto: true,
              },
            ])
          }
          className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-50"
        >
          Add step
        </button>
      </div>

      <input type="hidden" name="level2_steps_json" value={json} />

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
              <div key={`${s.key}-${idx}`} className="grid grid-cols-12 items-center gap-2 px-4 py-3 text-sm">
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
    </div>
  );
}
