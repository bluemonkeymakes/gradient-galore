export interface PaletteShade {
  shade: string;
  color: string;
}

export interface Palette {
  id: string;
  name: string;
  shades: PaletteShade[];
}

/**
 * Parses pasted palette text in this format:
 *
 *   ═══ BRAND (TEAL) ═══
 *     50  #f0fdfd
 *     100 #d1fafa
 *     ...
 *
 * Also handles simpler formats:
 *   -- Name --
 *   50 #hex
 *
 * Or just raw hex lines:
 *   #ff0000
 *   #00ff00
 */
export function parsePalettes(input: string): Palette[] {
  const lines = input.split("\n");
  const palettes: Palette[] = [];
  let current: Palette | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    // Detect palette header: ═══ NAME ═══  or  -- NAME --  or  === NAME ===
    const headerMatch = line.match(
      /^[═=\-─~*#]+\s*(.+?)\s*[═=\-─~*#]+$/
    );
    if (headerMatch) {
      current = {
        id: Math.random().toString(36).slice(2, 9),
        name: headerMatch[1].trim(),
        shades: [],
      };
      palettes.push(current);
      continue;
    }

    // Detect shade line: "50  #f0fdfd" or "500 #ff3800" or just "#ff3800"
    const shadeMatch = line.match(
      /^(\d{1,4})?\s*(#[0-9a-fA-F]{3,8})\s*$/
    );
    if (shadeMatch) {
      if (!current) {
        current = {
          id: Math.random().toString(36).slice(2, 9),
          name: "Untitled",
          shades: [],
        };
        palettes.push(current);
      }
      current.shades.push({
        shade: shadeMatch[1] ?? String(current.shades.length),
        color: shadeMatch[2].toLowerCase(),
      });
    }
  }

  return palettes;
}

export function palettesToText(palettes: Palette[]): string {
  return palettes
    .map((p) => {
      const header = `═══ ${p.name} ═══`;
      const shades = p.shades
        .map((s) => `  ${s.shade.padStart(4)} ${s.color}`)
        .join("\n");
      return `${header}\n${shades}`;
    })
    .join("\n\n");
}

const STORAGE_KEY = "gradient-galore-palettes";

export function loadPalettes(): Palette[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
}

export function savePalettes(palettes: Palette[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(palettes));
  } catch {}
}
