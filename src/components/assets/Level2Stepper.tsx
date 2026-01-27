'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Step = {
  key: string;
  label: string;
  requiresPhoto?: boolean;
  sequence?: number;
};

export function Level2Stepper(props: {
  steps: Step[];
  activeKey?: string | null;
  onActiveKeyChange?: (key: string) => void;
  values?: Record<string, number>;
  onChange?: (key: string, value: number) => void;
}) {
  const steps = useMemo(() => {
    const normalized = props.steps.map((s, i) => ({
      key: String(s.key),
      label: String(s.label ?? s.key),
      requiresPhoto: Boolean(s.requiresPhoto),
      sequence: s.sequence ?? i + 1,
    }));
    return normalized.sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
  }, [props.steps]);

  const [uncontrolledIndex, setUncontrolledIndex] = useState(0);

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const controlledKey = props.activeKey;
  const onActiveKeyChange = props.onActiveKeyChange;

  const currentIndex = useMemo(() => {
    if (!controlledKey) return uncontrolledIndex;
    const idx = steps.findIndex((s) => s.key === controlledKey);
    return idx >= 0 ? idx : uncontrolledIndex;
  }, [controlledKey, steps, uncontrolledIndex]);

  useEffect(() => {
    if (!controlledKey) return;
    const el = inputRefs.current[controlledKey];
    if (!el) return;
    // Focus + bring into view when selected from the diagram.
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Small timeout helps when layout is still settling.
    setTimeout(() => el.focus(), 50);
  }, [controlledKey]);

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
          const active = controlledKey ? s.key === controlledKey : idx === currentIndex;
          return (
            <div
              key={s.key}
              className={`rounded-xl border px-4 py-3 ${
                active
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
                  id={`l2_${s.key}`}
                  name={`m_${s.key}`}
                  inputMode="decimal"
                  // Use defaultValue to allow user typing freely
                  defaultValue={props.values?.[s.key] ?? ''}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                  placeholder="e.g., 450"
                  required={active}
                  disabled={!enabled}
                  ref={(el) => {
                    inputRefs.current[s.key] = el;
                  }}
                  onFocus={() => {
                    if (onActiveKeyChange) onActiveKeyChange(s.key);
                  }}
                  onBlur={(e) => {
                    if (props.onChange) {
                      const v = parseFloat(e.target.value);
                      if (!isNaN(v)) props.onChange(s.key, v);
                    }

                    if (!active) return;
                    const nextIdx = Math.min(idx + 1, steps.length - 1);
                    const nextKey = steps[nextIdx]?.key;
                    if (onActiveKeyChange && nextKey) {
                      onActiveKeyChange(nextKey);
                    } else {
                      setUncontrolledIndex(nextIdx);
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
