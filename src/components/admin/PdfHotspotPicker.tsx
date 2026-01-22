/*
  IMPORTANT:
  react-pdf/pdfjs can crash when evaluated in the Node.js/SSR environment (DOMMatrix not defined).
  This wrapper uses a dynamic import with ssr:false so PDF rendering happens only in the browser.
*/

'use client';

import dynamic from 'next/dynamic';
import type { HotspotOverlay, NormalizedHotspot } from '@/components/admin/PdfHotspotPickerTypes';

export type { HotspotOverlay, NormalizedHotspot };

const PdfHotspotPickerClient = dynamic(
  () => import('@/components/admin/PdfHotspotPickerImpl').then((m) => m.PdfHotspotPickerImpl),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="text-sm font-semibold tracking-tight">Hotspot picker</div>
        <div className="mt-2 text-sm text-slate-600">Loading PDF renderer…</div>
      </div>
    ),
  },
);

export function PdfHotspotPicker(props: {
  pdfUrl: string;
  overlays: HotspotOverlay[];
  activeKey: string | null;
  onSelectHotspot: (hotspot: NormalizedHotspot) => void;
}) {
  return <PdfHotspotPickerClient {...props} />;
}
