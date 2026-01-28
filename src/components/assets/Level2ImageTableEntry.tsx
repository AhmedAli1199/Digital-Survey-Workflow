'use client';

import React, { useMemo } from 'react';
import { useWatermark } from '@/components/security/WatermarkProvider';
import { WatermarkOverlay } from '@/components/security/WatermarkOverlay';

type NormalizedRect = { x: number; y: number; w: number; h: number };

type Step = {
  key: string;
  label: string;
  sequence?: number;
};

type Level2ImageTableEntryProps = {
  imageUrl: string;
  pdfUrl?: string | null;
  steps: Step[];
  tableRegion: NormalizedRect;
  values: Record<string, number>;
  onChange: (key: string, value: number) => void;
};

export function Level2ImageTableEntry(props: Level2ImageTableEntryProps) {
  const { userRole } = useWatermark();
  const canOpenSource = userRole !== 'client';

  const sortedSteps = useMemo(() => {
    const arr = (props.steps ?? []).map((s: any, i) => ({
      key: String(s?.key ?? i),
      label: String(s?.label ?? s?.key ?? `Step ${i + 1}`),
      sequence: typeof s?.sequence === 'number' ? s.sequence : i + 1,
    }));
    return arr.sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
  }, [props.steps]);

  const region = props.tableRegion;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold tracking-tight">Diagram entry</div>
          <div className="mt-1 text-xs text-slate-500">Fast mobile mode (image + table). Units: mm.</div>
        </div>
        <div className="flex items-center gap-3">
          {canOpenSource && props.pdfUrl ? (
            <a
              href={props.pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-slate-900 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-900"
            >
              Open PDF
            </a>
          ) : null}
          {canOpenSource ? (
            <a
              href={props.imageUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-slate-900 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-900"
            >
              Open image
            </a>
          ) : null}
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

          {/* Watermark overlay for on-screen viewing */}
          <WatermarkOverlay className="z-10" />

          {/* Table overlay inside the selected region */}
          <div
            className="absolute z-20"
            style={{
              left: `${region.x * 100}%`,
              top: `${region.y * 100}%`,
              width: `${region.w * 100}%`,
              height: `${region.h * 100}%`,
            }}
          >
            <div className="h-full w-full overflow-hidden rounded-lg border border-slate-900/20 bg-white/95 shadow-sm backdrop-blur">
              <div className="h-full w-full overflow-auto">
                <table className="w-full table-fixed border-collapse text-[12px]">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="w-[45%] border-b border-slate-200 px-1 py-2 text-left font-semibold text-slate-700">Dim</th>
                      <th className="w-[55%] border-b border-slate-200 px-1 py-2 text-left font-semibold text-slate-700">Value (mm)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedSteps.map((s) => (
                      <tr key={s.key}>
                        <td className="border-b border-slate-100 px-1 py-2 text-slate-800">
                          <div className="truncate">{s.label}</div>
                        </td>
                        <td className="border-b border-slate-100 px-1 py-1">
                          <input
                            name={`m_${s.key}`}
                            type="number"
                            inputMode="decimal"
                            // Use defaultValue to be uncontrolled but initialize with value
                            defaultValue={props.values[s.key] ?? ''}
                            onBlur={(e) => {
                                const v = parseFloat(e.target.value);
                                if (!isNaN(v)) {
                                     props.onChange(s.key, v);
                                }
                            }}
                            placeholder="mm"
                            aria-label={s.label}
                            required
                            className="h-9 w-full min-w-0 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-900 placeholder:text-slate-400 caret-slate-900 outline-none focus:border-slate-400"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 text-[11px] text-slate-500">Tap a value field in the table and type.</div>
    </div>
  );
}
