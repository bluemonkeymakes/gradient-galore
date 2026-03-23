import { useState, useMemo } from "react";
import {
  generateHarmony,
  HARMONY_RULES,
  type HarmonyRule,
} from "~/lib/palette";

interface ColorEntry {
  id: string;
  name: string;
  hex: string;
}

const NAMES = ["Primary", "Secondary", "Accent", "Neutral", "Highlight", "Surface"];

export function HarmonyGenerator({
  entries,
  onApply,
}: {
  entries: ColorEntry[];
  onApply: (entries: ColorEntry[]) => void;
}) {
  const [seedHex, setSeedHex] = useState(entries[0]?.hex ?? "#6d28d9");
  const [rule, setRule] = useState<HarmonyRule>("triadic");

  const preview = useMemo(() => generateHarmony(seedHex, rule), [seedHex, rule]);

  const handleApply = () => {
    const next: ColorEntry[] = preview.map((hex, i) => ({
      id: entries[i]?.id ?? Math.random().toString(36).slice(2, 9),
      name: entries[i]?.name ?? NAMES[i] ?? `Color ${i + 1}`,
      hex,
    }));
    onApply(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="space-y-1">
          <span className="text-xs text-text-dim">Seed</span>
          <input
            type="color"
            value={seedHex}
            onChange={(e) => setSeedHex(e.target.value)}
            className="block w-8 h-8 rounded-lg border border-border cursor-pointer bg-transparent"
          />
        </div>
        <div className="flex-1 space-y-1">
          <span className="text-xs text-text-dim">Rule</span>
          <div className="flex gap-1 bg-surface rounded-xl p-1">
            {HARMONY_RULES.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRule(opt.value)}
                className={`flex-1 py-1.5 px-1 rounded-lg text-xs font-medium transition-all ${
                  rule === opt.value
                    ? "bg-accent text-black"
                    : "text-text-dim hover:text-text"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <span className="text-xs text-text-dim">Preview ({preview.length} colors)</span>
        <div className="flex h-8 rounded-lg overflow-hidden">
          {preview.map((hex, i) => (
            <div key={i} className="flex-1" style={{ backgroundColor: hex }} />
          ))}
        </div>
      </div>

      <button
        onClick={handleApply}
        className="w-full py-2 rounded-xl bg-accent text-black text-xs font-medium hover:bg-accent-hover transition-all"
      >
        Apply Harmony
      </button>
    </div>
  );
}
