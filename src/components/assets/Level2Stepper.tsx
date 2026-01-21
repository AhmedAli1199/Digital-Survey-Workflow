'use client';

import { useMemo, useState } from 'react';

type Step = {
  key: string;
  label: string;
  requiresPhoto?: boolean;
  sequence?: number;
};

export function Level2Stepper(props: { steps: Step[] }) {
  const steps = useMemo(() => {
    const normalized = props.steps.map((s, i) => ({
      key: String(s.key),
      label: String(s.label ?? s.key),
      requiresPhoto: Boolean(s.requiresPhoto),
      sequence: s.sequence ?? i + 1,
    }));
    return normalized.sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
  }, [props.steps]);

  const [currentIndex, setCurrentIndex] = useState(0);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold tracking-tight">Structured measurements</div>
          <div className="mt-1 text-xs text-slate-500">
            Step-by-step capture (Level 2). If a dimension requires a photo, it must be provided before saving.
          </div>
        </div>
        <div className="text-xs text-slate-500">
          Step {currentIndex + 1} / {steps.length}
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        {steps.map((s, idx) => {
          const enabled = idx <= currentIndex;
          return (
            <div
              key={s.key}
              className={`rounded-xl border px-4 py-3 ${
                idx === currentIndex
                  ? 'border-slate-300 bg-slate-50'
                  : enabled
                    ? 'border-slate-200 bg-white'
                    : 'border-slate-200 bg-white opacity-50'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-slate-600">Step {idx + 1}</div>
                  <div className="text-sm font-medium text-slate-900">{s.label}</div>
                  {s.requiresPhoto ? (
                    <div className="mt-1 text-xs text-slate-500">Photo required (will be enforced).</div>
                  ) : null}
                </div>
                {idx < currentIndex ? (
                  <div className="text-xs font-semibold text-emerald-700">Done</div>
                ) : null}
              </div>

              <div className="mt-3">
                <label className="text-xs font-semibold text-slate-600">Value (mm) *</label>
                <input
                  name={`m_${s.key}`}
                  inputMode="decimal"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                  placeholder="e.g., 450"
                  required={idx === currentIndex}
                  disabled={!enabled}
                  onBlur={() => {
                    if (idx === currentIndex) {
                      setCurrentIndex((prev) => Math.min(prev + 1, steps.length - 1));
                    }
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 text-xs text-slate-500">
        Tip: move to the next step by entering a value and leaving the field.
      </div>
    </div>
  );
}
