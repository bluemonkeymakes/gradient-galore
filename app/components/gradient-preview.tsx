import { useRef, useCallback } from "react";
import { useAtom, useAtomValue } from "jotai";
import { gradientAtom, activeColorTargetAtom, showHandlesAtom } from "~/lib/atoms";
import { generateCSS, generateBgGradientCSS, hexToRgba, type AuraPoint, type MeshPoint } from "~/lib/gradient-engine";
import { MarbleCanvas } from "~/components/marble-canvas";
import { NoiseOverlay } from "~/components/noise-overlay";

function AuraBlobLayer({ point }: { point: AuraPoint }) {
  const ratio = (point.stretch ?? 50) / 50;
  const w = point.size * ratio * 0.5;
  const h = point.size * (2 - ratio) * 0.5;
  const fadeEnd = Math.round(Math.max(w, h) * 0.7);
  const color = hexToRgba(point.color, point.opacity);
  const fadeMid = hexToRgba(point.color, point.opacity * 0.4);

  return (
    <div
      className="absolute -inset-1/2 pointer-events-none"
      style={{
        backgroundImage: `radial-gradient(ellipse ${w}% ${h}% at 50% 50%, ${color} 0%, ${fadeMid} ${fadeEnd}%, transparent 100%)`,
        transform: `translate(${(point.x - 50) * 0.5}%, ${(point.y - 50) * 0.5}%) rotate(${point.rotate ?? 0}deg)`,
      }}
    />
  );
}

function MeshBlobLayer({ point }: { point: MeshPoint }) {
  const ratio = (point.stretch ?? 50) / 50;
  const w = point.spread * ratio * 0.5;
  const h = point.spread * (2 - ratio) * 0.5;
  const color = point.opacity < 100 ? hexToRgba(point.color, point.opacity) : point.color;

  return (
    <div
      className="absolute -inset-1/2 pointer-events-none"
      style={{
        backgroundImage: `radial-gradient(ellipse ${w}% ${h}% at 50% 50%, ${color} 0%, transparent 100%)`,
        transform: `translate(${(point.x - 50) * 0.5}%, ${(point.y - 50) * 0.5}%) rotate(${point.rotate ?? 0}deg)`,
      }}
    />
  );
}

/** Draggable point handles shown on the canvas for aura/mesh */
function DragHandles() {
  const showHandles = useAtomValue(showHandlesAtom);
  const [state, setState] = useAtom(gradientAtom);
  const [activeTarget, setActiveTarget] = useAtom(activeColorTargetAtom);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<{ type: "aura" | "mesh"; id: string } | null>(null);

  const getPercent = useCallback((e: React.PointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 50, y: 50 };
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    return { x: Math.round(x), y: Math.round(y) };
  }, []);

  const onPointerDown = useCallback((type: "aura" | "mesh", id: string, e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragging.current = { type, id };
    setActiveTarget({ type, id });
  }, [setActiveTarget]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const { x, y } = getPercent(e);
    const { type, id } = dragging.current;
    setState((prev) => {
      if (type === "aura") {
        return { ...prev, auraPoints: prev.auraPoints.map((p) => p.id === id ? { ...p, x, y } : p) };
      }
      return { ...prev, meshPoints: prev.meshPoints.map((p) => p.id === id ? { ...p, x, y } : p) };
    });
  }, [getPercent, setState]);

  const onPointerUp = useCallback(() => {
    dragging.current = null;
  }, []);

  if (!showHandles || (state.type !== "aura" && state.type !== "mesh")) return null;

  const points = state.type === "aura"
    ? state.auraPoints.filter((p) => p.visible !== false).map((p) => ({ ...p, ptype: "aura" as const }))
    : state.meshPoints.filter((p) => p.visible !== false).map((p) => ({ ...p, ptype: "mesh" as const }));

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-20"
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      {points.map((p) => {
        const isActive = activeTarget?.type === p.ptype && "id" in activeTarget && activeTarget.id === p.id;
        return (
          <div
            key={p.id}
            className={`absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 cursor-grab active:cursor-grabbing transition-shadow ${
              isActive
                ? "border-white bg-accent shadow-lg shadow-accent/40"
                : "border-white/60 bg-white/20 hover:bg-white/40"
            }`}
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            onPointerDown={(e) => onPointerDown(p.ptype, p.id, e)}
          />
        );
      })}
    </div>
  );
}

export function GradientPreview() {
  const state = useAtomValue(gradientAtom);
  const css = generateCSS(state);
  const bgGradientCss = generateBgGradientCSS(state);

  const hasRotatedBlobs =
    (state.type === "aura" && state.auraPoints.some((p) => p.visible !== false && (p.rotate ?? 0) !== 0)) ||
    (state.type === "mesh" && state.meshPoints.some((p) => p.visible !== false && (p.rotate ?? 0) !== 0));

  // Use separate div layers when blobs have rotation OR when bg gradient is enabled
  const useBlobs = (state.type === "aura" || state.type === "mesh") && (hasRotatedBlobs || !!bgGradientCss);

  const baseStyle: React.CSSProperties =
    useBlobs
      ? { backgroundColor: state.type === "aura" ? state.auraBgColor : state.meshBgColor }
      : state.type === "aura"
        ? { backgroundColor: state.auraBgColor, backgroundImage: css }
        : state.type === "mesh"
          ? { backgroundColor: state.meshBgColor, backgroundImage: css }
          : state.type === "marble"
            ? {}
            : { background: css };

  return (
    <div id="gradient-preview" className="relative w-full aspect-4/3 max-h-lg rounded-2xl overflow-hidden checkerboard">
      {state.type === "marble" ? (
        <MarbleCanvas />
      ) : (
        <div
          className="absolute inset-0 overflow-hidden rounded-2xl"
          style={baseStyle}
        >
          {/* Background gradient layer under blobs */}
          {bgGradientCss && useBlobs && (
            <div
              className="absolute inset-0 z-0"
              style={{ backgroundImage: bgGradientCss }}
            />
          )}
          {useBlobs && state.type === "aura" &&
            state.auraPoints.filter((p) => p.visible !== false).map((p) => <AuraBlobLayer key={p.id} point={p} />)}
          {useBlobs && state.type === "mesh" &&
            state.meshPoints.filter((p) => p.visible !== false).map((p) => <MeshBlobLayer key={p.id} point={p} />)}
        </div>
      )}
      <NoiseOverlay />
      <DragHandles />
    </div>
  );
}
