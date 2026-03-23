import { useState, useMemo } from "react";
import {
  makePaletteColor,
  exportAsTailwind,
  exportAsCssVars,
  exportAsJson,
  exportAsHexList,
  type PaletteColor,
} from "~/lib/palette";

interface ColorEntry {
  id: string;
  name: string;
  hex: string;
}

type Format = "tailwind" | "css" | "json" | "hex";

const FORMATS: { value: Format; label: string }[] = [
  { value: "tailwind", label: "Tailwind" },
  { value: "css", label: "CSS Vars" },
  { value: "json", label: "JSON" },
  { value: "hex", label: "Hex List" },
];

const formatters: Record<Format, (colors: PaletteColor[]) => string> = {
  tailwind: exportAsTailwind,
  css: exportAsCssVars,
  json: exportAsJson,
  hex: exportAsHexList,
};

export function ExportFormats({ entries }: { entries: ColorEntry[] }) {
  const [format, setFormat] = useState<Format>("tailwind");
  const [copied, setCopied] = useState(false);

  const paletteColors = useMemo(
    () => entries.map((e) => makePaletteColor(e.hex, e.name)),
    [entries]
  );

  const output = useMemo(
    () => formatters[format](paletteColors),
    [format, paletteColors]
  );

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(output); } catch { return; }
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-1 bg-surface rounded-xl p-1">
        {FORMATS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFormat(f.value)}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
              format === f.value
                ? "bg-accent text-black"
                : "text-text-dim hover:text-text"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <pre className="bg-surface border border-border rounded-xl p-3 text-xs font-mono text-text-dim overflow-x-auto max-h-48 overflow-y-auto">
        {output}
      </pre>

      <button
        onClick={handleCopy}
        className="w-full py-2 rounded-xl border border-border text-xs font-medium text-text hover:bg-surface-3 transition-all"
      >
        {copied ? "Copied!" : "Copy to Clipboard"}
      </button>
    </div>
  );
}
