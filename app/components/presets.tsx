import { useSetAtom, useAtomValue } from "jotai";
import { gradientAtom, pushGradientHistoryAtom } from "~/lib/atoms";
import { createId, type GradientState } from "~/lib/gradient-engine";

export interface Preset {
  name: string;
  state: Partial<GradientState>;
}

export const PRESETS: Preset[] = [
  {
    name: "Sunset Blaze",
    state: {
      type: "linear",
      angle: 135,
      repeating: false,
      colors: [
        { id: createId(), color: "#ff6b35", position: 0 },
        { id: createId(), color: "#f7c948", position: 50 },
        { id: createId(), color: "#ff3864", position: 100 },
      ],
    },
  },
  {
    name: "Ocean Deep",
    state: {
      type: "radial",
      radialShape: "ellipse",
      radialSize: "farthest-corner",
      positionX: 40,
      positionY: 40,
      repeating: false,
      colors: [
        { id: createId(), color: "#0ea5e9", position: 0 },
        { id: createId(), color: "#1e3a5f", position: 60 },
        { id: createId(), color: "#0a1628", position: 100 },
      ],
    },
  },
  {
    name: "Neon Sweep",
    state: {
      type: "conic",
      angle: 0,
      positionX: 50,
      positionY: 50,
      repeating: false,
      colors: [
        { id: createId(), color: "#00ff87", position: 0 },
        { id: createId(), color: "#60efff", position: 33 },
        { id: createId(), color: "#ff00e5", position: 66 },
        { id: createId(), color: "#00ff87", position: 100 },
      ],
    },
  },
  {
    name: "Dream Glow",
    state: {
      type: "aura",
      auraBgColor: "#0c0a1e",
      auraPoints: [
        { id: createId(), color: "#a855f7", x: 30, y: 35, size: 70, hardness: 0, opacity: 70, stretch: 60, rotate: 15 },
        { id: createId(), color: "#3b82f6", x: 65, y: 40, size: 65, hardness: 0, opacity: 60, stretch: 40, rotate: 45 },
        { id: createId(), color: "#06b6d4", x: 45, y: 70, size: 75, hardness: 0, opacity: 55, stretch: 55, rotate: 120 },
      ],
    },
  },
  {
    name: "Marble Rose",
    state: {
      type: "marble",
      marbleScale: 6,
      marbleTurbulence: 4,
      marbleSeed: 42,
      marbleRotate: 30,
      marbleBlendMode: "overlay",
      colors: [
        { id: createId(), color: "#fecdd3", position: 0 },
        { id: createId(), color: "#e11d48", position: 40 },
        { id: createId(), color: "#881337", position: 100 },
      ],
    },
  },
  {
    name: "Aurora Mesh",
    state: {
      type: "mesh",
      meshBgColor: "#0a0a2e",
      meshPoints: [
        { id: createId(), color: "#22d3ee", x: 15, y: 25, spread: 45, hardness: 0, opacity: 100, stretch: 65, rotate: 20 },
        { id: createId(), color: "#a78bfa", x: 75, y: 15, spread: 50, hardness: 0, opacity: 90, stretch: 40, rotate: 60 },
        { id: createId(), color: "#34d399", x: 30, y: 75, spread: 40, hardness: 0, opacity: 100, stretch: 50, rotate: 0 },
        { id: createId(), color: "#f472b6", x: 85, y: 70, spread: 35, hardness: 0, opacity: 80, stretch: 70, rotate: 135 },
      ],
    },
  },
];

export function PresetBar() {
  const setGradient = useSetAtom(gradientAtom);
  const pushHistory = useSetAtom(pushGradientHistoryAtom);

  const applyPreset = (preset: Partial<GradientState>) => {
    setGradient((prev) => {
      pushHistory(prev);
      return { ...prev, ...preset };
    });
  };

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
      {PRESETS.map((preset) => (
        <button
          key={preset.name}
          onClick={() => applyPreset(preset.state)}
          className="shrink-0 px-4 py-2 rounded-xl bg-surface-2 border border-border text-sm text-text-dim hover:text-text hover:border-accent transition-all"
        >
          {preset.name}
        </button>
      ))}
    </div>
  );
}
