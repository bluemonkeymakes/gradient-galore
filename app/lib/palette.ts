export interface PaletteShade {
  shade: string;
  color: string;
}

export interface PaletteColor {
  name: string;
  base: string;
  shades: PaletteShade[];
}

export interface Palette {
  id: string;
  name: string;
  colors: PaletteColor[];
}

// --- OKLCH color space conversion ---

function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function linearToSrgb(c: number): number {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1.0 / 2.4) - 0.055;
}

function linearRgbToOklab(r: number, g: number, b: number): [number, number, number] {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  ];
}

function oklabToLinearRgb(L: number, a: number, b: number): [number, number, number] {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return [
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ];
}

export function hexToOklch(hex: string): { L: number; C: number; h: number } {
  const raw = hex.replace("#", "");
  const r = srgbToLinear(parseInt(raw.slice(0, 2), 16) / 255);
  const g = srgbToLinear(parseInt(raw.slice(2, 4), 16) / 255);
  const b = srgbToLinear(parseInt(raw.slice(4, 6), 16) / 255);
  const [L, a, bVal] = linearRgbToOklab(r, g, b);
  const C = Math.sqrt(a * a + bVal * bVal);
  const h = (Math.atan2(bVal, a) * 180) / Math.PI;
  return { L, C, h: h < 0 ? h + 360 : h };
}

export function oklchToHex(L: number, C: number, h: number): string {
  const hRad = (h * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);
  const [lr, lg, lb] = oklabToLinearRgb(L, a, b);
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  const toHex = (v: number) =>
    Math.round(clamp(linearToSrgb(clamp(v))) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(lr)}${toHex(lg)}${toHex(lb)}`;
}

// --- Shade scale generation ---

const SHADE_TARGETS: { shade: string; L: number }[] = [
  { shade: "50", L: 0.97 },
  { shade: "100", L: 0.93 },
  { shade: "200", L: 0.87 },
  { shade: "300", L: 0.78 },
  { shade: "400", L: 0.68 },
  { shade: "500", L: 0.55 },
  { shade: "600", L: 0.48 },
  { shade: "700", L: 0.39 },
  { shade: "800", L: 0.31 },
  { shade: "900", L: 0.22 },
  { shade: "950", L: 0.14 },
];

export const ALL_SHADE_STEPS = SHADE_TARGETS.map((t) => t.shade);

export function generateShadeScale(baseHex: string): PaletteShade[] {
  const base = hexToOklch(baseHex);
  return SHADE_TARGETS.map((target) => {
    const distFromMid = Math.abs(target.L - 0.55);
    const chromaScale = 1 - distFromMid * 0.6;
    const C = base.C * Math.max(0.1, chromaScale);
    return {
      shade: target.shade,
      color: oklchToHex(target.L, C, base.h),
    };
  });
}

const SCALE_STEPS = 9;

/** Tints: base → white (increase L toward 1, decrease C toward 0) */
export function generateTints(baseHex: string): PaletteShade[] {
  const base = hexToOklch(baseHex);
  const result: PaletteShade[] = [];
  for (let i = 1; i <= SCALE_STEPS; i++) {
    const t = i / SCALE_STEPS;
    const L = base.L + (1 - base.L) * t;
    const C = base.C * (1 - t);
    result.push({
      shade: `T${i}`,
      color: oklchToHex(L, C, base.h),
    });
  }
  return result;
}

/** Shades: base → black (decrease L toward 0, decrease C toward 0) */
export function generateShades(baseHex: string): PaletteShade[] {
  const base = hexToOklch(baseHex);
  const result: PaletteShade[] = [];
  for (let i = 1; i <= SCALE_STEPS; i++) {
    const t = i / SCALE_STEPS;
    const L = base.L * (1 - t);
    const C = base.C * (1 - t * 0.5);
    result.push({
      shade: `S${i}`,
      color: oklchToHex(L, C, base.h),
    });
  }
  return result;
}

/** Tones: base → gray (decrease C toward 0, L stays near base) */
export function generateTones(baseHex: string): PaletteShade[] {
  const base = hexToOklch(baseHex);
  const result: PaletteShade[] = [];
  for (let i = 1; i <= SCALE_STEPS; i++) {
    const t = i / SCALE_STEPS;
    const C = base.C * (1 - t);
    result.push({
      shade: `G${i}`,
      color: oklchToHex(base.L, C, base.h),
    });
  }
  return result;
}

/** Find which shade step a hex color most closely matches by lightness */
function closestShade(hex: string): string {
  const { L } = hexToOklch(hex);
  let best = SHADE_TARGETS[0];
  let bestDist = Math.abs(L - best.L);
  for (const t of SHADE_TARGETS) {
    const d = Math.abs(L - t.L);
    if (d < bestDist) {
      best = t;
      bestDist = d;
    }
  }
  return best.shade;
}

/**
 * Build a PaletteColor from a base hex.
 * Generates the full 50-950 shade scale automatically.
 */
export function makePaletteColor(base: string, name: string): PaletteColor {
  return { name, base, shades: generateShadeScale(base) };
}

// --- Color harmony ---

export type HarmonyRule =
  | "complementary"
  | "analogous"
  | "triadic"
  | "split-complementary"
  | "tetradic";

export const HARMONY_RULES: { value: HarmonyRule; label: string }[] = [
  { value: "complementary", label: "Complementary" },
  { value: "analogous", label: "Analogous" },
  { value: "triadic", label: "Triadic" },
  { value: "split-complementary", label: "Split Comp." },
  { value: "tetradic", label: "Tetradic" },
];

const HARMONY_OFFSETS: Record<HarmonyRule, number[]> = {
  complementary: [180],
  analogous: [30, -30],
  triadic: [120, 240],
  "split-complementary": [150, 210],
  tetradic: [90, 180, 270],
};

function normalizeHue(h: number): number {
  return ((h % 360) + 360) % 360;
}

export function generateHarmony(seedHex: string, rule: HarmonyRule): string[] {
  const { L, C, h } = hexToOklch(seedHex);
  const offsets = HARMONY_OFFSETS[rule];
  return [seedHex, ...offsets.map((o) => oklchToHex(L, C, normalizeHue(h + o)))];
}

// --- Random color ---

export function randomOklchHex(): string {
  const L = 0.35 + Math.random() * 0.4;
  const C = 0.08 + Math.random() * 0.17;
  const h = Math.random() * 360;
  return oklchToHex(L, C, h);
}

// --- Palette-wide adjustments ---

export function shiftHue(hex: string, degrees: number): string {
  const { L, C, h } = hexToOklch(hex);
  return oklchToHex(L, C, normalizeHue(h + degrees));
}

export function scaleChroma(hex: string, factor: number): string {
  const { L, C, h } = hexToOklch(hex);
  return oklchToHex(L, Math.min(0.4, C * factor), h);
}

export function scaleLightness(hex: string, factor: number): string {
  const { L, C, h } = hexToOklch(hex);
  return oklchToHex(Math.min(1, Math.max(0, L * factor)), C, h);
}

// --- Contrast / accessibility ---

export function relativeLuminance(hex: string): number {
  const raw = hex.replace("#", "");
  const r = srgbToLinear(parseInt(raw.slice(0, 2), 16) / 255);
  const g = srgbToLinear(parseInt(raw.slice(2, 4), 16) / 255);
  const b = srgbToLinear(parseInt(raw.slice(4, 6), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function wcagLevel(ratio: number): {
  aa: boolean;
  aaLarge: boolean;
  aaa: boolean;
  aaaLarge: boolean;
} {
  return {
    aa: ratio >= 4.5,
    aaLarge: ratio >= 3,
    aaa: ratio >= 7,
    aaaLarge: ratio >= 4.5,
  };
}

// --- Auto naming ---

const HUE_NAMES: [number, string][] = [
  [15, "Red"],
  [40, "Orange"],
  [65, "Amber"],
  [90, "Yellow"],
  [140, "Lime"],
  [165, "Green"],
  [185, "Teal"],
  [210, "Cyan"],
  [250, "Blue"],
  [280, "Indigo"],
  [310, "Purple"],
  [340, "Pink"],
  [361, "Red"],
];

function hueToName(h: number): string {
  const norm = ((h % 360) + 360) % 360;
  for (const [max, name] of HUE_NAMES) {
    if (norm < max) return name;
  }
  return "Red";
}

function lightnessWord(L: number): string {
  if (L > 0.75) return "Light";
  if (L > 0.55) return "Bright";
  if (L > 0.35) return "Deep";
  if (L > 0.2) return "Dark";
  return "Shadow";
}

function chromaWord(C: number): string {
  if (C < 0.04) return "Muted";
  if (C < 0.08) return "Soft";
  if (C < 0.15) return "Vivid";
  return "Bold";
}

const NOUNS_LIGHT = ["Mist", "Dawn", "Frost", "Cloud", "Pearl", "Silk", "Glow", "Haze"];
const NOUNS_MID = ["Bloom", "Ember", "Wave", "Stone", "Field", "Dune", "Grove", "Creek"];
const NOUNS_DARK = ["Forge", "Storm", "Night", "Shade", "Obsidian", "Coal", "Abyss", "Void"];
const NOUNS_VIVID = ["Spark", "Blaze", "Flare", "Prism", "Jewel", "Neon", "Flash", "Flame"];

let nameCounter = 0;
function pickFromSeed(arr: string[], seed: number): string {
  return arr[Math.abs(Math.round(seed * 1000) + nameCounter++) % arr.length];
}

export function autoGenerateName(hexColors: string[]): string {
  if (hexColors.length === 0) return "Untitled";
  const oklchs = hexColors.map(hexToOklch);
  const hueNames = [...new Set(oklchs.map((o) => hueToName(o.h)))];
  const avgL = oklchs.reduce((s, o) => s + o.L, 0) / oklchs.length;
  const avgC = oklchs.reduce((s, o) => s + o.C, 0) / oklchs.length;
  const avgH = oklchs.reduce((s, o) => s + o.h, 0) / oklchs.length;

  // Use the actual color values as a seed for variety
  const seed = avgH / 360 + avgL + avgC;

  // Pick a noun based on character
  let noun: string;
  if (avgC > 0.12) noun = pickFromSeed(NOUNS_VIVID, seed);
  else if (avgL > 0.6) noun = pickFromSeed(NOUNS_LIGHT, seed);
  else if (avgL < 0.3) noun = pickFromSeed(NOUNS_DARK, seed);
  else noun = pickFromSeed(NOUNS_MID, seed);

  if (hueNames.length === 1) {
    return `${hueNames[0]} ${noun}`;
  }
  if (hueNames.length === 2) {
    return `${hueNames[0]} ${hueNames[1]} ${noun}`;
  }
  // 3+ hues
  const adj = chromaWord(avgC);
  return `${adj} ${hueNames[0]} ${noun}`;
}

export function autoGenerateTags(hexColors: string[]): string {
  if (hexColors.length === 0) return "";
  const oklchs = hexColors.map(hexToOklch);
  const tags: string[] = [];

  // Color family tags
  const hueNames = [...new Set(oklchs.map((o) => hueToName(o.h).toLowerCase()))];
  tags.push(...hueNames);

  // Mood tags
  const avgL = oklchs.reduce((s, o) => s + o.L, 0) / oklchs.length;
  const avgC = oklchs.reduce((s, o) => s + o.C, 0) / oklchs.length;
  if (avgL > 0.65) tags.push("light");
  else if (avgL < 0.3) tags.push("dark");
  if (avgC > 0.12) tags.push("vibrant");
  else if (avgC < 0.05) tags.push("muted");

  // Temperature
  const avgH = oklchs.reduce((s, o) => s + o.h, 0) / oklchs.length;
  if (avgH > 10 && avgH < 80) tags.push("warm");
  else if (avgH > 160 && avgH < 270) tags.push("cool");

  return [...new Set(tags)].join(", ");
}

// --- Export formatters ---

export function exportAsTailwind(colors: PaletteColor[]): string {
  const lines = ["module.exports = {", "  theme: {", "    extend: {", "      colors: {"];
  for (const c of colors) {
    const key = c.name.toLowerCase().replace(/\s+/g, "-");
    lines.push(`        '${key}': {`);
    for (const s of c.shades) {
      lines.push(`          ${s.shade}: '${s.color}',`);
    }
    lines.push("        },");
  }
  lines.push("      },", "    },", "  },", "};");
  return lines.join("\n");
}

export function exportAsCssVars(colors: PaletteColor[]): string {
  const lines = [":root {"];
  for (const c of colors) {
    const key = c.name.toLowerCase().replace(/\s+/g, "-");
    for (const s of c.shades) {
      lines.push(`  --color-${key}-${s.shade}: ${s.color};`);
    }
  }
  lines.push("}");
  return lines.join("\n");
}

export function exportAsJson(colors: PaletteColor[]): string {
  const obj: Record<string, { base: string; shades: Record<string, string> }> = {};
  for (const c of colors) {
    const key = c.name.toLowerCase().replace(/\s+/g, "-");
    const shades: Record<string, string> = {};
    for (const s of c.shades) shades[s.shade] = s.color;
    obj[key] = { base: c.base, shades };
  }
  return JSON.stringify(obj, null, 2);
}

export function exportAsHexList(colors: PaletteColor[]): string {
  return colors.map((c) => `${c.name}: ${c.base}`).join("\n");
}

// --- Import parsing ---

const DEFAULT_COLOR_NAMES = ["Primary", "Secondary", "Accent", "Neutral", "Highlight"];

/** Expand 3-char hex (#f0a) to 6-char (#ff00aa) */
function normalizeHex(hex: string): string {
  const h = hex.replace("#", "").toLowerCase();
  if (h.length === 3) return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
  return `#${h.slice(0, 6)}`;
}

/** Match any hex color (3 or 6 char) and return normalized 6-char */
const HEX3OR6 = /#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/;

function extractHex(s: string): string | null {
  const m = s.match(HEX3OR6);
  return m ? normalizeHex(m[0]) : null;
}

/**
 * Parses pasted palette text. Supports many formats:
 *
 * 1) Raw hex colors (one per line, 3 or 6 char):
 *      #6d28d9
 *      #f0a
 *
 * 2) Comma/space-separated hex on one line:
 *      #6d28d9, #0891b2, #e11d48
 *
 * 3) Decorated headers + shade rows:
 *      ═══ TEAL ═══
 *        50  #f0fdfd
 *        500 #0d9488
 *
 * 4) Tailwind config style:
 *      primary: {
 *        50: '#faf5ff',
 *        500: '#6d28d9',
 *      }
 *
 * 5) CSS custom properties:
 *      --color-primary-50: #faf5ff;
 *      --color-primary-500: #6d28d9;
 *
 * 6) Named key: value pairs:
 *      Primary: #6d28d9
 *      Accent: #e11d48
 *
 * Each named group becomes a PaletteColor. Raw hex values become
 * key colors with auto-generated 50-950 shade scales.
 */
export function parsePalettes(input: string): Palette[] {
  const lines = input.split("\n");
  const palettes: Palette[] = [];

  let currentPaletteName: string | null = null;
  let sections: { name: string; shades: PaletteShade[] }[] = [];
  let rawHexes: string[] = [];
  let namedSingles: { name: string; hex: string }[] = [];

  const flushPalette = () => {
    const colors: PaletteColor[] = [];

    for (const sec of sections) {
      const base =
        sec.shades.find((s) => s.shade === "500")?.color ??
        sec.shades[Math.floor(sec.shades.length / 2)]?.color ??
        sec.shades[0]?.color;
      if (!base) continue;
      const shades =
        sec.shades.length >= 8 ? sec.shades : generateShadeScale(base);
      colors.push({ name: sec.name, base, shades });
    }

    for (const ns of namedSingles) {
      colors.push(makePaletteColor(ns.hex, ns.name));
    }

    for (let i = 0; i < rawHexes.length; i++) {
      const hex = rawHexes[i];
      colors.push(makePaletteColor(hex, DEFAULT_COLOR_NAMES[colors.length] ?? `Color ${colors.length + 1}`));
    }

    if (colors.length > 0) {
      palettes.push({
        id: Math.random().toString(36).slice(2, 9),
        name: currentPaletteName ?? "Imported",
        colors,
      });
    }

    currentPaletteName = null;
    sections = [];
    rawHexes = [];
    namedSingles = [];
  };

  let currentSection: { name: string; shades: PaletteShade[] } | null = null;
  let twSection: string | null = null; // Tailwind "name: {" section name

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    // --- Tailwind closing brace ---
    if (/^[}\]],?\s*$/.test(line)) {
      if (twSection) {
        twSection = null;
      }
      if (currentSection) {
        sections.push(currentSection);
        currentSection = null;
      }
      continue;
    }

    // --- Tailwind section open: `primary: {` or `'primary': {` ---
    const twOpenMatch = line.match(
      /^['"]?([a-zA-Z][\w-]*)['"]?\s*:\s*\{\s*$/
    );
    if (twOpenMatch) {
      if (currentSection) sections.push(currentSection);
      twSection = twOpenMatch[1];
      currentSection = { name: twSection, shades: [] };
      continue;
    }

    // --- Tailwind shade line: `50: '#faf5ff',` or `500: "#6d28d9",` or `50: #hex,` ---
    const twShadeMatch = line.match(
      /^['"]?(\d{1,4})['"]?\s*:\s*['"]?(#[0-9a-fA-F]{3,8})['"]?\s*,?\s*$/
    );
    if (twShadeMatch) {
      if (!currentSection) {
        currentSection = {
          name: twSection ?? currentPaletteName ?? "Color",
          shades: [],
        };
      }
      currentSection.shades.push({
        shade: twShadeMatch[1],
        color: normalizeHex(twShadeMatch[2]),
      });
      continue;
    }

    // --- CSS custom property: `--color-primary-500: #6d28d9;` ---
    const cssVarMatch = line.match(
      /^--(?:[\w]+-)?([a-zA-Z][\w-]*)-(\d{1,4})\s*:\s*(#[0-9a-fA-F]{3,8})\s*;?\s*$/
    );
    if (cssVarMatch) {
      const [, colorName, shade, hex] = cssVarMatch;
      const sectionName = colorName.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      // Find or create a section for this color name
      let sec = sections.find((s) => s.name.toLowerCase() === sectionName.toLowerCase());
      if (!sec) {
        sec = { name: sectionName, shades: [] };
        sections.push(sec);
      }
      sec.shades.push({ shade, color: normalizeHex(hex) });
      continue;
    }

    // --- Decorated header: ═══ NAME ═══ ---
    const headerMatch = line.match(
      /^[═=\-─~*#]+\s*(.+?)\s*[═=\-─~*#]+$/
    );
    if (headerMatch) {
      if (currentSection) sections.push(currentSection);
      if (rawHexes.length > 0 || sections.length > 0 || namedSingles.length > 0) {
        flushPalette();
      }
      currentPaletteName = headerMatch[1].trim();
      currentSection = null;
      continue;
    }

    // --- Shade line: `50  #f0fdfd` or `- 50: #ff3800` or `500 #hex ← note` ---
    const shadeMatch = line.match(
      /^[-*•]?\s*(\d{1,4})\s*:?\s+(#[0-9a-fA-F]{3,8})/
    );
    if (shadeMatch) {
      if (!currentSection) {
        currentSection = {
          name: twSection ?? currentPaletteName ?? "Color",
          shades: [],
        };
      }
      currentSection.shades.push({
        shade: shadeMatch[1],
        color: normalizeHex(shadeMatch[2]),
      });
      continue;
    }

    // --- Named single: `Primary: #6d28d9` or `primary #6d28d9` ---
    const namedMatch = line.match(
      /^([a-zA-Z][\w\s-]*?)\s*[:=]\s*(#[0-9a-fA-F]{3,8})\s*;?\s*$/
    );
    if (namedMatch) {
      if (currentSection) {
        sections.push(currentSection);
        currentSection = null;
      }
      namedSingles.push({
        name: namedMatch[1].trim(),
        hex: normalizeHex(namedMatch[2]),
      });
      continue;
    }

    // --- Single raw hex (3 or 6 char), possibly with trailing annotation ---
    const hexMatch = line.match(/^(#[0-9a-fA-F]{3}|#[0-9a-fA-F]{6})\b/);
    if (hexMatch) {
      if (currentSection) {
        // Hex under a plain-text header → treat as shade in that section
        const idx = currentSection.shades.length;
        const shade = ALL_SHADE_STEPS[idx] ?? String(idx);
        currentSection.shades.push({
          shade,
          color: normalizeHex(hexMatch[1]),
        });
      } else {
        rawHexes.push(normalizeHex(hexMatch[1]));
      }
      continue;
    }

    // --- Comma/space-separated hex on one line: `#6d28d9, #0891b2, #e11d48` ---
    const multiHex = line.match(/#[0-9a-fA-F]{3,8}/g);
    if (multiHex && multiHex.length >= 2) {
      if (currentSection) {
        sections.push(currentSection);
        currentSection = null;
      }
      for (const h of multiHex) {
        rawHexes.push(normalizeHex(h));
      }
      continue;
    }

    // --- Plain text header: a line with no hex, at least 2 alpha chars ---
    // e.g. "Sand (Warm Neutrals)" or "Teal (Soft Seafoam)"
    if (/[a-zA-Z]{2,}/.test(line) && !/#[0-9a-fA-F]/.test(line)) {
      if (currentSection) sections.push(currentSection);
      currentSection = { name: line, shades: [] };
      continue;
    }
  }

  if (currentSection) sections.push(currentSection);
  flushPalette();

  return palettes;
}
