'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

// Worker setup for modern bundlers (Next.js).
pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

type NormalizedHotspot = { x: number; y: number; w: number; h: number };

type StepWithHotspot = {
  key: string;
  label: string;
  hotspot?: NormalizedHotspot | null;
  sequence?: number;
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
      loading={<div className="p-6 text-sm text-slate-600">Loading PDF…</div>}
      error={<div className="p-6 text-sm text-rose-700">Failed to load PDF.</div>}
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

export function DiagramHotspotViewerImpl(props: {
  title?: string;
  url: string;
  steps: StepWithHotspot[];
  activeKey: string | null;
  onSelectKey: (key: string) => void;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const width = useElementWidth(wrapRef);

  const [numPages, setNumPages] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState<number>(1.0);

  const normalizedSteps = useMemo(() => {
    const arr = (props.steps ?? []).map((s, i) => ({
      key: String((s as any).key ?? i),
      label: String((s as any).label ?? (s as any).key ?? `Step ${i + 1}`),
      sequence: typeof (s as any).sequence === 'number' ? (s as any).sequence : i + 1,
      hotspot: (s as any).hotspot ?? null,
    }));

    return arr.sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
  }, [props.steps]);

  const overlays = useMemo(() => {
    return normalizedSteps
      .filter((s) => s.hotspot && s.hotspot.w > 0 && s.hotspot.h > 0)
      .map((s) => {
        const hs = s.hotspot!;
        return {
          key: s.key,
          label: s.label,
          leftPct: hs.x * 100,
          topPct: hs.y * 100,
          widthPct: hs.w * 100,
          heightPct: hs.h * 100,
          active: s.key === props.activeKey,
        };
      });
  }, [normalizedSteps, props.activeKey]);

  const handlePdfLoadSuccess = useCallback((info: { numPages: number }) => {
    setNumPages(info.numPages);
    setError(null);
  }, []);

  const handlePdfLoadError = useCallback((e: unknown) => {
    const message = typeof e === 'object' && e && 'message' in e ? String((e as any).message) : String(e);
    setError(message);
  }, []);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold tracking-tight">{props.title ?? 'Reference drawing'}</div>
          <div className="mt-1 text-xs text-slate-500">Tap a highlighted label area to jump to that input.</div>
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
          <div className="hidden sm:flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600">Zoom</label>
            <input
              type="range"
              min={0.75}
              max={2.0}
              step={0.05}
              value={scale}
              onChange={(e) => setScale(Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      {error ? (
        <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-950">
          Failed to render PDF: {error}
        </div>
      ) : null}

      {overlays.length === 0 ? (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-950">
          No hotspots are configured for this diagram yet. Ask an admin to set hotspots in Template Admin.
        </div>
      ) : null}

      <div ref={wrapRef} className="mt-4">
        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          <div className="absolute inset-0 z-20" style={{ touchAction: 'manipulation' }}>
            {overlays.map((o) => (
              <button
                key={o.key}
                type="button"
                onClick={() => props.onSelectKey(o.key)}
                className={`absolute rounded border text-left transition cursor-pointer ${
                  o.active
                    ? 'border-emerald-600 bg-emerald-500/15 ring-2 ring-emerald-500/40'
                    : 'border-sky-600 bg-sky-500/10 hover:bg-sky-500/20'
                }`}
                style={{
                  left: `${o.leftPct}%`,
                  top: `${o.topPct}%`,
                  width: `${o.widthPct}%`,
                  height: `${o.heightPct}%`,
                }}
                aria-label={`Select ${o.label}`}
              >
                <span
                  className={`absolute left-0 top-0 rounded-br px-1.5 py-0.5 text-[10px] font-semibold ${
                    o.active ? 'bg-emerald-600 text-white' : 'bg-sky-600 text-white'
                  }`}
                >
                  {o.label}
                </span>
              </button>
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
    </div>
  );
}
