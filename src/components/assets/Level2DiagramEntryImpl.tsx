'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

// Worker setup for modern bundlers (Next.js).
pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

type NormalizedHotspot = { x: number; y: number; w: number; h: number };

export type Level2Step = {
  key: string;
  label: string;
  sequence?: number;
  hotspot?: NormalizedHotspot | null;
};

function useElementWidth(ref: React.RefObject<HTMLElement | null>) {
  const [width, setWidth] = useState<number>(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obs = new ResizeObserver(() => {
      const next = el.getBoundingClientRect().width;
      setWidth((prev) => (Math.abs(prev - next) >= 2 ? next : prev));
    });

    obs.observe(el);
    setWidth(el.getBoundingClientRect().width);

    return () => obs.disconnect();
  }, [ref]);

  return width;
}

const PdfPage = React.memo(function PdfPage(props: {
  url: string;
  widthPx: number;
  scale: number;
  onLoadSuccess: (info: { numPages: number }) => void;
  onLoadError: (error: unknown) => void;
}) {
  return (
    <Document
      file={props.url}
      onLoadSuccess={props.onLoadSuccess}
      onLoadError={props.onLoadError}
      loading={<div className="p-6 text-sm text-slate-600">Loading diagram…</div>}
      error={<div className="p-6 text-sm text-rose-700">Failed to load diagram.</div>}
    >
      <Page
        pageNumber={1}
        width={props.widthPx}
        scale={props.scale}
        renderTextLayer={false}
        renderAnnotationLayer={false}
      />
    </Document>
  );
});

export function Level2DiagramEntryImpl(props: {
  url: string;
  steps: Level2Step[];
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const width = useElementWidth(wrapRef);

  const [numPages, setNumPages] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState<number>(1.0);
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

  const handlePdfLoadSuccess = useCallback((info: { numPages: number }) => {
    setNumPages(info.numPages);
    setError(null);
  }, []);

  const handlePdfLoadError = useCallback((e: unknown) => {
    const message = typeof e === 'object' && e && 'message' in e ? String((e as any).message) : String(e);
    setError(message);
  }, []);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold tracking-tight">Diagram entry</div>
          <div className="mt-1 text-xs text-slate-500">Enter values directly on the drawing. Units: mm.</div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={props.url}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-slate-900 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-900"
          >
            Open PDF
          </a>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600">Zoom</label>
            <input
              type="range"
              min={0.85}
              max={1.8}
              step={0.05}
              value={scale}
              onChange={(e) => setScale(Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      {error ? (
        <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-950">
          Failed to render diagram: {error}
        </div>
      ) : null}

      {withHotspots.length === 0 ? (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-950">
          No hotspots are configured yet. Ask an admin to set hotspots in Template Admin.
        </div>
      ) : null}

      <div ref={wrapRef} className="mt-3">
        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          {/* Overlay: inputs anchored to hotspot centers */}
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
                      className={`h-9 w-[84px] rounded-lg border bg-white/95 px-2 text-sm shadow-sm outline-none backdrop-blur ${
                        activeKey === s.key
                          ? 'border-emerald-500 ring-2 ring-emerald-500/25'
                          : 'border-slate-300 focus:border-slate-400'
                      }`}
                      onFocus={() => setActiveKey(s.key)}
                      onBlur={() => setActiveKey((prev) => (prev === s.key ? null : prev))}
                    />

                    {/* Label pill only when active to keep the diagram clean */}
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

          <PdfPage
            url={props.url}
            widthPx={width ? Math.max(320, Math.floor(width)) : 640}
            scale={scale}
            onLoadSuccess={handlePdfLoadSuccess}
            onLoadError={handlePdfLoadError}
          />

          {numPages > 1 ? (
            <div className="absolute bottom-2 right-2 rounded bg-slate-900/70 px-2 py-1 text-[11px] font-semibold text-white">
              Page 1 of {numPages}
            </div>
          ) : null}
        </div>
      </div>

      {/* Fallback: any steps without hotspots still need inputs to submit */}
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
                  className="h-9 w-24 rounded-lg border border-slate-200 bg-white px-2 text-sm outline-none focus:border-slate-400"
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-3 text-[11px] text-slate-500">
        Tip: tap an input to see its label.
      </div>
    </div>
  );
}
