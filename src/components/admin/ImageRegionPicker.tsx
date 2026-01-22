'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

export type NormalizedRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function normalizeRect(
  rectPx: { x: number; y: number; w: number; h: number },
  container: { w: number; h: number },
): NormalizedRect {
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

export function ImageRegionPicker(props: {
  imageUrl: string;
  value: NormalizedRect | null;
  title?: string;
  description?: string;
  onChange: (next: NormalizedRect) => void;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [drag, setDrag] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    active: boolean;
  } | null>(null);

  const containerSize = useMemo(() => {
    const el = imgRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { w: r.width, h: r.height, left: r.left, top: r.top };
  }, [props.imageUrl, drag?.active]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => {
      // force re-render for containerSize memo
      setDrag((prev) => (prev ? { ...prev } : prev));
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

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

  function toLocalPoint(e: React.PointerEvent) {
    const img = imgRef.current;
    if (!img) return null;
    const r = img.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height };
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div>
        <div className="text-sm font-semibold tracking-tight">{props.title ?? 'Select region'}</div>
        {props.description ? <div className="mt-1 text-xs text-slate-500">{props.description}</div> : null}
      </div>

      <div ref={wrapRef} className="mt-4">
        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          <img
            ref={imgRef}
            src={props.imageUrl}
            alt="Diagram"
            className="block h-auto w-full select-none"
            draggable={false}
          />

          {/* pointer layer */}
          <div
            className="absolute inset-0 z-10"
            style={{ touchAction: 'none' }}
            onPointerDown={(e) => {
              const p = toLocalPoint(e);
              if (!p) return;
              setDrag({ startX: p.x, startY: p.y, currentX: p.x, currentY: p.y, active: true });
              (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
              e.preventDefault();
            }}
            onPointerMove={(e) => {
              if (!drag?.active) return;
              const p = toLocalPoint(e);
              if (!p) return;
              setDrag((prev) => (prev ? { ...prev, currentX: p.x, currentY: p.y } : prev));
              e.preventDefault();
            }}
            onPointerUp={(e) => {
              if (!drag?.active) return;
              const p = toLocalPoint(e);
              const img = imgRef.current;
              const r = img?.getBoundingClientRect();
              const rect = selectionRectPx;
              setDrag(null);

              if (!rect || !r) return;
              if (rect.w < 12 || rect.h < 12) return;

              const norm = normalizeRect(rect, { w: r.width, h: r.height });
              props.onChange(norm);
              e.preventDefault();
            }}
          />

          {/* existing rect */}
          {props.value ? (
            <div
              className="absolute z-20 rounded border-2 border-fuchsia-600 bg-fuchsia-500/10"
              style={{
                left: `${props.value.x * 100}%`,
                top: `${props.value.y * 100}%`,
                width: `${props.value.w * 100}%`,
                height: `${props.value.h * 100}%`,
              }}
            />
          ) : null}

          {/* selection preview */}
          {selectionRectPx && containerSize ? (
            <div
              className="absolute z-30 rounded border-2 border-amber-500 bg-amber-500/10"
              style={{
                left: selectionRectPx.x,
                top: selectionRectPx.y,
                width: selectionRectPx.w,
                height: selectionRectPx.h,
              }}
            />
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-slate-600">
          Drag a rectangle on the image. This will be used as the input table area on mobile.
        </div>
        {props.value ? (
          <button
            type="button"
            onClick={() => props.onChange({ x: 0, y: 0, w: 0, h: 0 })}
            className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-50"
          >
            Clear
          </button>
        ) : null}
      </div>
    </div>
  );
}
