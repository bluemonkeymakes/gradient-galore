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

/** cubic-bezier(x1, y1, x2, y2) — same as CSS timing functions */
export type EasingCurve = [number, number, number, number];

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
  stretch: number; // 0-100, 50 = circle, <50 = tall, >50 = wide
  rotate: number; // 0-360
  visible?: boolean; // defaults to true
}

export interface MeshPoint {
  id: string;
  color: string;
  x: number; // 0-100
  y: number; // 0-100
  spread: number; // 10-100
  opacity: number; // 0-100
  stretch: number; // 0-100, 50 = circle, <50 = tall, >50 = wide
  rotate: number; // 0-360
  visible?: boolean; // defaults to true
}

export type NoiseBlend = "overlay" | "soft-light" | "luminosity";

export interface GradientState {
  type: GradientType;
  colors: ColorStop[];
  // Shared
  angle: number;
  positionX: number; // 0-100
  positionY: number; // 0-100
  repeating: boolean;
  easingCurve: EasingCurve;
  // Noise overlay
  noiseEnabled: boolean;
  noiseIntensity: number; // 0-100
  noiseScale: number; // 1-10
  noiseBlend: NoiseBlend;
  // Radial
  radialShape: "circle" | "ellipse";
  radialSize: RadialSize;
  // Background gradient layer (aura/mesh)
  bgGradient: boolean;
  bgGradientType: "linear" | "radial" | "conic";
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
    { id: createId(), color: "#a855f7", x: 30, y: 35, size: 70, opacity: 70, stretch: 50, rotate: 0 },
    { id: createId(), color: "#3b82f6", x: 60, y: 45, size: 65, opacity: 60, stretch: 60, rotate: 30 },
    { id: createId(), color: "#06b6d4", x: 45, y: 70, size: 75, opacity: 55, stretch: 40, rotate: 120 },
  ];
}

export function defaultMeshPoints(): MeshPoint[] {
  return [
    { id: createId(), color: "#8b5cf6", x: 20, y: 20, spread: 40, opacity: 100, stretch: 50, rotate: 0 },
    { id: createId(), color: "#ec4899", x: 80, y: 20, spread: 40, opacity: 100, stretch: 65, rotate: 45 },
    { id: createId(), color: "#06b6d4", x: 50, y: 80, spread: 40, opacity: 100, stretch: 50, rotate: 0 },
    { id: createId(), color: "#f97316", x: 80, y: 70, spread: 35, opacity: 80, stretch: 35, rotate: 90 },
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
    easingCurve: [0, 0, 1, 1],
    noiseEnabled: false,
    noiseIntensity: 30,
    noiseScale: 4,
    noiseBlend: "overlay",
    radialShape: "circle",
    radialSize: "farthest-corner",
    bgGradient: false,
    bgGradientType: "linear",
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

// --- Cubic bezier easing ---

/** Evaluate cubic bezier y for a given x using Newton's method */
export function cubicBezierAt(x: number, curve: EasingCurve): number {
  const [x1, y1, x2, y2] = curve;
  // Solve for parameter s where bezierX(s) = x
  let s = x; // initial guess
  for (let i = 0; i < 8; i++) {
    const sx = 3 * x1 * (1 - s) * (1 - s) * s + 3 * x2 * (1 - s) * s * s + s * s * s;
    const dx = 3 * x1 * (1 - 3 * s + 2 * s * s) + 3 * x2 * (2 * s - 3 * s * s) + 3 * s * s;
    if (Math.abs(dx) < 1e-8) break;
    s -= (sx - x) / dx;
    s = Math.max(0, Math.min(1, s));
  }
  return 3 * y1 * (1 - s) * (1 - s) * s + 3 * y2 * (1 - s) * s * s + s * s * s;
}

function isLinearCurve(curve: EasingCurve): boolean {
  return curve[0] === 0 && curve[1] === 0 && curve[2] === 1 && curve[3] === 1;
}

function lerpHex(a: string, b: string, t: number): string {
  const pa = a.replace("#", "");
  const pb = b.replace("#", "");
  const cl = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const r = cl(parseInt(pa.slice(0, 2), 16) * (1 - t) + parseInt(pb.slice(0, 2), 16) * t);
  const g = cl(parseInt(pa.slice(2, 4), 16) * (1 - t) + parseInt(pb.slice(2, 4), 16) * t);
  const bl = cl(parseInt(pa.slice(4, 6), 16) * (1 - t) + parseInt(pb.slice(4, 6), 16) * t);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bl.toString(16).padStart(2, "0")}`;
}

function expandStopsWithCurve(colors: ColorStop[], curve: EasingCurve): ColorStop[] {
  if (isLinearCurve(curve) || colors.length < 2) return colors;
  const n = 10;
  const result: ColorStop[] = [];

  for (let i = 0; i < colors.length - 1; i++) {
    const a = colors[i];
    const b = colors[i + 1];
    result.push(a);
    for (let s = 1; s < n; s++) {
      const t = s / n;
      const easedT = cubicBezierAt(t, curve);
      const pos = a.position + (b.position - a.position) * t;
      const color = lerpHex(a.color, b.color, easedT);
      result.push({ id: `ease-${i}-${s}`, color, position: Math.round(pos * 10) / 10 });
    }
  }
  result.push(colors[colors.length - 1]);
  return result;
}

export const EASING_PRESETS: { label: string; curve: EasingCurve }[] = [
  { label: "Linear", curve: [0, 0, 1, 1] },
  { label: "Ease In", curve: [0.42, 0, 1, 1] },
  { label: "Ease Out", curve: [0, 0, 0.58, 1] },
  { label: "In-Out", curve: [0.42, 0, 0.58, 1] },
];

function stopsToCSS(colors: ColorStop[], curve: EasingCurve = [0, 0, 1, 1]): string {
  const sorted = [...colors].sort((a, b) => a.position - b.position);
  const expanded = expandStopsWithCurve(sorted, curve);
  return expanded.map((c) => `${c.color} ${c.position}%`).join(", ");
}

/** Generate the background gradient layer CSS for aura/mesh */
export function generateBgGradientCSS(state: GradientState): string | null {
  if (!state.bgGradient) return null;
  const stops = stopsToCSS(state.colors, state.easingCurve ?? [0, 0, 1, 1]);
  const pos = `at ${state.positionX ?? 50}% ${state.positionY ?? 50}%`;
  const type = state.bgGradientType ?? "linear";
  switch (type) {
    case "radial":
      return `radial-gradient(circle ${pos}, ${stops})`;
    case "conic":
      return `conic-gradient(from ${state.angle ?? 0}deg ${pos}, ${stops})`;
    case "linear":
    default:
      return `linear-gradient(${state.angle ?? 135}deg, ${stops})`;
  }
}

export function hexToRgba(hex: string, opacity: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${(opacity / 100).toFixed(2)})`;
}

export function generateCSS(state: GradientState): string {
  const curve = state.easingCurve ?? [0, 0, 1, 1] as EasingCurve;
  const stops = stopsToCSS(state.colors, curve);
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
      // Stretch: 50=circle, <50=tall, >50=wide
      const layers = state.auraPoints.filter((p) => p.visible !== false).map((p) => {
        const color = hexToRgba(p.color, p.opacity);
        const ratio = (p.stretch ?? 50) / 50; // 0-2, 1=circle
        const w = Math.round(p.size * ratio);
        const h = Math.round(p.size * (2 - ratio));
        const fadeEnd = Math.round(Math.max(w, h) * 0.7);
        return `radial-gradient(ellipse ${w}% ${h}% at ${p.x}% ${p.y}%, ${color} 0%, ${hexToRgba(p.color, p.opacity * 0.4)} ${fadeEnd}%, transparent 100%)`;
      });
      return layers.join(", ");
    }

    case "marble":
      return `linear-gradient(${state.marbleRotate}deg, ${stops})`;

    case "mesh": {
      const layers = state.meshPoints.filter((p) => p.visible !== false).map((p) => {
        const color = p.opacity < 100 ? hexToRgba(p.color, p.opacity) : p.color;
        const ratio = (p.stretch ?? 50) / 50;
        const w = Math.round(p.spread * ratio);
        const h = Math.round(p.spread * (2 - ratio));
        return `radial-gradient(ellipse ${w}% ${h}% at ${p.x}% ${p.y}%, ${color} 0%, transparent 100%)`;
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
    const colors = state.colors;
    const blur = (4 + (state.marbleTurbulence / 10) * 16).toFixed(1);
    const scale1 = (0.8 + (state.marbleScale / 20) * 0.8).toFixed(2);
    const scale2 = (0.9 + (state.marbleScale / 20) * 0.7).toFixed(2);
    const rotate1 = ((state.marbleRotate + state.marbleSeed * 3.6) % 360).toFixed(1);
    const rotate2 = ((state.marbleRotate + (state.marbleSeed * 7.3) % 360) % 360).toFixed(1);
    const tx1 = (((state.marbleSeed * 1.7) % 20) - 10).toFixed(1);
    const ty1 = (((state.marbleSeed * 2.3) % 20) - 10).toFixed(1);
    const tx2 = (((state.marbleSeed * 3.1) % 20) - 10).toFixed(1);
    const ty2 = (((state.marbleSeed * 4.7) % 20) - 10).toFixed(1);
    const c0 = colors[0]?.color ?? "#8b5cf6";
    const c1 = colors[1]?.color ?? "#ec4899";
    const c2 = colors[2]?.color ?? c0;
    return `<!-- Marble gradient — inline SVG -->
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">
  <defs>
    <filter id="marble-blur" x="-50" y="-50" width="200" height="200"
      filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
      <feGaussianBlur in="SourceGraphic" stdDeviation="${blur}" />
    </filter>
    <clipPath id="marble-clip"><rect width="100" height="100" /></clipPath>
  </defs>
  <g clip-path="url(#marble-clip)">
    <rect width="100" height="100" fill="${c0}" />
    <path filter="url(#marble-blur)" fill="${c1}"
      d="M32.414 59.35L50.376 70.5H72.5V-0.5H33.728L26.5 13.381L45.557 40.461Z"
      transform="translate(${tx1} ${ty1}) rotate(${rotate1} 50 50) scale(${scale1})" />
    <path filter="url(#marble-blur)" fill="${c2}" style="mix-blend-mode:${state.marbleBlendMode}"
      d="M22.216 24L0 46.75L14.108 84.879L78 86L74.919 26.724L52.541 30.729L65.513 50.915L42.163 78.31Z"
      transform="translate(${tx2} ${ty2}) rotate(${rotate2} 50 50) scale(${scale2})" />
  </g>
</svg>`;
  }

  if (state.type === "aura") {
    const bgLayer = generateBgGradientCSS(state);
    const visibleAura = state.auraPoints.filter((p) => p.visible !== false);
    const hasRotation = visibleAura.some((p) => (p.rotate ?? 0) !== 0);
    if (hasRotation) {
      const layers = visibleAura.map((p, i) => {
        const ratio = (p.stretch ?? 50) / 50;
        const w = p.size * ratio * 0.5;
        const h = p.size * (2 - ratio) * 0.5;
        const fadeEnd = Math.round(Math.max(w, h) * 0.7);
        const color = hexToRgba(p.color, p.opacity);
        const fadeMid = hexToRgba(p.color, p.opacity * 0.4);
        return `.gradient__layer-${i + 1} {
  position: absolute;
  inset: -50%;
  background: radial-gradient(ellipse ${w}% ${h}% at 50% 50%, ${color} 0%, ${fadeMid} ${fadeEnd}%, transparent 100%);
  transform: translate(${((p.x - 50) * 0.5).toFixed(1)}%, ${((p.y - 50) * 0.5).toFixed(1)}%) rotate(${p.rotate}deg);
}`;
      });
      return `.gradient {
  position: relative;
  overflow: hidden;
  background-color: ${state.auraBgColor};${bgLayer ? `\n  background-image: ${bgLayer};` : ""}
}
${layers.join("\n")}`;
    }
    const images = [bgLayer, bg].filter(Boolean).join(", ");
    return `.gradient {
  background-color: ${state.auraBgColor};
  background-image: ${images};
}`;
  }

  if (state.type === "mesh") {
    const bgLayer = generateBgGradientCSS(state);
    const visibleMesh = state.meshPoints.filter((p) => p.visible !== false);
    const hasRotation = visibleMesh.some((p) => (p.rotate ?? 0) !== 0);
    if (hasRotation) {
      const layers = visibleMesh.map((p, i) => {
        const ratio = (p.stretch ?? 50) / 50;
        const w = p.spread * ratio * 0.5;
        const h = p.spread * (2 - ratio) * 0.5;
        const color = p.opacity < 100 ? hexToRgba(p.color, p.opacity) : p.color;
        return `.gradient__layer-${i + 1} {
  position: absolute;
  inset: -50%;
  background: radial-gradient(ellipse ${w}% ${h}% at 50% 50%, ${color} 0%, transparent 100%);
  transform: translate(${((p.x - 50) * 0.5).toFixed(1)}%, ${((p.y - 50) * 0.5).toFixed(1)}%) rotate(${p.rotate}deg);
}`;
      });
      return `.gradient {
  position: relative;
  overflow: hidden;
  background-color: ${state.meshBgColor};${bgLayer ? `\n  background-image: ${bgLayer};` : ""}
}
${layers.join("\n")}`;
    }
    const images = [bgLayer, bg].filter(Boolean).join(", ");
    return `.gradient {
  background-color: ${state.meshBgColor};
  background-image: ${images};
}`;
  }

  return `.gradient {
  background: ${bg};
}`;
}

// --- Apply palette to gradient ---

export function applyPaletteToGradient(state: GradientState, baseColors: string[]): GradientState {
  if (baseColors.length === 0) return state;

  const colors: ColorStop[] = baseColors.map((color, i) => ({
    id: createId(),
    color,
    position: Math.round((i / Math.max(1, baseColors.length - 1)) * 100),
  }));

  // Pick darkest color for background
  const darkest = baseColors.reduce((a, b) => {
    const la = hexToRgba(a, 100); // just need to compare
    const lb = hexToRgba(b, 100);
    // Quick luminance check via hex values
    const va = parseInt(a.replace("#", ""), 16);
    const vb = parseInt(b.replace("#", ""), 16);
    return va < vb ? a : b;
  });

  if (state.type === "aura") {
    const auraPoints: AuraPoint[] = baseColors.map((color, i) => ({
      id: createId(),
      color,
      x: Math.round(20 + (60 / Math.max(1, baseColors.length - 1)) * i),
      y: Math.round(30 + Math.sin(i * 1.5) * 20 + 20),
      size: 65,
      opacity: 70 - i * 5,
      stretch: 50,
      rotate: Math.round(i * 40),
    }));
    return { ...state, auraPoints, colors, auraBgColor: darkest };
  }

  if (state.type === "mesh") {
    const positions = [
      [20, 20], [80, 20], [50, 80], [20, 70], [80, 70], [50, 20],
    ];
    const meshPoints: MeshPoint[] = baseColors.map((color, i) => ({
      id: createId(),
      color,
      x: positions[i]?.[0] ?? Math.round(20 + Math.random() * 60),
      y: positions[i]?.[1] ?? Math.round(20 + Math.random() * 60),
      spread: 40,
      opacity: 100,
      stretch: 50,
      rotate: 0,
    }));
    return { ...state, meshPoints, colors, meshBgColor: darkest };
  }

  return { ...state, colors };
}

// --- Export formats ---

export function exportGradientAsTailwind(state: GradientState): string {
  const css = generateCSS(state);
  if (state.type === "aura" || state.type === "mesh") {
    const bgColor = state.type === "aura" ? state.auraBgColor : state.meshBgColor;
    return `<!-- Tailwind can't express ${state.type} gradients natively -->\n<!-- Use inline styles or a custom class: -->\n<div\n  class="w-full h-64"\n  style="background-color: ${bgColor}; background-image: ${css}"\n/>`;
  }
  if (state.type === "marble") {
    return `<!-- Marble gradients use SVG — embed the SVG output directly -->`;
  }
  return `<!-- Use as inline style or extract to a utility class -->\n<div\n  class="w-full h-64"\n  style="background: ${css}"\n/>`;
}

export function exportGradientAsInlineStyle(state: GradientState): string {
  const css = generateCSS(state);
  if (state.type === "aura" || state.type === "mesh") {
    const bgColor = state.type === "aura" ? state.auraBgColor : state.meshBgColor;
    return `background-color: ${bgColor};\nbackground-image: ${css};`;
  }
  return `background: ${css};`;
}

export function exportGradientAsJson(state: GradientState): string {
  return JSON.stringify(state, null, 2);
}

export type GradientExportFormat = "css" | "inline" | "tailwind" | "json";

export const GRADIENT_EXPORT_FORMATS: { value: GradientExportFormat; label: string }[] = [
  { value: "css", label: "CSS" },
  { value: "inline", label: "Inline" },
  { value: "tailwind", label: "Tailwind" },
  { value: "json", label: "JSON" },
];

export function exportGradient(state: GradientState, format: GradientExportFormat): string {
  switch (format) {
    case "css": return generateFullCSS(state);
    case "inline": return exportGradientAsInlineStyle(state);
    case "tailwind": return exportGradientAsTailwind(state);
    case "json": return exportGradientAsJson(state);
  }
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

export const NOISE_BLENDS: { value: NoiseBlend; label: string }[] = [
  { value: "overlay", label: "Overlay" },
  { value: "soft-light", label: "Soft Light" },
  { value: "luminosity", label: "Luminosity" },
];

