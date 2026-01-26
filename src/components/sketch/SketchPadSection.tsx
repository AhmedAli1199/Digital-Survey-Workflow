'use client';

import { useMemo, useState } from 'react';
import { SketchPadModal } from '@/components/sketch/SketchPadModal';

export function SketchPadSection(props: {
  title?: string;
  initialDocJson?: string | null;
  existingSketchUrl?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [pngDataUrl, setPngDataUrl] = useState<string>('');
  const [docJson, setDocJson] = useState<string>(props.initialDocJson ?? '');

  // "hasLocalChange" means user just drew something
  const hasLocalChange = Boolean(pngDataUrl);
  // "hasExisting" means there was a sketch saved previously
  const hasExisting = Boolean(props.existingSketchUrl);
  
  // Overall sketch state for UI toggles
  const hasSketch = hasLocalChange || hasExisting;

  const approxSize = useMemo(() => {
    if (!pngDataUrl) return null;
    const m = pngDataUrl.match(/base64,(.+)$/);
    if (!m) return null;
    const b64 = m[1] ?? '';
    return Math.round((b64.length * 3) / 4);
  }, [pngDataUrl]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold tracking-tight">{props.title ?? 'Sketch / obstruction drawing (optional)'}</div>
          <div className="mt-1 text-xs text-slate-500">
            Use this for unusual cut-outs, protrusions, uni-strut, or anything not covered by standard dimensions.
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
          >
            {hasSketch ? 'Edit sketch' : 'Open sketch pad'}
          </button>
          {hasSketch ? (
            <button
              type="button"
              onClick={() => {
                setPngDataUrl('');
                setDocJson('');
              }}
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"
            >
              Start over
            </button>
          ) : null}
        </div>
      </div>

      <input type="hidden" name="sketch_png_data_url" value={pngDataUrl} />
      <input type="hidden" name="sketch_doc_json" value={docJson} />

      {pngDataUrl ? (
        <div className="mt-4">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            <img src={pngDataUrl} alt="Sketch preview" className="h-auto w-full" />
          </div>
          <div className="mt-2 text-xs text-slate-500">
            New sketch ready to save{approxSize ? ` (~${Math.round(approxSize / 1024)}KB)` : ''}.
          </div>
        </div>
      ) : props.existingSketchUrl ? (
        <div className="mt-4">
           <div className="text-xs font-semibold text-slate-500 mb-2">Current saved sketch:</div>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            <img src={props.existingSketchUrl} alt="Current sketch" className="h-auto w-full" />
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700">
          No sketch added.
        </div>
      )}

      <SketchPadModal
        open={open}
        title="Scratch pad"
        initialDocJson={docJson || props.initialDocJson}
        onClose={() => setOpen(false)}
        onSave={({ pngDataUrl, docJson }) => {
          setPngDataUrl(pngDataUrl);
          setDocJson(docJson);
        }}
      />
    </div>
  );
}
