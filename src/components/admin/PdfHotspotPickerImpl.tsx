'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import type { HotspotOverlay, NormalizedHotspot } from '@/components/admin/PdfHotspotPickerTypes';

// Worker setup for modern bundlers (Next.js).
pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

const PdfPage = React.memo(function PdfPage(props: {
  pdfUrl: string;
  widthPx: number;
  scale: number;
  onLoadSuccess: (info: { numPages: number }) => void;
  onLoadError: (error: unknown) => void;
}) {
  return (
    <Document
      file={props.pdfUrl}
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

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function normalizeRect(
  rectPx: { x: number; y: number; w: number; h: number },
  container: { w: number; h: number },
): NormalizedHotspot {
  const x = rectPx.x / container.w;
  const y = rectPx.y / container.h;
  const w = rectPx.w / container.w;
  const h = rectPx.h / container.h;
  return {
    x: clamp01(x),
    y: clamp01(y),
    w: clamp01(w),
    h: clamp01(h),
  };
}

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

export function PdfHotspotPickerImpl(props: {
  pdfUrl: string;
  overlays: HotspotOverlay[];
  activeKey: string | null;
  onSelectHotspot: (hotspot: NormalizedHotspot) => void;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const pageRef = useRef<HTMLDivElement | null>(null);

  const width = useElementWidth(wrapRef);

  const [numPages, setNumPages] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState<number>(1.0);

  const [drag, setDrag] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    active: boolean;
  } | null>(null);

  const containerSize = useMemo(() => {
    const el = pageRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { w: r.width, h: r.height };
  }, [width, scale, numPages]);

  const selectionRectPx = useMemo(() => {
    if (!drag || !drag.active) return null;
    const x1 = drag.startX;
    const y1 = drag.startY;
    const x2 = drag.currentX;
    const y2 = drag.currentY;
    const x = Math.min(x1, x2);
    const y = Math.min(y1, y2);
    const w = Math.abs(x2 - x1);
    const h = Math.abs(y2 - y1);
    return { x, y, w, h };
  }, [drag]);

  const handlePdfLoadSuccess = useCallback((info: { numPages: number }) => {
    setNumPages(info.numPages);
    setError(null);
  }, []);

  const handlePdfLoadError = useCallback((e: unknown) => {
    const message = typeof e === 'object' && e && 'message' in e ? String((e as any).message) : String(e);
    setError(message);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!props.activeKey) return;
    const pageEl = pageRef.current;
    if (!pageEl) return;

    const r = pageEl.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;

    setDrag({ startX: x, startY: y, currentX: x, currentY: y, active: true });
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    e.preventDefault();
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!drag?.active) return;
    const pageEl = pageRef.current;
    if (!pageEl) return;

    const r = pageEl.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;

    setDrag((prev) => (prev ? { ...prev, currentX: x, currentY: y } : prev));
    e.preventDefault();
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!drag?.active) return;
    const size = containerSize;
    if (!size) {
      setDrag(null);
      return;
    }

    const rect = selectionRectPx;
    setDrag(null);

    if (!rect) return;
    if (rect.w < 6 || rect.h < 6) return;

    const hs = normalizeRect(rect, size);
    props.onSelectHotspot(hs);
    e.preventDefault();
  };

  const overlayBoxes = useMemo(() => {
    const size = containerSize;
    if (!size)
      return [] as Array<{ k: string; label: string; x: number; y: number; w: number; h: number; active: boolean }>;

    return props.overlays
      .filter((o) => o.hotspot && o.hotspot.w > 0 && o.hotspot.h > 0)
      .map((o) => {
        const hs = o.hotspot!;
        return {
          k: o.key,
          label: o.label,
          x: hs.x * size.w,
          y: hs.y * size.h,
          w: hs.w * size.w,
          h: hs.h * size.h,
          active: o.key === props.activeKey,
        };
      });
  }, [props.overlays, props.activeKey, containerSize]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold tracking-tight">Hotspot picker</div>
          <div className="mt-1 text-xs text-slate-500">
            Select a dimension, then drag a rectangle on the PDF where that label/measurement is shown.
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-slate-600">Zoom</label>
          <input
            type="range"
            min={0.75}
            max={2.0}
            step={0.05}
            value={scale}
            onChange={(e) => setScale(Number(e.target.value))}
          />
          <div className="text-xs text-slate-600 w-10 text-right">{Math.round(scale * 100)}%</div>
        </div>
      </div>

      {!props.activeKey ? (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-950">
          Choose a step above to set its hotspot.
        </div>
      ) : null}

      {error ? (
        <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-950">
          Failed to render PDF: {error}
        </div>
      ) : null}

      <div ref={wrapRef} className="mt-4">
        <div ref={pageRef} className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          <div
            className="absolute inset-0 z-20"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            style={{ touchAction: 'none' }}
          />

          <div className="absolute inset-0 z-10 pointer-events-none">
            {overlayBoxes.map((b) => (
              <div
                key={b.k}
                className={`absolute rounded border ${
                  b.active ? 'border-emerald-600 bg-emerald-500/10' : 'border-sky-600 bg-sky-500/10'
                }`}
                style={{ left: b.x, top: b.y, width: b.w, height: b.h }}
              >
                <div
                  className={`absolute -top-6 left-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                    b.active ? 'bg-emerald-600 text-white' : 'bg-sky-600 text-white'
                  }`}
                >
                  {b.label}
                </div>
              </div>
            ))}

            {selectionRectPx && containerSize ? (
              <div
                className="absolute rounded border-2 border-amber-500 bg-amber-500/10"
                style={{ left: selectionRectPx.x, top: selectionRectPx.y, width: selectionRectPx.w, height: selectionRectPx.h }}
              />
            ) : null}
          </div>

          <PdfPage
            pdfUrl={props.pdfUrl}
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
