import { useMemo } from "react";
import { Slider } from "~/components/ui/slider";
import { hexToOklch, oklchToHex } from "~/lib/palette";

export function OklchSliders({
  hex,
  onChange,
}: {
  hex: string;
  onChange: (hex: string) => void;
}) {
  const oklch = useMemo(() => hexToOklch(hex), [hex]);

  const update = (patch: { L?: number; C?: number; h?: number }) => {
    const L = patch.L ?? oklch.L;
    const C = patch.C ?? oklch.C;
    const h = patch.h ?? oklch.h;
    onChange(oklchToHex(L, C, h));
  };

  return (
    <div className="space-y-2 px-1 py-2">
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-text-dim">Hue</span>
          <span className="text-text-dim tabular-nums bg-surface-3 px-1.5 py-0.5 rounded-md">
            {Math.round(oklch.h)}°
          </span>
        </div>
        <Slider
          min={0}
          max={360}
          step={1}
          value={[Math.round(oklch.h)]}
          onValueChange={(v) => update({ h: v[0] })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-text-dim">Chroma</span>
          <span className="text-text-dim tabular-nums bg-surface-3 px-1.5 py-0.5 rounded-md">
            {(oklch.C * 100).toFixed(1)}
          </span>
        </div>
        <Slider
          min={0}
          max={40}
          step={0.5}
          value={[Math.round(oklch.C * 100 * 2) / 2]}
          onValueChange={(v) => update({ C: v[0] / 100 })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-text-dim">Lightness</span>
          <span className="text-text-dim tabular-nums bg-surface-3 px-1.5 py-0.5 rounded-md">
            {(oklch.L * 100).toFixed(0)}%
          </span>
        </div>
        <Slider
          min={0}
          max={100}
          step={1}
          value={[Math.round(oklch.L * 100)]}
          onValueChange={(v) => update({ L: v[0] / 100 })}
        />
      </div>
    </div>
  );
}
