'use client';

import { useMemo } from 'react';
import { useWatermark } from './WatermarkProvider';

export function WatermarkOverlay(props: { className?: string; includeFooter?: boolean }) {
  const { userRole, userId, companyName } = useWatermark();

  // Keep drawings clean for internal staff.
  const showDiagonals = userRole !== 'internal';
  const includeFooter = props.includeFooter ?? true;

  const dateStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const svgDataUrl = useMemo(() => {
    const brandLine1 = 'TES - PROPRIETARY SYSTEM';
    const brandLine2 = `LICENSED TO: ${companyName.toUpperCase()}`;
    const brandLine3 = `USER: ${userId}`;

    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="520" height="320">
  <rect width="100%" height="100%" fill="transparent" />
  <g opacity="0.18" transform="translate(260 160) rotate(-30)">
    <text x="0" y="-18" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#d10000">${brandLine1}</text>
    <text x="0" y="10" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#111">${brandLine2}</text>
    <text x="0" y="34" text-anchor="middle" font-family="monospace" font-size="12" fill="#111">${brandLine3}</text>
  </g>
</svg>`;

    // Encode safely for CSS url().
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }, [companyName, userId]);

  return (
    <div className={`pointer-events-none absolute inset-0 ${props.className ?? ''}`.trim()}>
      {showDiagonals ? (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: svgDataUrl,
            backgroundRepeat: 'repeat',
            backgroundSize: '520px 320px',
            opacity: 0.18,
          }}
        />
      ) : null}

      {includeFooter ? (
        <div className="absolute inset-x-0 bottom-0 bg-white/80 px-3 py-2 text-[11px] font-semibold text-slate-700 backdrop-blur">
          © TES — Proprietary reference material • {companyName.toUpperCase()} • {dateStr}
        </div>
      ) : null}
    </div>
  );
}
