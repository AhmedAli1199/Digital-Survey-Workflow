/*
  react-pdf/pdfjs can crash when evaluated in the Node.js/SSR environment (DOMMatrix not defined).
  This wrapper uses a dynamic import with ssr:false so PDF rendering happens only in the browser.
*/

'use client';

import dynamic from 'next/dynamic';

export const Level2DiagramEntry = dynamic(
  () => import('@/components/assets/Level2DiagramEntryImpl').then((m) => m.Level2DiagramEntryImpl),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="text-sm font-semibold tracking-tight">Diagram entry</div>
        <div className="mt-2 text-sm text-slate-600">Loading diagram…</div>
      </div>
    ),
  },
);
