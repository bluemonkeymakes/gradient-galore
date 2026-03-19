import { useState, useEffect } from "react";
import { useAtom, useSetAtom } from "jotai";
import { palettesAtom, pickedColorAtom } from "~/lib/atoms";
import {
  parsePalettes,
  loadPalettes,
  savePalettes,
  type Palette,
} from "~/lib/palette";

export function PalettePanel() {
  const [palettes, setPalettes] = useAtom(palettesAtom);
  const setPickedColor = useSetAtom(pickedColorAtom);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    setPalettes(loadPalettes());
  }, [setPalettes]);

  const handleImport = () => {
    if (!importText.trim()) return;
    const parsed = parsePalettes(importText);
    if (parsed.length === 0) return;
    const updated = [...palettes, ...parsed];
    setPalettes(updated);
    savePalettes(updated);
    setImportText("");
    setShowImport(false);
    setExpandedId(parsed[0].id);
  };

  const handleDelete = (id: string) => {
    const updated = palettes.filter((p) => p.id !== id);
    setPalettes(updated);
    savePalettes(updated);
  };

  const handleClear = () => {
    setPalettes([]);
    savePalettes([]);
    setExpandedId(null);
  };

  const handleColorClick = (color: string) => {
    setPickedColor(color);
    // Auto-clear after a moment so it acts as a "just picked" signal
    setTimeout(() => setPickedColor(null), 100);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-dim">
          Palettes
        </h3>
        <div className="flex gap-1.5">
          {palettes.length > 0 && (
            <button
              onClick={handleClear}
              className="text-[10px] px-2 py-0.5 rounded-md text-text-dim hover:text-red-400 transition-all"
            >
              Clear
            </button>
          )}
          <button
            onClick={() => setShowImport(!showImport)}
            className="text-[10px] px-2 py-0.5 rounded-md bg-surface-3 text-text-dim hover:text-text transition-all"
          >
            {showImport ? "Cancel" : "+ Import"}
          </button>
        </div>
      </div>

      {showImport && (
        <div className="space-y-2">
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder={`Paste palette text:\n\n═══ MY PALETTE ═══\n  50  #f0fdfd\n  100 #d1fafa\n  ...`}
            className="w-full h-32 bg-surface border border-border rounded-xl px-3 py-2 text-xs font-mono text-text placeholder:text-text-dim/50 resize-none focus:outline-none focus:border-accent"
          />
          <button
            onClick={handleImport}
            className="w-full py-2 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-all"
          >
            Import Palettes
          </button>
        </div>
      )}

      {palettes.length === 0 && !showImport && (
        <p className="text-xs text-text-dim/60 py-2">
          No palettes yet. Import one to use colors in your gradients.
        </p>
      )}

      <div className="space-y-2">
        {palettes.map((palette) => {
          const isExpanded = expandedId === palette.id;
          return (
            <div key={palette.id} className="bg-surface-3 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedId(isExpanded ? null : palette.id)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-surface-3/80 transition-all"
              >
                <div className="flex h-5 rounded-md overflow-hidden shrink-0">
                  {palette.shades.slice(0, 8).map((s) => (
                    <div
                      key={s.shade}
                      className="w-3 h-5"
                      style={{ backgroundColor: s.color }}
                    />
                  ))}
                </div>
                <span className="text-xs font-medium truncate flex-1 text-left">
                  {palette.name}
                </span>
                <span className="text-[10px] text-text-dim">{palette.shades.length}</span>
                <svg
                  className={`w-3 h-3 text-text-dim transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isExpanded && (
                <div className="px-3 pb-3 space-y-1.5">
                  <div className="grid grid-cols-5 gap-1">
                    {palette.shades.map((s) => (
                      <button
                        key={s.shade}
                        onClick={() => handleColorClick(s.color)}
                        className="group relative aspect-square rounded-lg border border-transparent hover:border-accent transition-all hover:scale-110 hover:z-10"
                        style={{ backgroundColor: s.color }}
                        title={`${s.shade}: ${s.color}\nClick to copy`}
                      >
                        <span className="absolute inset-0 flex items-center justify-center text-[8px] font-mono opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-lg text-white">
                          {s.shade}
                        </span>
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => handleDelete(palette.id)}
                    className="text-[10px] text-text-dim hover:text-red-400 transition-all"
                  >
                    Remove palette
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
