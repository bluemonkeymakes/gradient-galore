import { useState, useMemo } from "react";
import { contrastRatio, wcagLevel } from "~/lib/palette";

interface ColorEntry {
  id: string;
  name: string;
  hex: string;
}

function Badge({ label, pass }: { label: string; pass: boolean }) {
  return (
    <span
      className={`px-2 py-0.5 rounded-md text-xs font-semibold ${
        pass
          ? "bg-green-500/20 text-green-400"
          : "bg-red-500/15 text-red-400/70"
      }`}
    >
      {label} {pass ? "Pass" : "Fail"}
    </span>
  );
}

export function ContrastChecker({ entries }: { entries: ColorEntry[] }) {
  const [fg, setFg] = useState(0);
  const [bg, setBg] = useState(entries.length > 1 ? 1 : 0);

  const fgEntry = entries[fg] ?? entries[0];
  const bgEntry = entries[bg] ?? entries[0];

  const ratio = useMemo(
    () => contrastRatio(fgEntry.hex, bgEntry.hex),
    [fgEntry.hex, bgEntry.hex]
  );
  const levels = useMemo(() => wcagLevel(ratio), [ratio]);

  if (entries.length < 2) {
    return (
      <p className="text-xs text-text-dim">Add at least 2 colors to check contrast.</p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <div className="flex-1 space-y-1">
          <span className="text-xs text-text-dim">Foreground</span>
          <div className="flex gap-1.5 flex-wrap">
            {entries.map((e, i) => (
              <button
                key={e.id}
                onClick={() => setFg(i)}
                className={`w-6 h-6 rounded-md border-2 transition-all ${
                  fg === i ? "border-accent scale-110" : "border-transparent hover:border-accent"
                }`}
                style={{ backgroundColor: e.hex }}
                title={e.name}
              />
            ))}
          </div>
        </div>
        <div className="flex-1 space-y-1">
          <span className="text-xs text-text-dim">Background</span>
          <div className="flex gap-1.5 flex-wrap">
            {entries.map((e, i) => (
              <button
                key={e.id}
                onClick={() => setBg(i)}
                className={`w-6 h-6 rounded-md border-2 transition-all ${
                  bg === i ? "border-accent scale-110" : "border-transparent hover:border-accent"
                }`}
                style={{ backgroundColor: e.hex }}
                title={e.name}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-2xl font-bold tabular-nums">{ratio.toFixed(2)} : 1</span>
        <div className="flex flex-wrap gap-1.5">
          <Badge label="AA" pass={levels.aa} />
          <Badge label="AA Large" pass={levels.aaLarge} />
          <Badge label="AAA" pass={levels.aaa} />
        </div>
      </div>

      <div
        className="rounded-xl p-4 text-sm font-medium"
        style={{ backgroundColor: bgEntry.hex, color: fgEntry.hex }}
      >
        The quick brown fox jumps over the lazy dog.
      </div>
    </div>
  );
}
