'use client';

import { useWatermark } from '@/components/security/WatermarkProvider';
import { WatermarkOverlay } from '@/components/security/WatermarkOverlay';

export function DiagramViewer(props: { title?: string; url: string }) {
  const { userRole } = useWatermark();
  const canOpenSource = userRole !== 'client';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold tracking-tight">{props.title ?? 'Reference drawing'}</div>
          <div className="mt-1 text-xs text-slate-500">
            Use the drawing labels to capture the correct dimensions.
          </div>
        </div>
        {canOpenSource ? (
          <a
            href={props.url}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-slate-900 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-900"
          >
            Open PDF
          </a>
        ) : null}
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
        <div className="relative">
          <object data={props.url} type="application/pdf" className="h-[520px] w-full">
          <div className="p-4 text-sm text-slate-700">
            PDF preview not available in this browser.{' '}
            {canOpenSource ? (
              <a
                href={props.url}
                target="_blank"
                rel="noreferrer"
                className="font-semibold underline decoration-slate-300 underline-offset-4"
              >
                Open the PDF
              </a>
            ) : (
              <span className="font-semibold">Contact TES for access.</span>
            )}
            .
          </div>
          </object>

          {/* Watermark overlay for on-screen viewing (not a download). */}
          <WatermarkOverlay className="z-10" />
        </div>
      </div>
    </div>
  );
}
