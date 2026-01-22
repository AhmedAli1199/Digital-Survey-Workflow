/*
  react-pdf/pdfjs can crash when evaluated in the Node.js/SSR environment (DOMMatrix not defined).
  This wrapper uses a dynamic import with ssr:false so PDF rendering happens only in the browser.
*/

'use client';

import dynamic from 'next/dynamic';

export const DiagramHotspotViewer = dynamic(
  () => import('@/components/assets/DiagramHotspotViewerImpl').then((m) => m.DiagramHotspotViewerImpl),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="text-sm font-semibold tracking-tight">Reference drawing</div>
        <div className="mt-2 text-sm text-slate-600">Loading diagram…</div>
      </div>
    ),
  },
);
