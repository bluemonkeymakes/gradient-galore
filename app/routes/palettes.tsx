import { useState } from "react";
import { useAtom } from "jotai";
import { palettesAtom } from "~/lib/atoms";
import { parsePalettes, type Palette } from "~/lib/palette";
import { Nav } from "~/components/nav";

export function meta() {
  return [
    { title: "Palette Maker — Gradient Galore" },
    { name: "description", content: "Import, create, and manage color palettes." },
  ];
}

function PaletteCard({
  palette,
  onDelete,
}: {
  palette: Palette;
  onDelete: () => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = async (color: string) => {
    await navigator.clipboard.writeText(color);
    setCopied(color);
    setTimeout(() => setCopied(null), 1200);
  };

  return (
    <div className="bg-surface-2 border border-border rounded-2xl overflow-hidden">
      {/* Full-width color strip */}
      <div className="flex h-16">
        {palette.shades.map((s) => (
          <div
            key={s.shade}
            className="flex-1 cursor-pointer hover:flex-[2] transition-all relative group"
            style={{ backgroundColor: s.color }}
            onClick={() => handleCopy(s.color)}
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
              <span className="text-[10px] font-mono text-white font-bold">{s.shade}</span>
              <span className="text-[9px] font-mono text-white/80">
                {copied === s.color ? "Copied!" : s.color}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Info bar */}
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold">{palette.name}</h3>
          <p className="text-xs text-text-dim">{palette.shades.length} shades</p>
        </div>
        <button
          onClick={onDelete}
          className="text-xs px-3 py-1 rounded-lg text-text-dim hover:text-red-400 hover:bg-surface-3 transition-all"
        >
          Remove
        </button>
      </div>

      {/* Shade list */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
          {palette.shades.map((s) => (
            <button
              key={s.shade}
              onClick={() => handleCopy(s.color)}
              className="group flex flex-col items-center gap-1"
            >
              <div
                className="w-full aspect-square rounded-lg border border-transparent group-hover:border-accent transition-all group-hover:scale-110"
                style={{ backgroundColor: s.color }}
              />
              <span className="text-[9px] text-text-dim tabular-nums">{s.shade}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PalettesPage() {
  const [palettes, setPalettes] = useAtom(palettesAtom);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");

  const handleImport = () => {
    if (!importText.trim()) return;
    const parsed = parsePalettes(importText);
    if (parsed.length === 0) return;
    setPalettes([...palettes, ...parsed]);
    setImportText("");
    setShowImport(false);
  };

  const handleDelete = (id: string) => {
    setPalettes(palettes.filter((p) => p.id !== id));
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />

      <main className="flex-1 px-6 py-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Toolbar */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Palettes</h2>
              <p className="text-xs text-text-dim">
                Import palettes and click any swatch to copy its hex value.
              </p>
            </div>
            <button
              onClick={() => setShowImport(!showImport)}
              className="px-4 py-2 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-all"
            >
              {showImport ? "Cancel" : "+ Import Palette"}
            </button>
          </div>

          {/* Import area */}
          {showImport && (
            <div className="bg-surface-2 border border-border rounded-2xl p-5 space-y-4">
              <div>
                <h3 className="text-sm font-semibold mb-1">Paste palette text</h3>
                <p className="text-xs text-text-dim">
                  Supports formats like: <code className="bg-surface-3 px-1 rounded">═══ NAME ═══</code> headers
                  with <code className="bg-surface-3 px-1 rounded">shade #hex</code> rows.
                  Multiple palettes at once are fine.
                </p>
              </div>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={`═══ MY PALETTE ═══\n  50  #f0fdfd\n  100 #d1fafa\n  200 #a3f3f3\n  ...\n\n═══ ANOTHER ═══\n  50  #fff4f2\n  100 #ffe5e0`}
                className="w-full h-48 bg-surface border border-border rounded-xl px-4 py-3 text-sm font-mono text-text placeholder:text-text-dim/40 resize-none focus:outline-none focus:border-accent"
              />
              <button
                onClick={handleImport}
                disabled={!importText.trim()}
                className="px-6 py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Import
              </button>
            </div>
          )}

          {/* Empty state */}
          {palettes.length === 0 && !showImport && (
            <div className="bg-surface-2 border border-border rounded-2xl p-12 text-center">
              <p className="text-text-dim mb-4">No palettes yet.</p>
              <button
                onClick={() => setShowImport(true)}
                className="px-6 py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-all"
              >
                Import Your First Palette
              </button>
            </div>
          )}

          {/* Palette cards */}
          <div className="space-y-6">
            {palettes.map((palette) => (
              <PaletteCard
                key={palette.id}
                palette={palette}
                onDelete={() => handleDelete(palette.id)}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
