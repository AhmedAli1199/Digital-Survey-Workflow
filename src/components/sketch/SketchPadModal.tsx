'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Stage, Layer, Rect, Ellipse, Line, Text, Transformer } from 'react-konva';
import type Konva from 'konva';

type Mode = 'shapes' | 'freehand';
type Tool = 'select' | 'rect' | 'circle' | 'triangle' | 'text' | 'pen' | 'eraser';

type BaseShape = {
  id: string;
  x: number;
  y: number;
  rotation?: number;
};

type RectShape = BaseShape & {
  type: 'rect';
  width: number;
  height: number;
};

type CircleShape = BaseShape & {
  type: 'circle';
  width: number;
  height: number;
};

type TriangleShape = BaseShape & {
  type: 'triangle';
  width: number;
  height: number;
};

type TextShape = BaseShape & {
  type: 'text';
  text: string;
  fontSize: number;
  width: number;
};

type StrokeShape = BaseShape & {
  type: 'stroke';
  points: number[];
  strokeWidth: number;
  strokeColor: string;
};

type Shape = RectShape | CircleShape | TriangleShape | TextShape | StrokeShape;

export type SketchDocV1 = {
  version: 1;
  shapes: Shape[];
  background?: { kind: 'blank' };
};

function uid() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function clampMinSize(v: number, min = 6) {
  return Math.abs(v) < min ? (v < 0 ? -min : min) : v;
}

function normalizeRect(startX: number, startY: number, endX: number, endY: number) {
  const x = Math.min(startX, endX);
  const y = Math.min(startY, endY);
  const width = Math.abs(endX - startX);
  const height = Math.abs(endY - startY);
  return { x, y, width, height };
}

function safeParseDoc(json: string | null | undefined): SketchDocV1 | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    if (parsed && parsed.version === 1 && Array.isArray(parsed.shapes)) return parsed as SketchDocV1;
    return null;
  } catch {
    return null;
  }
}

export function SketchPadModal(props: {
  open: boolean;
  title?: string;
  initialDocJson?: string | null;
  onClose: () => void;
  onSave: (result: { pngDataUrl: string; docJson: string }) => void;
}) {
  const initialDoc = useMemo(() => safeParseDoc(props.initialDocJson), [props.initialDocJson]);

  const [mode, setMode] = useState<Mode>('shapes');
  const [tool, setTool] = useState<Tool>('select');
  const [shapes, setShapes] = useState<Shape[]>(() => initialDoc?.shapes ?? []);
  const shapesRef = useRef<Shape[]>(shapes);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);

  const [penWidth, setPenWidth] = useState<number>(6);
  const [penColor, setPenColor] = useState<string>('#0f172a');

  const stageRef = useRef<Konva.Stage | null>(null);
  const layerRef = useRef<Konva.Layer | null>(null);
  const trRef = useRef<Konva.Transformer | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 1, h: 1 });

  const drawingRef = useRef<{
    shapeId: string;
    startX: number;
    startY: number;
    type: Exclude<Tool, 'select'>;
  } | null>(null);

  const undoRef = useRef<Shape[][]>([]);
  const redoRef = useRef<Shape[][]>([]);

  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editingTextValue, setEditingTextValue] = useState<string>('');

  useEffect(() => {
    shapesRef.current = shapes;
  }, [shapes]);

  useEffect(() => {
    if (!props.open) return;
    // Reset to initial doc when opening.
    setMode('shapes');
    setTool('select');
    setShapes(initialDoc?.shapes ?? []);
    setSelectedId(null);
    undoRef.current = [];
    redoRef.current = [];
    setPenWidth(6);
    setPenColor('#0f172a');
    setEditingTextId(null);
    setEditingTextValue('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.open]);

  useEffect(() => {
    if (!props.open) return;
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));
      setSize({ w, h });
    };

    // Ensure we have an initial size immediately.
    update();

    // Prefer ResizeObserver, but fall back for older mobile browsers.
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => update());
      ro.observe(el);
      return () => ro.disconnect();
    }

    let raf = 0;
    const onResize = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('orientationchange', onResize, { passive: true } as any);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize as any);
    };
  }, [props.open]);

  useEffect(() => {
    const stage = stageRef.current;
    const tr = trRef.current;
    if (!stage || !tr) return;

    const selectedShape = selectedId ? shapes.find((s) => s.id === selectedId) : null;
    // Don't attempt to transform strokes.
    if (selectedShape?.type === 'stroke') {
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
      return;
    }

    if (!selectedId) {
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
      return;
    }

    const node = stage.findOne((n: Konva.Node) => n.id() === selectedId) as Konva.Node | null;
    if (!node) {
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
      return;
    }

    tr.nodes([node]);
    tr.getLayer()?.batchDraw();
  }, [selectedId, shapes]);

  function pushUndo(next: Shape[]) {
    undoRef.current.push(next.map((s) => ({ ...s } as Shape)));
    if (undoRef.current.length > 50) undoRef.current.shift();
  }

  function commit(nextShapes: Shape[]) {
    pushUndo(shapesRef.current);
    redoRef.current = [];
    setShapes(nextShapes);
  }

  function undo() {
    const prev = undoRef.current.pop();
    if (!prev) return;
    redoRef.current.push(shapesRef.current);
    setShapes(prev);
    setSelectedId(null);
  }

  function redo() {
    const next = redoRef.current.pop();
    if (!next) return;
    undoRef.current.push(shapesRef.current);
    setShapes(next);
    setSelectedId(null);
  }

  function deleteSelected() {
    if (!selectedId) return;
    commit(shapes.filter((s) => s.id !== selectedId));
    setSelectedId(null);
  }

  function pointerPos() {
    const stage = stageRef.current;
    if (!stage) return null;
    const pos = stage.getPointerPosition();
    if (!pos) return null;
    return pos;
  }

  function onStageDown(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    if (editingTextId) return;

    const stage = e.target.getStage();
    if (!stage) return;

    const clickedOnEmpty = e.target === stage;
    if (tool === 'select') {
      if (clickedOnEmpty) setSelectedId(null);
      return;
    }

    const pos = stage.getPointerPosition();
    if (!pos) return;

    if (tool === 'text') {
      const id = uid();
      const next: TextShape = {
        id,
        type: 'text',
        x: pos.x,
        y: pos.y,
        width: 220,
        text: 'Tap to edit',
        fontSize: 18,
      };
      commit([...shapes, next]);
      setSelectedId(id);
      setEditingTextId(id);
      setEditingTextValue(next.text);
      return;
    }

    if (tool === 'pen' || tool === 'eraser') {
      const id = uid();
      const strokeColor = tool === 'eraser' ? '#ffffff' : penColor;
      const next: StrokeShape = {
        id,
        type: 'stroke',
        x: 0,
        y: 0,
        points: [pos.x, pos.y],
        strokeWidth: Math.max(2, Math.min(30, penWidth)),
        strokeColor,
      };
      drawingRef.current = { shapeId: id, startX: pos.x, startY: pos.y, type: tool };
      setShapes((prev) => [...prev, next]);
      setSelectedId(id);
      return;
    }

    const id = uid();
    drawingRef.current = { shapeId: id, startX: pos.x, startY: pos.y, type: tool };

    // Create a tiny placeholder shape (will expand on move)
    if (tool === 'rect') {
      setShapes((prev) => [...prev, { id, type: 'rect', x: pos.x, y: pos.y, width: 1, height: 1 }]);
    }
    if (tool === 'circle') {
      setShapes((prev) => [...prev, { id, type: 'circle', x: pos.x, y: pos.y, width: 1, height: 1 }]);
    }
    if (tool === 'triangle') {
      setShapes((prev) => [...prev, { id, type: 'triangle', x: pos.x, y: pos.y, width: 1, height: 1 }]);
    }
    setSelectedId(id);
  }

  function onStageMove() {
    const drawing = drawingRef.current;
    if (!drawing) return;
    const pos = pointerPos();
    if (!pos) return;

    if (drawing.type === 'pen' || drawing.type === 'eraser') {
      setShapes((prev) =>
        prev.map((s) => {
          if (s.id !== drawing.shapeId) return s;
          if (s.type !== 'stroke') return s;
          return { ...s, points: [...s.points, pos.x, pos.y] };
        }),
      );
      return;
    }

    const { x, y, width, height } = normalizeRect(drawing.startX, drawing.startY, pos.x, pos.y);

    setShapes((prev) =>
      prev.map((s) => {
        if (s.id !== drawing.shapeId) return s;
        if (s.type === 'text') return s;
        return { ...s, x, y, width: Math.max(1, width), height: Math.max(1, height) } as Shape;
      }),
    );
  }

  function onStageUp() {
    const drawing = drawingRef.current;
    if (!drawing) return;
    drawingRef.current = null;

    if (drawing.type === 'pen' || drawing.type === 'eraser') {
      const curr = shapesRef.current;
      const stroke = curr.find((s) => s.id === drawing.shapeId);
      if (!stroke || stroke.type !== 'stroke') return;
      if (stroke.points.length < 4) {
        commit(curr.filter((s) => s.id !== drawing.shapeId));
        setSelectedId(null);
        return;
      }
      commit(curr.map((s) => (s.id === stroke.id ? { ...s } : s)));
      return;
    }

    // If the user just tapped, we don't want a 1px object.
    const curr = shapesRef.current;
    const final = curr.find((s) => s.id === drawing.shapeId);
    if (!final || final.type === 'text') return;
    if (final.type === 'stroke') return;

    if (final.width < 8 && final.height < 8) {
      commit(curr.filter((s) => s.id !== drawing.shapeId));
      setSelectedId(null);
      return;
    }

    // Commit the shape as a completed action
    // (we re-set shapes to itself but via commit() so it lands in undo stack)
    commit(curr.map((s) => (s.id === final.id ? { ...s } : s)));
  }

  function onSelectShape(id: string) {
    setSelectedId(id);
    if (tool !== 'select') setTool('select');
  }

  function onDragEnd(id: string, e: Konva.KonvaEventObject<DragEvent>) {
    const node = e.target;
    const found = shapesRef.current.find((s) => s.id === id);
    if (!found) return;

    if (found.type === 'circle') {
      const x = node.x() - found.width / 2;
      const y = node.y() - found.height / 2;
      commit(shapes.map((s) => (s.id === id ? { ...s, x, y } : s)));
      return;
    }

    const x = node.x();
    const y = node.y();
    commit(shapesRef.current.map((s) => (s.id === id ? { ...s, x, y } : s)));
  }

  function onTransformEnd(id: string, e: Konva.KonvaEventObject<Event>) {
    const node = e.target as any;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    const found = shapesRef.current.find((s) => s.id === id);
    if (!found) return;

    // Reset scaling on the node so future transforms are correct.
    node.scaleX(1);
    node.scaleY(1);

    commit(
      shapesRef.current.map((s) => {
        if (s.id !== id) return s;
        if (s.type === 'text') {
          const x = node.x();
          const y = node.y();
          return { ...s, x, y, width: Math.max(80, (s.width ?? 220) * scaleX) };
        }

        if (s.type === 'circle') {
          const radiusX = Number(node.radiusX?.() ?? (s.width / 2));
          const radiusY = Number(node.radiusY?.() ?? (s.height / 2));
          const width = Math.max(1, Math.abs(radiusX * 2 * scaleX));
          const height = Math.max(1, Math.abs(radiusY * 2 * scaleY));
          const x = node.x() - width / 2;
          const y = node.y() - height / 2;
          return { ...s, x, y, width, height } as Shape;
        }

        const x = node.x();
        const y = node.y();
        const width = clampMinSize(node.width() * scaleX);
        const height = clampMinSize(node.height() * scaleY);
        return { ...s, x, y, width: Math.abs(width), height: Math.abs(height) } as Shape;
      }),
    );
  }

  function exportPngDataUrl() {
    const stage = stageRef.current;
    if (!stage) throw new Error('Sketch stage missing');
    // White background export
    const dataUrl = stage.toDataURL({ mimeType: 'image/png', pixelRatio: 2 });
    return dataUrl;
  }

  function handleSave() {
    const doc: SketchDocV1 = { version: 1, shapes, background: { kind: 'blank' } };
    const docJson = JSON.stringify(doc);
    const pngDataUrl = exportPngDataUrl();
    props.onSave({ pngDataUrl, docJson });
    props.onClose();
  }

  const gridLines = useMemo(() => {
    if (!showGrid) return [] as Array<{ x1: number; y1: number; x2: number; y2: number }>;
    const step = 40;
    const lines: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
    for (let x = 0; x <= size.w; x += step) lines.push({ x1: x, y1: 0, x2: x, y2: size.h });
    for (let y = 0; y <= size.h; y += step) lines.push({ x1: 0, y1: y, x2: size.w, y2: y });
    return lines;
  }, [showGrid, size.w, size.h]);

  if (!props.open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/50">
      <div className="fixed inset-0 grid grid-rows-[auto,1fr,auto] bg-white md:inset-6 md:rounded-2xl md:border md:border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold tracking-tight">{props.title ?? 'Sketch pad'}</div>
            <div className="mt-0.5 text-xs text-slate-500">Draw shapes and add typed dimensions. Best on mobile in landscape.</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={props.onClose}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-50"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Save sketch
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[240px,1fr]">
          <div className="border-b border-slate-200 bg-slate-50 p-3 md:border-b-0 md:border-r">
            <div className="grid gap-3">
              <div>
                <div className="text-xs font-semibold text-slate-600">Mode</div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(
                    [
                      { id: 'shapes', label: 'Shapes' },
                      { id: 'freehand', label: 'Freehand' },
                    ] as Array<{ id: Mode; label: string }>
                  ).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setMode(m.id);
                        setSelectedId(null);
                        setEditingTextId(null);
                        setEditingTextValue('');
                        setTool(m.id === 'freehand' ? 'pen' : 'select');
                      }}
                      className={
                        mode === m.id
                          ? 'rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white'
                          : 'rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-50'
                      }
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-600">Tools</div>
                {mode === 'shapes' ? (
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {(
                      [
                        { id: 'select', label: 'Select' },
                        { id: 'rect', label: 'Rect' },
                        { id: 'circle', label: 'Circle' },
                        { id: 'triangle', label: 'Triangle' },
                        { id: 'text', label: 'Text' },
                      ] as Array<{ id: Tool; label: string }>
                    ).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTool(t.id)}
                        className={
                          tool === t.id
                            ? 'rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white'
                            : 'rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-50'
                        }
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 grid gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      {(
                        [
                          { id: 'pen', label: 'Pen' },
                          { id: 'eraser', label: 'Eraser' },
                        ] as Array<{ id: Tool; label: string }>
                      ).map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setTool(t.id)}
                          className={
                            tool === t.id
                              ? 'rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white'
                              : 'rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-50'
                          }
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-600">Stroke width: {penWidth}px</label>
                      <input
                        type="range"
                        min={2}
                        max={24}
                        step={1}
                        value={penWidth}
                        onChange={(e) => setPenWidth(Number(e.target.value))}
                        className="mt-1 w-full"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-600">Pen color</label>
                      <input
                        type="color"
                        value={penColor}
                        onChange={(e) => setPenColor(e.target.value)}
                        className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-2"
                        disabled={tool === 'eraser'}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={undo}
                  disabled={undoRef.current.length === 0}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 enabled:hover:bg-slate-50 disabled:opacity-50"
                >
                  Undo
                </button>
                <button
                  type="button"
                  onClick={redo}
                  disabled={redoRef.current.length === 0}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 enabled:hover:bg-slate-50 disabled:opacity-50"
                >
                  Redo
                </button>
                <button
                  type="button"
                  onClick={deleteSelected}
                  disabled={!selectedId}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 enabled:hover:bg-rose-50 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-700">
                <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />
                Show grid
              </label>

              <div className="text-xs text-slate-600">
                Tips:
                {mode === 'shapes' ? (
                  <>
                    <div className="mt-1">• Use Select to move/resize.</div>
                    <div>• Tap Text then tap canvas to place.</div>
                    <div>• Double-tap text to edit.</div>
                  </>
                ) : (
                  <>
                    <div className="mt-1">• Use Pen for freehand drawing.</div>
                    <div>• Use Eraser to remove parts.</div>
                    <div>• Undo/Redo works for strokes.</div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div ref={containerRef} className="relative min-h-[50vh] bg-white" style={{ touchAction: 'none' }}>
            <Stage
              ref={(n) => {
                stageRef.current = n;
              }}
              width={size.w}
              height={size.h}
              onMouseDown={onStageDown}
              onTouchStart={onStageDown}
              onMouseMove={onStageMove}
              onTouchMove={onStageMove}
              onMouseUp={onStageUp}
              onTouchEnd={onStageUp}
            >
              <Layer
                ref={(n) => {
                  layerRef.current = n;
                }}
              >
                <Rect x={0} y={0} width={size.w} height={size.h} fill="#ffffff" listening={false} />

                {gridLines.map((l, i) => (
                  <Line
                    key={i}
                    points={[l.x1, l.y1, l.x2, l.y2]}
                    stroke="#e2e8f0"
                    strokeWidth={1}
                    listening={false}
                  />
                ))}

                {shapes.map((s) => {
                  const isSelected = s.id === selectedId;

                  if (s.type === 'stroke') {
                    return (
                      <Line
                        key={s.id}
                        id={s.id}
                        points={s.points}
                        stroke={s.strokeColor}
                        strokeWidth={s.strokeWidth}
                        lineCap="round"
                        lineJoin="round"
                        tension={0.35}
                        draggable={false}
                        onClick={() => onSelectShape(s.id)}
                        onTap={() => onSelectShape(s.id)}
                        opacity={isSelected ? 0.9 : 1}
                      />
                    );
                  }

                  const common = {
                    id: s.id,
                    x: s.x,
                    y: s.y,
                    rotation: s.rotation ?? 0,
                    draggable: tool === 'select' && mode === 'shapes',
                    onClick: () => onSelectShape(s.id),
                    onTap: () => onSelectShape(s.id),
                    onDragEnd: (e: any) => onDragEnd(s.id, e),
                    onTransformEnd: (e: any) => onTransformEnd(s.id, e),
                    stroke: isSelected ? '#0f172a' : '#334155',
                    strokeWidth: isSelected ? 2 : 2,
                  };

                  if (s.type === 'rect') {
                    return <Rect key={s.id} {...common} width={s.width} height={s.height} fill="#ffffff" />;
                  }

                  if (s.type === 'circle') {
                    return (
                      <Ellipse
                        key={s.id}
                        {...common}
                        x={s.x + s.width / 2}
                        y={s.y + s.height / 2}
                        radiusX={Math.max(1, s.width / 2)}
                        radiusY={Math.max(1, s.height / 2)}
                        fill="#ffffff"
                      />
                    );
                  }

                  if (s.type === 'triangle') {
                    const w = s.width;
                    const h = s.height;
                    return (
                      <Line
                        key={s.id}
                        {...common}
                        points={[0, h, w / 2, 0, w, h]}
                        closed
                        fill="#ffffff"
                        width={w}
                        height={h}
                      />
                    );
                  }

                  return (
                    <Text
                      key={s.id}
                      {...common}
                      width={s.width}
                      text={s.text}
                      fontSize={s.fontSize}
                      fill="#0f172a"
                      strokeEnabled={false}
                      onDblClick={() => {
                        setEditingTextId(s.id);
                        setEditingTextValue(s.text);
                        setSelectedId(s.id);
                      }}
                      onDblTap={() => {
                        setEditingTextId(s.id);
                        setEditingTextValue(s.text);
                        setSelectedId(s.id);
                      }}
                    />
                  );
                })}

                <Transformer
                  ref={(n) => {
                    trRef.current = n;
                  }}
                  rotateEnabled
                  keepRatio={false}
                  anchorSize={12}
                  enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right', 'top-center', 'bottom-center']}
                />
              </Layer>
            </Stage>

            {editingTextId ? (
              <div className="pointer-events-auto absolute inset-x-0 bottom-0 border-t border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-semibold text-slate-600">Edit text</div>
                  <button
                    type="button"
                    className="text-xs font-semibold text-slate-700 underline decoration-slate-200 underline-offset-4 hover:decoration-slate-700"
                    onClick={() => {
                      setEditingTextId(null);
                      setEditingTextValue('');
                    }}
                  >
                    Cancel
                  </button>
                </div>
                <textarea
                  value={editingTextValue}
                  onChange={(e) => setEditingTextValue(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                  rows={2}
                  placeholder="Type dimensions/notes..."
                />
                <div className="mt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const id = editingTextId;
                      if (!id) return;
                      const next = shapes.map((s) => (s.id === id && s.type === 'text' ? { ...s, text: editingTextValue } : s));
                      commit(next);
                      setEditingTextId(null);
                      setEditingTextValue('');
                    }}
                    className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    Apply
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
          <div className="text-xs text-slate-500">Shapes: {shapes.length}</div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                commit([]);
                setSelectedId(null);
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-50"
            >
              Clear all
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Save sketch
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
