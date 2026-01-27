'use client';

import React, { useMemo, useRef, useState } from 'react';

type NormalizedHotspot = { x: number; y: number; w: number; h: number };

type Step = {
  key: string;
  label: string;
  sequence?: number;
  hotspot?: NormalizedHotspot | null;
};

type Level2ImageEntryProps = {
  imageUrl: string;
  pdfUrl?: string | null;
  steps: Step[];
  // NEW: Support for external value sync
  values?: Record<string, number>;
  onChange?: (key: string, value: number) => void;
};

export function Level2ImageEntry(props: Level2ImageEntryProps) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const sortedSteps = useMemo(() => {
    const arr = (props.steps ?? []).map((s: any, i) => ({
      key: String(s?.key ?? i),
      label: String(s?.label ?? s?.key ?? `Step ${i + 1}`),
      sequence: typeof s?.sequence === 'number' ? s.sequence : i + 1,
      hotspot: s?.hotspot ?? null,
    }));
    return arr.sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
  }, [props.steps]);

  const withHotspots = useMemo(() => {
    return sortedSteps.filter((s) => s.hotspot && s.hotspot.w > 0 && s.hotspot.h > 0);
  }, [sortedSteps]);

  const withoutHotspots = useMemo(() => {
    return sortedSteps.filter((s) => !s.hotspot || !(s.hotspot.w > 0 && s.hotspot.h > 0));
  }, [sortedSteps]);

  const overlayInputs = useMemo(() => {
    return withHotspots.map((s) => {
      const hs = s.hotspot!;
      const cxPct = (hs.x + hs.w / 2) * 100;
      const cyPct = (hs.y + hs.h / 2) * 100;
      const leftPct = hs.x * 100;
      const topPct = hs.y * 100;
      const widthPct = hs.w * 100;
      const heightPct = hs.h * 100;
      return { ...s, cxPct, cyPct, leftPct, topPct, widthPct, heightPct };
    });
  }, [withHotspots]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold tracking-tight">Diagram entry</div>
          <div className="mt-1 text-xs text-slate-500">Fast mobile mode (image). Units: mm.</div>
        </div>
        <div className="flex items-center gap-3">
          {props.pdfUrl ? (
            <a
              href={props.pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-slate-900 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-900"
            >
              Open PDF
            </a>
          ) : null}
          <a
            href={props.imageUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-slate-900 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-900"
          >
            Open image
          </a>
        </div>
      </div>

      <div className="mt-3">
        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          <img
            src={props.imageUrl}
            alt="Reference drawing"
            className="block h-auto w-full select-none"
            loading="eager"
            decoding="async"
            draggable={false}
          />

          {/* Overlay inputs (percent-based) */}
          <div className="absolute inset-0 z-20" style={{ touchAction: 'manipulation' }}>
            {overlayInputs.map((s) => (
              <React.Fragment key={s.key}>
                {/* Big tappable area (the hotspot rectangle) */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveKey(s.key);
                    inputRefs.current[s.key]?.focus();
                  }}
                  className={`absolute rounded transition ${
                    activeKey === s.key
                      ? 'border-2 border-emerald-500 bg-emerald-500/10'
                      : 'border border-transparent bg-transparent'
                  }`}
                  style={{
                    left: `${s.leftPct}%`,
                    top: `${s.topPct}%`,
                    width: `${s.widthPct}%`,
                    height: `${s.heightPct}%`,
                  }}
                  aria-label={`Edit ${s.label}`}
                />

                {/* Input anchored at hotspot center */}
                <div
                  className="absolute z-10"
                  style={{ left: `${s.cxPct}%`, top: `${s.cyPct}%`, transform: 'translate(-50%, -50%)' }}
                >
                  <div className="relative">
                    <input
                      ref={(el) => {
                        inputRefs.current[s.key] = el;
                      }}
                      name={`m_${s.key}`}
                      inputMode="decimal"
                      placeholder="mm"
                      aria-label={s.label}
                      required
                      defaultValue={props.values?.[s.key] ?? ''}
                      className={`h-9 w-[84px] rounded-lg border bg-white px-2 text-sm text-slate-900 placeholder:text-slate-400 caret-slate-900 shadow-sm outline-none ${
                        activeKey === s.key
                          ? 'border-emerald-500 ring-2 ring-emerald-500/25'
                          : 'border-slate-300 focus:border-slate-400'
                      }`}
                      onFocus={() => setActiveKey(s.key)}
                      onBlur={(e) => {
                        setActiveKey((prev) => (prev === s.key ? null : prev));
                        if (props.onChange) {
                            const v = parseFloat(e.target.value);
                            if (!isNaN(v)) props.onChange(s.key, v);
                        }
                      }}
                    />

                    {activeKey === s.key ? (
                      <div className="pointer-events-none absolute -top-7 left-0 max-w-[220px] truncate rounded bg-slate-900/80 px-2 py-1 text-[11px] font-semibold text-white">
                        {s.label}
                      </div>
                    ) : null}
                  </div>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {withoutHotspots.length ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-semibold text-slate-700">Other measurements</div>
          <div className="mt-3 grid gap-2">
            {withoutHotspots.map((s) => (
              <div key={s.key} className="flex items-center gap-2">
                <div className="min-w-0 flex-1 text-xs text-slate-700 truncate">{s.label}</div>
                <input
                  name={`m_${s.key}`}
                  inputMode="decimal"
                  placeholder="mm"
                  aria-label={s.label}
                  required
                  className="h-9 w-24 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-900 placeholder:text-slate-400 caret-slate-900 outline-none focus:border-slate-400"
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
