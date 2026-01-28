import sharp from 'sharp';

/**
 * server-side Watermarking Service
 * Uses 'sharp' to burn watermarks permanently into image pixels.
 * This cannot be removed by layer manipulation.
 */

export async function compositeWatermark(
  originalImageBuffer: Buffer,
  userId: string,
  companyName: string,
  jobRef: string
): Promise<Buffer> {
  // 1. Get dimensions
  const image = sharp(originalImageBuffer);
  const metadata = await image.metadata();
  const width = metadata.width || 1000;
  const height = metadata.height || 1000;

  // 2. Generate Dynamic SVG Overlay
  // We include:
  // - Diagonal Repeating Text (Red, semi-transparent)
  // - Footer Warning Strip (White bg, Black text)
  // - Hidden Fingerprint (Tiny opaque text)
  
  const dateStr = new Date().toISOString().split('T')[0];
  const diagonalText = `LICENSED TO: ${companyName.toUpperCase()} - ${userId}`;
  const footerText = `© TES - PROPRIETARY SYSTEM | JOB: ${jobRef} | ${dateStr}`;
  
  // Calculate diagonals (Basic repetition logic)
  let diagonalSvgContent = '';
  const rows = 4;
  const cols = 2;
  const tileW = width / cols;
  const tileH = height / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = (c * tileW) + (tileW / 2);
      const y = (r * tileH) + (tileH / 2);
      diagonalSvgContent += `
        <text 
          x="${x}" 
          y="${y}" 
          font-family="Arial, sans-serif" 
          font-size="${Math.floor(width * 0.04)}" 
          font-weight="bold" 
          fill="rgba(255, 0, 0, 0.15)" 
          text-anchor="middle" 
          transform="rotate(-30, ${x}, ${y})"
        >
          ${diagonalText}
        </text>
        <text 
          x="${x}" 
          y="${y + 40}" 
          font-family="Arial, sans-serif" 
          font-size="${Math.floor(width * 0.03)}" 
          fill="rgba(0, 0, 0, 0.2)" 
          text-anchor="middle" 
          transform="rotate(-30, ${x}, ${y})"
        >
          UNAUTHORIZED REPRODUCTION PROHIBITED
        </text>
      `;
    }
  }

  const svgOverlay = `
    <svg width="${width}" height="${height}">
      <!-- 1. Diagonal Pattern -->
      ${diagonalSvgContent}

      <!-- 2. Footer Bar -->
      <rect x="0" y="${height - 40}" width="${width}" height="40" fill="rgba(255,255,255,0.9)" />
      <text 
        x="${width / 2}" 
        y="${height - 15}" 
        font-family="monospace" 
        font-size="14" 
        fill="#000" 
        text-anchor="middle"
      >
        ${footerText}
      </text>

      <!-- 3. Hidden Forensic Fingerprint (Tiny, low opacity) -->
      <text 
        x="10" 
        y="10" 
        font-size="5" 
        fill="rgba(0,0,0,0.01)"
      >
        ${userId}_${Date.now()}
      </text>
    </svg>
  `;

  // 3. Composite and Return
  const buffer = await image
    .composite([
      { input: Buffer.from(svgOverlay), top: 0, left: 0 }
    ])
    .png() // Force output as PNG to prevent compression artifacting logic
    .toBuffer();

  // SAFETY: Do NOT console.log(buffer) here as it will crash the terminal
  return buffer;
}
