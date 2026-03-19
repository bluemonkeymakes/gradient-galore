export type GradientType =
  | "linear"
  | "radial"
  | "conic"
  | "aura"
  | "marble"
  | "mesh";

export type RadialSize =
  | "closest-side"
  | "closest-corner"
  | "farthest-side"
  | "farthest-corner";

export type BlendMode =
  | "overlay"
  | "soft-light"
  | "multiply"
  | "screen"
  | "color-dodge"
  | "color-burn";

export interface ColorStop {
  id: string;
  color: string;
  position: number; // 0-100
}

export interface AuraPoint {
  id: string;
  color: string;
  x: number; // 0-100
  y: number; // 0-100
  size: number; // 10-100, how far the glow extends
  opacity: number; // 0-100
}

export interface MeshPoint {
  id: string;
  color: string;
  x: number; // 0-100
  y: number; // 0-100
  spread: number; // 10-100
  opacity: number; // 0-100
}

export interface GradientState {
  type: GradientType;
  colors: ColorStop[];
  // Shared
  angle: number;
  positionX: number; // 0-100
  positionY: number; // 0-100
  repeating: boolean;
  // Radial
  radialShape: "circle" | "ellipse";
  radialSize: RadialSize;
  // Aura
  auraPoints: AuraPoint[];
  auraBgColor: string;
  // Marble
  marbleScale: number; // 1-20
  marbleTurbulence: number; // 1-10
  marbleSeed: number;
  marbleRotate: number; // 0-360
  marbleBlendMode: BlendMode;
  // Mesh
  meshPoints: MeshPoint[];
  meshBgColor: string;
}

export function createId(): string {
  return Math.random().toString(36).slice(2, 9);
}

export function defaultColors(): ColorStop[] {
  return [
    { id: createId(), color: "#8b5cf6", position: 0 },
    { id: createId(), color: "#ec4899", position: 50 },
    { id: createId(), color: "#f97316", position: 100 },
  ];
}

export function defaultAuraPoints(): AuraPoint[] {
  return [
    { id: createId(), color: "#a855f7", x: 30, y: 35, size: 70, opacity: 70 },
    { id: createId(), color: "#3b82f6", x: 60, y: 45, size: 65, opacity: 60 },
    { id: createId(), color: "#06b6d4", x: 45, y: 70, size: 75, opacity: 55 },
  ];
}

export function defaultMeshPoints(): MeshPoint[] {
  return [
    { id: createId(), color: "#8b5cf6", x: 20, y: 20, spread: 40, opacity: 100 },
    { id: createId(), color: "#ec4899", x: 80, y: 20, spread: 40, opacity: 100 },
    { id: createId(), color: "#06b6d4", x: 50, y: 80, spread: 40, opacity: 100 },
    { id: createId(), color: "#f97316", x: 80, y: 70, spread: 35, opacity: 80 },
  ];
}

export function defaultState(): GradientState {
  return {
    type: "linear",
    colors: defaultColors(),
    angle: 135,
    positionX: 50,
    positionY: 50,
    repeating: false,
    radialShape: "circle",
    radialSize: "farthest-corner",
    auraPoints: defaultAuraPoints(),
    auraBgColor: "#0a0a2e",
    marbleScale: 4,
    marbleTurbulence: 3,
    marbleSeed: 1,
    marbleRotate: 0,
    marbleBlendMode: "overlay",
    meshPoints: defaultMeshPoints(),
    meshBgColor: "#0a0a1a",
  };
}

function stopsToCSS(colors: ColorStop[]): string {
  return colors.map((c) => `${c.color} ${c.position}%`).join(", ");
}

function hexToRgba(hex: string, opacity: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${(opacity / 100).toFixed(2)})`;
}

export function generateCSS(state: GradientState): string {
  const stops = stopsToCSS(state.colors);
  const pos = `at ${state.positionX}% ${state.positionY}%`;

  switch (state.type) {
    case "linear": {
      const fn = state.repeating ? "repeating-linear-gradient" : "linear-gradient";
      return `${fn}(${state.angle}deg, ${stops})`;
    }

    case "radial": {
      const fn = state.repeating ? "repeating-radial-gradient" : "radial-gradient";
      return `${fn}(${state.radialShape} ${state.radialSize} ${pos}, ${stops})`;
    }

    case "conic": {
      const fn = state.repeating ? "repeating-conic-gradient" : "conic-gradient";
      return `${fn}(from ${state.angle}deg ${pos}, ${stops})`;
    }

    case "aura": {
      const layers = state.auraPoints.map((p) => {
        const color = hexToRgba(p.color, p.opacity);
        const fadeEnd = Math.round(p.size * 0.7);
        return `radial-gradient(ellipse ${p.size}% ${p.size}% at ${p.x}% ${p.y}%, ${color} 0%, ${hexToRgba(p.color, p.opacity * 0.4)} ${fadeEnd}%, transparent 100%)`;
      });
      return layers.join(", ");
    }

    case "marble":
      return `linear-gradient(${state.angle}deg, ${stops})`;

    case "mesh": {
      const layers = state.meshPoints.map((p) => {
        const color = p.opacity < 100 ? hexToRgba(p.color, p.opacity) : p.color;
        return `radial-gradient(ellipse ${p.spread}% ${p.spread}% at ${p.x}% ${p.y}%, ${color} 0%, transparent 100%)`;
      });
      return layers.join(", ");
    }

    default:
      return `linear-gradient(135deg, ${stops})`;
  }
}

export function generateFullCSS(state: GradientState): string {
  const bg = generateCSS(state);

  if (state.type === "marble") {
    const blur = 4 + (state.marbleTurbulence / 10) * 16;
    const colors = state.colors;
    return `/* Marble — SVG blurred shapes + blend modes */
.gradient {
  /* Base: ${colors[0]?.color} */
  /* Shapes: ${colors.slice(1).map((c) => c.color).join(", ")} */
  /* Blur: ${blur.toFixed(1)}, Scale: ${state.marbleScale}, Rotate: ${state.marbleRotate}° */
  /* Blend: ${state.marbleBlendMode}, Seed: ${state.marbleSeed} */
  background: ${colors[0]?.color ?? "#8b5cf6"};
}`;
  }

  if (state.type === "aura") {
    return `.gradient {
  background-color: ${state.auraBgColor};
  background-image: ${bg};
}`;
  }

  if (state.type === "mesh") {
    return `.gradient {
  background-color: ${state.meshBgColor};
  background-image: ${bg};
}`;
  }

  return `.gradient {
  background: ${bg};
}`;
}

export const GRADIENT_TYPES: {
  value: GradientType;
  label: string;
  description: string;
}[] = [
  { value: "linear", label: "Linear", description: "Classic directional" },
  { value: "radial", label: "Radial", description: "Circular from center" },
  { value: "conic", label: "Conic", description: "Angular sweep" },
  { value: "aura", label: "Aura", description: "Soft glowing layers" },
  { value: "marble", label: "Marble", description: "Blurred organic shapes" },
  { value: "mesh", label: "Mesh", description: "Multi-point blend" },
];

export const RADIAL_SIZES: { value: RadialSize; label: string }[] = [
  { value: "farthest-corner", label: "Farthest Corner" },
  { value: "farthest-side", label: "Farthest Side" },
  { value: "closest-corner", label: "Closest Corner" },
  { value: "closest-side", label: "Closest Side" },
];

export const BLEND_MODES: { value: BlendMode; label: string }[] = [
  { value: "overlay", label: "Overlay" },
  { value: "soft-light", label: "Soft Light" },
  { value: "multiply", label: "Multiply" },
  { value: "screen", label: "Screen" },
  { value: "color-dodge", label: "Color Dodge" },
  { value: "color-burn", label: "Color Burn" },
];
