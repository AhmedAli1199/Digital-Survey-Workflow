'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Stage, Layer, Image as KonvaImage, Text, Group, Rect } from 'react-konva';
import useImage from 'use-image';
import { useWatermark } from './WatermarkProvider';

interface SecureCanvasProps {
  imageUrl: string;
  width?: number; // Optional forced width, otherwise responsive
  height?: number;
  className?: string;
}

export default function SecureCanvas({ imageUrl, width, height, className }: SecureCanvasProps) {
  const { userRole, userId, companyName } = useWatermark();
  const [image] = useImage(imageUrl, 'anonymous'); // Check CORS policies if images are external
  
  // Responsive sizing logic
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!image || !containerRef.current) return;

    const updateSize = () => {
      if (!containerRef.current || !image) return;
      
      const containerW = containerRef.current.offsetWidth;
      
      // Safety: Prevent excessive sizes or Zero/NaN issues
      if (image.height === 0 || image.width === 0) return;
      
      const aspectRatio = image.width / image.height;
      
      const computedWidth = width || containerW || 300; // Fallback width
      const computedHeight = height || (computedWidth / aspectRatio);

      // Verify finite numbers before setting state
      if (Number.isFinite(computedWidth) && Number.isFinite(computedHeight) && computedWidth > 0 && computedHeight > 0) {
        setStageSize({ width: computedWidth, height: computedHeight });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [image, width, height]);

  // Prevent Context Menu (Right Click Save)
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  if (!image) {
    return (
      <div className={`flex items-center justify-center bg-slate-100 text-slate-400 ${className}`} style={{ minHeight: 400 }}>
         Loading secure asset...
      </div>
    );
  }

  // --- WATERMARK CONFIGURATION ---
  const dateStr = new Date().toISOString().split('T')[0];
  const timeStr = new Date().toLocaleTimeString();
  
  // 1. Footer Text (Always Visible)
  const footerText = `© TES - PROPRIETARY SURVEY & MANUFACTURING SYSTEM | ${companyName.toUpperCase()} | ${dateStr}`;

  // 2. Diagonal Pattern (For Client/Export modes)
  // We explicitly HIDE this for 'internal' staff to keep "drawings clean and easy to use"
  const showDiagonals = userRole !== 'internal'; 

  // Generate diagonal repetitions
  const DiagonalWatermark = () => {
    if (!showDiagonals) return null;

    const watermarkText = "TES - PROPRIETARY SYSTEM\nUNAUTHORIZED USE PROHIBITED";
    const rows = 4;
    const cols = 2;
    const tileW = stageSize.width / cols;
    const tileH = stageSize.height / rows;

    const tiles = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        tiles.push(
          <Group 
            key={`${r}-${c}`} 
            x={(c * tileW) + (tileW / 2)} 
            y={(r * tileH) + (tileH / 2)}
            rotation={-30}
            opacity={0.12} 
          >
             <Text
                text={watermarkText}
                fontSize={16}
                fontStyle="bold"
                fill="red" 
                align="center"
                offsetX={150} // Approximate center offset
                offsetY={20}
             />
             <Text
                text={`For: ${companyName}`}
                y={40}
                fontSize={12}
                fill="black"
                align="center"
                 offsetX={50}
             />
          </Group>
        );
      }
    }
    return <>{tiles}</>;
  };

  return (
    <div 
      ref={containerRef} 
      className={`relative overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm select-none ${className}`}
      onContextMenu={handleContextMenu}
    >
      <Stage width={stageSize.width} height={stageSize.height}>
        <Layer>
          {/* 1. Base Image */}
          <KonvaImage 
            image={image} 
            width={stageSize.width} 
            height={stageSize.height} 
          />

          {/* 2. Background Brand "Faded TES Logo" Simulation */}
          {/* You could add a faint centralized logo here if you had the asset. 
              For now we simulate effectively with a large text or shape if needed, 
              but relying on diagonals is usually sufficient for v1. 
          */}

          {/* 3. Diagonal Watermarks (Conditional) */}
          <DiagonalWatermark />

          {/* 4. Footer Bar (Mandatory) */}
          <Rect
            x={0}
            y={stageSize.height - 30}
            width={stageSize.width}
            height={30}
            fill="rgba(255, 255, 255, 0.85)"
          />
          <Text
            text={footerText}
            x={10}
            y={stageSize.height - 20}
            fontSize={10}
            fill="#333"
            fontFamily="monospace"
          />
        </Layer>
      </Stage>
      
      {/* HTML Overlay for "Blind" Watermark injection (Invisible to user, but present in DOM snapshot if they screenshot) */}
      <div 
         className="pointer-events-none absolute inset-0 opacity-[0.01]"
         style={{ 
           backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' version='1.1' height='100px' width='100px'><text transform='translate(20, 100) rotate(-45)' fill='rgb(0,0,0)' font-size='12'>${userId}</text></svg>")` 
         }}
      />
    </div>
  );
}
