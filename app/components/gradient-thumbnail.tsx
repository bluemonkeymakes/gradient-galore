import { generateCSS, generateBgGradientCSS, hexToRgba, type GradientState, type AuraPoint, type MeshPoint } from "~/lib/gradient-engine";
import { MarbleSvg } from "~/components/marble-canvas";

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

function NoiseLayer({ state }: { state: GradientState }) {
  if (!state.noiseEnabled) return null;
  const freq = ((state.noiseScale ?? 4) / 10) * 0.8 + 0.1;
  const opacity = (state.noiseIntensity ?? 30) / 100;
  const blend = state.noiseBlend ?? "overlay";

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ mixBlendMode: blend, opacity }}
    >
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <filter id="noise-thumb">
          <feTurbulence type="fractalNoise" baseFrequency={freq} numOctaves={4} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#noise-thumb)" />
      </svg>
    </div>
  );
}

/**
 * Renders a gradient from its state — used in gallery cards and detail pages.
 */
export function GradientThumbnail({
  state,
  className = "",
}: {
  state: GradientState;
  className?: string;
}) {
  const css = generateCSS(state);
  const bgGradientCss = generateBgGradientCSS(state);

  const hasRotatedBlobs =
    (state.type === "aura" && state.auraPoints?.some((p) => (p.rotate ?? 0) !== 0)) ||
    (state.type === "mesh" && state.meshPoints?.some((p) => (p.rotate ?? 0) !== 0));

  const useBlobs = (state.type === "aura" || state.type === "mesh") && (hasRotatedBlobs || !!bgGradientCss);

  const baseStyle: React.CSSProperties =
    useBlobs
      ? { backgroundColor: state.type === "aura" ? state.auraBgColor : state.meshBgColor }
      : state.type === "aura"
        ? { backgroundColor: state.auraBgColor, backgroundImage: css }
        : state.type === "mesh"
          ? { backgroundColor: state.meshBgColor, backgroundImage: css }
          : state.type === "marble"
            ? { backgroundColor: state.colors?.[0]?.color ?? "#8b5cf6" }
            : { background: css };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {state.type === "marble" ? (
        <MarbleSvg state={state} />
      ) : (
        <div className="absolute inset-0 overflow-hidden" style={baseStyle}>
          {bgGradientCss && useBlobs && (
            <div className="absolute inset-0" style={{ backgroundImage: bgGradientCss }} />
          )}
          {useBlobs && state.type === "aura" &&
            [...(state.auraPoints ?? [])].filter((p) => p.visible !== false).reverse().map((p) => <AuraBlobLayer key={p.id} point={p} />)}
          {useBlobs && state.type === "mesh" &&
            [...(state.meshPoints ?? [])].filter((p) => p.visible !== false).reverse().map((p) => <MeshBlobLayer key={p.id} point={p} />)}
        </div>
      )}
      <NoiseLayer state={state} />
    </div>
  );
}
