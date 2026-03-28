import { useRef, useCallback } from "react";
import { useAtom, useAtomValue } from "jotai";
import { gradientAtom, activeColorTargetAtom, showHandlesAtom } from "~/lib/atoms";
import { generateCSS, generateBgGradientCSS, hexToRgba, stretchRatio, type AuraPoint, type MeshPoint } from "~/lib/gradient-engine";
import { MarbleCanvas } from "~/components/marble-canvas";
import { NoiseOverlay } from "~/components/noise-overlay";

// Canvas is aspect-4/3; CSS ellipse percentages resolve against width/height
// independently, so equal % values look elliptical. Correct h by 4/3.
const ASPECT = 4 / 3;

function AuraBlobLayer({ point }: { point: AuraPoint }) {
  const { wRatio, hRatio } = stretchRatio(point.stretch);
  const w = point.size * wRatio * 0.5;
  const h = point.size * hRatio * 0.5 * ASPECT;
  const hard = point.hardness ?? 0;
  const fadeEnd = hard + Math.round((100 - hard) * 0.7);
  const color = hexToRgba(point.color, point.opacity);
  const fadeMid = hexToRgba(point.color, point.opacity * 0.4);

  return (
    <div
      className="absolute -inset-1/2 pointer-events-none"
      style={{
        backgroundImage: `radial-gradient(ellipse ${w}% ${h}% at 50% 50%, ${color} ${hard}%, ${fadeMid} ${fadeEnd}%, transparent 100%)`,
        transform: `translate(${(point.x - 50) * 0.5}%, ${(point.y - 50) * 0.5}%) rotate(${point.rotate ?? 0}deg)`,
      }}
    />
  );
}

function MeshBlobLayer({ point }: { point: MeshPoint }) {
  const { wRatio, hRatio } = stretchRatio(point.stretch);
  const w = point.spread * wRatio * 0.5;
  const h = point.spread * hRatio * 0.5 * ASPECT;
  const hard = point.hardness ?? 0;
  const color = point.opacity < 100 ? hexToRgba(point.color, point.opacity) : point.color;

  return (
    <div
      className="absolute -inset-1/2 pointer-events-none"
      style={{
        backgroundImage: `radial-gradient(ellipse ${w}% ${h}% at 50% 50%, ${color} ${hard}%, transparent 100%)`,
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
  const dragging = useRef<{ type: "aura" | "mesh"; id: string; handle: "center" | "size" | "hardness" } | null>(null);

  const getPercent = useCallback((e: React.PointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 50, y: 50 };
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    return { x: Math.round(x), y: Math.round(y) };
  }, []);

  const getDistance = useCallback((e: React.PointerEvent, cx: number, cy: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    const px = ((e.clientX - rect.left) / rect.width) * 100;
    const py = ((e.clientY - rect.top) / rect.height) * 100;
    return Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
  }, []);

  const onPointerDown = useCallback((type: "aura" | "mesh", id: string, handle: "center" | "size" | "hardness", e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragging.current = { type, id, handle };
    setActiveTarget({ type, id });
  }, [setActiveTarget]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const { type, id, handle } = dragging.current;

    if (handle === "center") {
      const { x, y } = getPercent(e);
      setState((prev) => {
        if (type === "aura") {
          return { ...prev, auraPoints: prev.auraPoints.map((p) => p.id === id ? { ...p, x, y } : p) };
        }
        return { ...prev, meshPoints: prev.meshPoints.map((p) => p.id === id ? { ...p, x, y } : p) };
      });
    } else {
      // Ring handle — map distance from center to size or hardness
      setState((prev) => {
        const points = type === "aura" ? prev.auraPoints : prev.meshPoints;
        const point = points.find((p) => p.id === id);
        if (!point) return prev;

        const dist = getDistance(e, point.x, point.y);

        if (handle === "size") {
          const newSize = Math.round(Math.max(1, Math.min(200, dist / 2)));
          if (type === "aura") {
            return { ...prev, auraPoints: prev.auraPoints.map((p) => p.id === id ? { ...p, size: newSize } : p) };
          }
          return { ...prev, meshPoints: prev.meshPoints.map((p) => p.id === id ? { ...p, spread: newSize } : p) };
        } else {
          // hardness: percentage of the outer ring radius
          const outerSize = type === "aura" ? (point as AuraPoint).size : (point as MeshPoint).spread;
          const outerRadius = outerSize / 2;
          const hardness = outerRadius > 0 ? Math.round(Math.max(0, Math.min(100, (dist / 2) / outerRadius * 100))) : 0;
          if (type === "aura") {
            return { ...prev, auraPoints: prev.auraPoints.map((p) => p.id === id ? { ...p, hardness } : p) };
          }
          return { ...prev, meshPoints: prev.meshPoints.map((p) => p.id === id ? { ...p, hardness } : p) };
        }
      });
    }
  }, [getPercent, getDistance, setState]);

  const onPointerUp = useCallback(() => {
    dragging.current = null;
  }, []);

  if (!showHandles || (state.type !== "aura" && state.type !== "mesh")) return null;

  const points = state.type === "aura"
    ? state.auraPoints.filter((p) => p.visible !== false).map((p) => ({ ...p, spread: p.size, ptype: "aura" as const }))
    : state.meshPoints.filter((p) => p.visible !== false).map((p) => ({ ...p, size: p.spread, ptype: "mesh" as const }));

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
        const outerSize = p.ptype === "aura" ? p.size : p.spread;
        const { wRatio, hRatio } = stretchRatio(p.stretch);
        const ringW = outerSize * wRatio;
        const ringH = outerSize * hRatio * ASPECT;
        const hardRingW = ringW * (p.hardness ?? 0) / 100;
        const hardRingH = ringH * (p.hardness ?? 0) / 100;

        return (
          <div key={p.id}>
            {/* Outer ring — size/spread handle */}
            {isActive && (
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/40 border-dashed cursor-ew-resize pointer-events-auto"
                style={{
                  left: `${p.x}%`, top: `${p.y}%`,
                  width: `${ringW}%`, height: `${ringH}%`,
                }}
                onPointerDown={(e) => onPointerDown(p.ptype, p.id, "size", e)}
              />
            )}
            {/* Inner ring — hardness handle */}
            {isActive && (p.hardness ?? 0) > 0 && (
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/60 cursor-ew-resize pointer-events-auto"
                style={{
                  left: `${p.x}%`, top: `${p.y}%`,
                  width: `${hardRingW}%`, height: `${hardRingH}%`,
                }}
                onPointerDown={(e) => onPointerDown(p.ptype, p.id, "hardness", e)}
              />
            )}
            {/* Center handle */}
            <div
              className={`absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 cursor-grab active:cursor-grabbing transition-shadow ${
                isActive
                  ? "border-white bg-accent shadow-lg shadow-accent/40"
                  : "border-white/60 bg-white/20 hover:bg-white/40"
              }`}
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
              onPointerDown={(e) => onPointerDown(p.ptype, p.id, "center", e)}
            />
          </div>
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

  // Always use separate div layers for aura/mesh to ensure correct aspect-ratio rendering
  const useBlobs = state.type === "aura" || state.type === "mesh";

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
            [...state.auraPoints].filter((p) => p.visible !== false).reverse().map((p) => <AuraBlobLayer key={p.id} point={p} />)}
          {useBlobs && state.type === "mesh" &&
            [...state.meshPoints].filter((p) => p.visible !== false).reverse().map((p) => <MeshBlobLayer key={p.id} point={p} />)}
        </div>
      )}
      <NoiseOverlay />
      <DragHandles />
    </div>
  );
}
