import { useAtomValue, useAtom, useSetAtom } from "jotai";
import { palettesAtom, activeColorTargetAtom, gradientAtom } from "~/lib/atoms";

export function PaletteStrip() {
  const palettes = useAtomValue(palettesAtom);
  const [target, setTarget] = useAtom(activeColorTargetAtom);
  const setGradient = useSetAtom(gradientAtom);

  if (palettes.length === 0) return null;

  const applyColor = (color: string) => {
    if (!target) return;

    setGradient((prev) => {
      switch (target.type) {
        case "color":
          return {
            ...prev,
            colors: prev.colors.map((c) =>
              c.id === target.id ? { ...c, color } : c
            ),
          };
        case "aura":
          return {
            ...prev,
            auraPoints: prev.auraPoints.map((p) =>
              p.id === target.id ? { ...p, color } : p
            ),
          };
        case "mesh":
          return {
            ...prev,
            meshPoints: prev.meshPoints.map((p) =>
              p.id === target.id ? { ...p, color } : p
            ),
          };
        case "auraBg":
          return { ...prev, auraBgColor: color };
        case "meshBg":
          return { ...prev, meshBgColor: color };
        default:
          return prev;
      }
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-dim">
          Quick Colors
        </h3>
        {!target && (
          <span className="text-[10px] text-text-dim/50">
            Select a color first
          </span>
        )}
        {target && (
          <span className="text-[10px] text-accent">
            Click a swatch to apply
          </span>
        )}
      </div>
      <div className="space-y-1.5">
        {palettes.map((palette) => (
          <div key={palette.id} className="flex items-center gap-1.5">
            <span className="text-[9px] text-text-dim w-10 truncate shrink-0" title={palette.name}>
              {palette.name}
            </span>
            <div className="flex gap-0.5 flex-1 overflow-hidden">
              {palette.shades.map((s) => (
                <button
                  key={s.shade}
                  onClick={() => applyColor(s.color)}
                  disabled={!target}
                  className="w-4 h-4 rounded-sm shrink-0 border border-transparent hover:border-accent hover:scale-125 transition-all disabled:opacity-40 disabled:hover:scale-100 disabled:hover:border-transparent"
                  style={{ backgroundColor: s.color }}
                  title={`${s.shade}: ${s.color}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
