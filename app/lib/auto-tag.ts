import { hexToOklch } from "./palette";
import type { GradientState } from "./gradient-engine";

interface ColorInfo {
  hex: string;
  L: number; // 0-1 lightness
  C: number; // 0-0.4 chroma
  h: number; // 0-360 hue
}

function analyzeColors(hexColors: string[]): ColorInfo[] {
  return hexColors
    .filter((h) => /^#[0-9a-fA-F]{6}$/.test(h))
    .map((hex) => {
      const { L, C, h } = hexToOklch(hex);
      return { hex, L, C, h };
    });
}

// --- Hue mapping ---

const HUE_NAMES: { min: number; max: number; name: string }[] = [
  { min: 0, max: 20, name: "red" },
  { min: 20, max: 45, name: "orange" },
  { min: 45, max: 70, name: "yellow" },
  { min: 70, max: 160, name: "green" },
  { min: 160, max: 200, name: "teal" },
  { min: 200, max: 250, name: "blue" },
  { min: 250, max: 280, name: "indigo" },
  { min: 280, max: 320, name: "violet" },
  { min: 320, max: 345, name: "pink" },
  { min: 345, max: 360, name: "red" },
];

function hueName(h: number): string {
  return HUE_NAMES.find((r) => h >= r.min && h < r.max)?.name ?? "neutral";
}

// --- Mood words keyed by hue ---

const HUE_MOODS: Record<string, string[]> = {
  red: ["ember", "blaze", "fire", "crimson", "flame"],
  orange: ["sunset", "amber", "warm", "golden", "copper"],
  yellow: ["sunrise", "honey", "glow", "solar", "saffron"],
  green: ["forest", "emerald", "moss", "jade", "fern"],
  teal: ["ocean", "aqua", "lagoon", "arctic", "reef"],
  blue: ["sky", "sapphire", "ocean", "cobalt", "azure"],
  indigo: ["twilight", "deep", "cosmic", "midnight", "dusk"],
  violet: ["amethyst", "lavender", "plum", "electric", "nebula"],
  pink: ["rose", "blush", "coral", "petal", "bloom"],
  neutral: ["shadow", "slate", "mist", "haze", "smoke"],
};

const LIGHTNESS_MOODS: { test: (L: number) => boolean; words: string[] }[] = [
  { test: (L) => L < 0.25, words: ["midnight", "deep", "dark", "abyss", "shadow"] },
  { test: (L) => L < 0.4, words: ["dusk", "moody", "rich", "bold"] },
  { test: (L) => L > 0.8, words: ["light", "bright", "glow", "haze", "frost"] },
  { test: (L) => L > 0.9, words: ["pale", "whisper", "cloud", "mist"] },
];

const CHROMA_MOODS: { test: (C: number) => boolean; words: string[] }[] = [
  { test: (C) => C < 0.03, words: ["minimal", "monochrome", "muted"] },
  { test: (C) => C < 0.08, words: ["soft", "subtle", "calm", "pastel"] },
  { test: (C) => C > 0.2, words: ["vivid", "neon", "electric", "vibrant"] },
  { test: (C) => C > 0.15, words: ["bold", "saturated", "rich"] },
];

const ADJECTIVES = [
  "cosmic", "ethereal", "dreamy", "tropical", "volcanic", "frozen",
  "molten", "crystal", "velvet", "silk", "radiant", "shimmering",
];

const NOUNS = [
  "horizon", "aurora", "wave", "storm", "haze", "drift",
  "bloom", "flare", "pulse", "vapor", "echo", "tide",
];

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length];
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// --- Public API ---

export function generateGradientName(state: GradientState): string {
  const hexColors = getAllColors(state);
  const colors = analyzeColors(hexColors);
  if (colors.length === 0) return "Untitled";

  const avgL = colors.reduce((s, c) => s + c.L, 0) / colors.length;
  const avgC = colors.reduce((s, c) => s + c.C, 0) / colors.length;
  const dominantHue = colors.reduce((best, c) => (c.C > best.C ? c : best), colors[0]);
  const hue = hueName(dominantHue.h);
  const seed = hashStr(hexColors.join(""));

  // Pick a mood word from the dominant hue
  const moodWords = HUE_MOODS[hue] ?? HUE_MOODS.neutral;
  const mood = pick(moodWords, seed);

  // Pick a modifier based on lightness/chroma
  let modifier = pick(ADJECTIVES, seed + 7);
  for (const lm of LIGHTNESS_MOODS) {
    if (lm.test(avgL)) { modifier = pick(lm.words, seed + 3); break; }
  }
  for (const cm of CHROMA_MOODS) {
    if (cm.test(avgC)) { modifier = pick(cm.words, seed + 5); break; }
  }

  const noun = pick(NOUNS, seed + 13);

  // Combine — capitalize
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const patterns = [
    () => `${cap(modifier)} ${cap(mood)}`,
    () => `${cap(mood)} ${cap(noun)}`,
    () => `${cap(modifier)} ${cap(noun)}`,
  ];
  return pick(patterns, seed)();
}

export function generateGradientTags(state: GradientState): string[] {
  const hexColors = getAllColors(state);
  const colors = analyzeColors(hexColors);
  if (colors.length === 0) return [state.type];

  const tags = new Set<string>();

  // Gradient type
  tags.add(state.type);

  // Dominant hues
  const hues = new Set(colors.filter((c) => c.C > 0.02).map((c) => hueName(c.h)));
  hues.forEach((h) => tags.add(h));

  // Temperature
  const warmHues = colors.filter((c) => c.h < 70 || c.h > 320);
  const coolHues = colors.filter((c) => c.h >= 160 && c.h <= 280);
  if (warmHues.length > coolHues.length) tags.add("warm");
  else if (coolHues.length > warmHues.length) tags.add("cool");
  else tags.add("neutral");

  // Lightness
  const avgL = colors.reduce((s, c) => s + c.L, 0) / colors.length;
  if (avgL < 0.3) tags.add("dark");
  else if (avgL > 0.75) tags.add("light");
  if (avgL < 0.2) tags.add("deep");

  // Chroma / saturation
  const avgC = colors.reduce((s, c) => s + c.C, 0) / colors.length;
  if (avgC < 0.03) tags.add("monochrome");
  else if (avgC < 0.08) tags.add("muted");
  else if (avgC > 0.18) tags.add("vibrant");
  else if (avgC > 0.13) tags.add("bold");
  if (avgC > 0.2) tags.add("neon");
  if (avgC < 0.06 && avgL > 0.7) tags.add("pastel");

  // Color count
  if (colors.length === 2) tags.add("two-tone");
  if (colors.length >= 4) tags.add("multi-color");
  if (hues.size <= 1) tags.add("monochromatic");

  // Palette relationship
  if (hues.size >= 2) {
    const hueArr = colors.filter((c) => c.C > 0.02).map((c) => c.h);
    const spread = Math.max(...hueArr) - Math.min(...hueArr);
    if (spread < 60) tags.add("analogous");
    else if (spread > 150) tags.add("complementary");
  }

  // Noise
  if (state.noiseEnabled) tags.add("grainy");

  // Mood (pick top 2)
  const moods: string[] = [];
  if (avgL < 0.3 && avgC > 0.1) moods.push("moody", "dramatic");
  if (avgL > 0.7 && avgC < 0.08) moods.push("soft", "calm");
  if (avgC > 0.15 && avgL > 0.5) moods.push("energetic");
  if (avgL < 0.25) moods.push("midnight");
  if (avgL > 0.6 && avgC > 0.1) moods.push("bright");
  const warmCount = colors.filter((c) => (c.h < 50 || c.h > 330) && c.C > 0.05).length;
  if (warmCount >= 2) moods.push("sunset");
  const coolCount = colors.filter((c) => c.h > 180 && c.h < 270 && c.C > 0.05).length;
  if (coolCount >= 2) moods.push("ocean");
  moods.slice(0, 2).forEach((m) => tags.add(m));

  return [...tags];
}

export function generatePaletteTags(hexColors: string[]): string[] {
  const colors = analyzeColors(hexColors);
  if (colors.length === 0) return ["palette"];

  const tags = new Set<string>();
  tags.add("palette");

  const hues = new Set(colors.filter((c) => c.C > 0.02).map((c) => hueName(c.h)));
  hues.forEach((h) => tags.add(h));

  const warmHues = colors.filter((c) => c.h < 70 || c.h > 320);
  const coolHues = colors.filter((c) => c.h >= 160 && c.h <= 280);
  if (warmHues.length > coolHues.length) tags.add("warm");
  else if (coolHues.length > warmHues.length) tags.add("cool");

  const avgL = colors.reduce((s, c) => s + c.L, 0) / colors.length;
  if (avgL < 0.3) tags.add("dark");
  else if (avgL > 0.75) tags.add("light");

  const avgC = colors.reduce((s, c) => s + c.C, 0) / colors.length;
  if (avgC < 0.03) tags.add("monochrome");
  else if (avgC < 0.08) tags.add("muted");
  else if (avgC > 0.15) tags.add("vibrant");
  if (avgC < 0.06 && avgL > 0.7) tags.add("pastel");

  if (colors.length >= 4) tags.add("multi-color");
  if (hues.size <= 1) tags.add("monochromatic");
  if (hues.size >= 3) tags.add("diverse");

  return [...tags];
}

function getAllColors(state: GradientState): string[] {
  switch (state.type) {
    case "aura":
      return state.auraPoints.map((p) => p.color);
    case "mesh":
      return state.meshPoints.map((p) => p.color);
    default:
      return state.colors.map((c) => c.color);
  }
}
