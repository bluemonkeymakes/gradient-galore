import { useState, useMemo } from "react";
import { useFetcher } from "react-router";
import { makePaletteColor, autoGenerateName, autoGenerateTags, type PaletteColor } from "~/lib/palette";
import { CollapsibleSection } from "~/components/collapsible-section";
import { HarmonyGenerator } from "~/components/harmony-generator";
import { LockIcon, RandomizeButton } from "~/components/lock-randomize";
import { OklchSliders } from "~/components/oklch-sliders";
import { PaletteAdjustments } from "~/components/palette-adjustments";
import { ContrastChecker } from "~/components/contrast-checker";
import { ExportFormats } from "~/components/export-formats";
import { Switch } from "~/components/ui/switch";

export interface ColorEntry {
  id: string;
  name: string;
  hex: string;
}

const uid = () => Math.random().toString(36).slice(2, 9);

const STARTER: ColorEntry[] = [
  { id: uid(), name: "Primary", hex: "#6d28d9" },
  { id: uid(), name: "Secondary", hex: "#0891b2" },
  { id: uid(), name: "Accent", hex: "#e11d48" },
];

export function PaletteCreator({ onClose }: { onClose: () => void }) {
  const [paletteName, setPaletteName] = useState("");
  const [entries, setEntries] = useState<ColorEntry[]>(STARTER);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [tags, setTags] = useState("");
  const [lockedIds, setLockedIds] = useState<Set<string>>(new Set());
  const [showOklchSliders, setShowOklchSliders] = useState(false);
  const fetcher = useFetcher();

  const isSubmitting = fetcher.state === "submitting";
  const isDone = fetcher.data?.ok;

  const paletteColors: PaletteColor[] = useMemo(
    () => entries.map((e) => makePaletteColor(e.hex, e.name)),
    [entries]
  );

  const updateEntry = (id: string, patch: Partial<ColorEntry>) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...patch } : e))
    );
  };

  const addEntry = () => {
    if (entries.length >= 6) return;
    const names = ["Primary", "Secondary", "Accent", "Neutral", "Highlight", "Surface"];
    const used = new Set(entries.map((e) => e.name));
    const name = names.find((n) => !used.has(n)) ?? `Color ${entries.length + 1}`;
    setEntries([...entries, { id: uid(), name, hex: "#6366f1" }]);
  };

  const removeEntry = (id: string) => {
    if (entries.length <= 1) return;
    setEntries((prev) => prev.filter((e) => e.id !== id));
    setLockedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (expanded === id) setExpanded(null);
  };

  const toggleLock = (id: string) => {
    setLockedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = () => {
    const hexes = entries.map((e) => e.hex);
    const finalName = paletteName.trim() || autoGenerateName(hexes);
    const finalTags = tags.trim() || autoGenerateTags(hexes);
    fetcher.submit(
      {
        category: "palette",
        name: finalName,
        baseColor: entries[0]?.hex ?? "#000000",
        shades: JSON.stringify(paletteColors),
        tags: finalTags,
      },
      { method: "post", action: "/api/publish" }
    );
  };

  if (isDone) {
    setTimeout(onClose, 1200);
  }

  return (
    <div className="bg-surface-2 border border-border rounded-2xl p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Create Palette</h3>
        <button
          onClick={onClose}
          className="text-xs text-text-dim hover:text-text transition-all"
        >
          Cancel
        </button>
      </div>

      {/* Palette name */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-text-dim">Palette Name</label>
        <input
          type="text"
          value={paletteName}
          onChange={(e) => setPaletteName(e.target.value)}
          placeholder="e.g. Brand Colors"
          className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-text placeholder:text-text-dim/40 focus:outline-none focus:border-accent"
        />
      </div>

      {/* Key colors */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-text-dim">
          Key Colors ({entries.length}/6)
        </label>
        <div className="space-y-2">
          {entries.map((entry) => {
            const pc = paletteColors.find((c) => c.name === entry.name);
            const isExpanded = expanded === entry.id;
            return (
              <div key={entry.id} className="bg-surface-3 rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 p-3">
                  <LockIcon
                    locked={lockedIds.has(entry.id)}
                    onToggle={() => toggleLock(entry.id)}
                  />
                  <input
                    type="color"
                    value={entry.hex}
                    onChange={(e) => updateEntry(entry.id, { hex: e.target.value })}
                    className="w-9 h-9 rounded-lg border border-border cursor-pointer bg-transparent shrink-0"
                  />
                  <input
                    type="text"
                    value={entry.name}
                    onChange={(e) => updateEntry(entry.id, { name: e.target.value })}
                    className="bg-transparent text-sm font-medium text-text w-28 focus:outline-none border-b border-transparent focus:border-accent"
                  />
                  <span className="text-xs font-mono text-text-dim">{entry.hex}</span>
                  <button
                    onClick={() => setExpanded(isExpanded ? null : entry.id)}
                    className="ml-auto text-xs text-text-dim hover:text-text transition-all px-2 py-1 rounded-lg hover:bg-surface-4"
                  >
                    {isExpanded ? "Hide shades" : "Show shades"}
                  </button>
                  {entries.length > 1 && (
                    <button
                      onClick={() => removeEntry(entry.id)}
                      className="text-text-dim hover:text-red-400 transition-all text-lg leading-none shrink-0"
                    >
                      &times;
                    </button>
                  )}
                </div>

                {/* OKLCH sliders per entry */}
                {showOklchSliders && (
                  <div className="px-3 border-t border-border">
                    <OklchSliders
                      hex={entry.hex}
                      onChange={(hex) => updateEntry(entry.id, { hex })}
                    />
                  </div>
                )}

                <div className="flex h-6">
                  {pc?.shades.map((s) => (
                    <div key={s.shade} className="flex-1" style={{ backgroundColor: s.color }} />
                  ))}
                </div>

                {isExpanded && pc && (
                  <div className="px-3 py-3 border-t border-border">
                    <div className="grid grid-cols-11 gap-1">
                      {pc.shades.map((s) => (
                        <div key={s.shade} className="flex flex-col items-center gap-1">
                          <div className="w-full aspect-square rounded-lg" style={{ backgroundColor: s.color }} />
                          <span className="text-xs text-text-dim tabular-nums">{s.shade}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {entries.length < 6 && (
          <button
            onClick={addEntry}
            className="w-full py-2 border border-dashed border-border rounded-xl text-sm text-text-dim hover:text-text hover:border-accent transition-all bg-transparent"
          >
            + Add Color
          </button>
        )}
      </div>

      {/* Combined preview */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-text-dim">Preview</label>
        <div className="flex h-12 rounded-xl overflow-hidden">
          {entries.map((e) => (
            <div key={e.id} className="flex-1 relative group" style={{ backgroundColor: e.hex }}>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                <span className="text-xs font-medium text-white">{e.name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Opt-in tools — all collapsed by default */}
      <div className="space-y-2">
        <CollapsibleSection title="Generate from Harmony">
          <HarmonyGenerator entries={entries} onApply={setEntries} />
        </CollapsibleSection>

        <CollapsibleSection title="Lock & Randomize">
          <RandomizeButton
            entries={entries}
            lockedIds={lockedIds}
            onRandomize={setEntries}
          />
        </CollapsibleSection>

        <CollapsibleSection title="OKLCH Fine-Tuning">
          <label className="flex items-center justify-between text-sm cursor-pointer">
            <span>Show sliders per color</span>
            <Switch checked={showOklchSliders} onCheckedChange={setShowOklchSliders} />
          </label>
        </CollapsibleSection>

        <CollapsibleSection title="Palette-Wide Adjustments">
          <PaletteAdjustments entries={entries} onUpdate={setEntries} />
        </CollapsibleSection>

        <CollapsibleSection title="Contrast Checker">
          <ContrastChecker entries={entries} />
        </CollapsibleSection>

        <CollapsibleSection title="Export">
          <ExportFormats entries={entries} />
        </CollapsibleSection>
      </div>

      {/* Tags */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-text-dim">Tags (comma separated)</label>
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="e.g. brand, modern, dark"
          className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-text placeholder:text-text-dim/40 focus:outline-none focus:border-accent"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-text-dim hover:text-text transition-all"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={isSubmitting}
          className="flex-1 py-2.5 rounded-xl bg-accent text-black text-sm font-medium hover:bg-accent-hover transition-all disabled:opacity-50"
        >
          {isDone ? "Saved!" : isSubmitting ? "Saving..." : "Save Palette"}
        </button>
      </div>
    </div>
  );
}
