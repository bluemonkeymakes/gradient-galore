import { useState, useRef, useEffect } from "react";
import { Slider } from "~/components/ui/slider";
import { shiftHue, scaleChroma, scaleLightness } from "~/lib/palette";

interface ColorEntry {
  id: string;
  name: string;
  hex: string;
}

export function PaletteAdjustments({
  entries,
  onUpdate,
}: {
  entries: ColorEntry[];
  onUpdate: (entries: ColorEntry[]) => void;
}) {
  const snapshot = useRef<ColorEntry[]>(entries);
  const [hueShift, setHueShift] = useState(0);
  const [satScale, setSatScale] = useState(100);
  const [lightScale, setLightScale] = useState(100);

  // Take a new snapshot when entries change externally (not from our adjustments)
  const lastApplied = useRef<string>("");
  useEffect(() => {
    const key = entries.map((e) => e.hex).join(",");
    if (key !== lastApplied.current) {
      snapshot.current = entries;
      setHueShift(0);
      setSatScale(100);
      setLightScale(100);
    }
  }, [entries]);

  const apply = (h: number, s: number, l: number) => {
    const updated = snapshot.current.map((e) => {
      let hex = e.hex;
      if (h !== 0) hex = shiftHue(hex, h);
      if (s !== 100) hex = scaleChroma(hex, s / 100);
      if (l !== 100) hex = scaleLightness(hex, l / 100);
      return { ...e, hex };
    });
    lastApplied.current = updated.map((e) => e.hex).join(",");
    onUpdate(updated);
  };

  const handleHue = (v: number) => {
    setHueShift(v);
    apply(v, satScale, lightScale);
  };

  const handleSat = (v: number) => {
    setSatScale(v);
    apply(hueShift, v, lightScale);
  };

  const handleLight = (v: number) => {
    setLightScale(v);
    apply(hueShift, satScale, v);
  };

  const handleReset = () => {
    setHueShift(0);
    setSatScale(100);
    setLightScale(100);
    lastApplied.current = snapshot.current.map((e) => e.hex).join(",");
    onUpdate(snapshot.current);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2.5">
        <div className="flex justify-between text-xs">
          <span className="font-medium">Hue Shift</span>
          <span className="text-text-dim tabular-nums bg-surface-3 px-2 py-0.5 rounded-md">
            {hueShift > 0 ? `+${hueShift}` : hueShift}°
          </span>
        </div>
        <Slider min={-180} max={180} step={1} value={[hueShift]} onValueChange={(v) => handleHue(v[0])} />
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex justify-between text-xs">
          <span className="font-medium">Saturation</span>
          <span className="text-text-dim tabular-nums bg-surface-3 px-2 py-0.5 rounded-md">
            {satScale}%
          </span>
        </div>
        <Slider min={0} max={200} step={1} value={[satScale]} onValueChange={(v) => handleSat(v[0])} />
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex justify-between text-xs">
          <span className="font-medium">Lightness</span>
          <span className="text-text-dim tabular-nums bg-surface-3 px-2 py-0.5 rounded-md">
            {lightScale}%
          </span>
        </div>
        <Slider min={0} max={200} step={1} value={[lightScale]} onValueChange={(v) => handleLight(v[0])} />
      </div>

      <button
        onClick={handleReset}
        disabled={hueShift === 0 && satScale === 100 && lightScale === 100}
        className="w-full py-1.5 rounded-lg border border-border text-xs text-text-dim hover:text-text transition-all disabled:opacity-30"
      >
        Reset
      </button>
    </div>
  );
}
