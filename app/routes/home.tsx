import { useSetAtom } from "jotai";
import type { Route } from "./+types/home";
import { gradientAtom } from "~/lib/atoms";
import { Nav } from "~/components/nav";
import { GradientPreview } from "~/components/gradient-preview";
import { GradientControls } from "~/components/gradient-controls";
import { CodeOutput } from "~/components/code-output";
import { PresetBar } from "~/components/presets";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Gradient Galore — Gradient Maker" },
    {
      name: "description",
      content:
        "Create beautiful linear, radial, conic, aura, marble, and mesh gradients. Copy the CSS instantly.",
    },
  ];
}

export default function Home() {
  const setGradient = useSetAtom(gradientAtom);

  const randomize = () => {
    const randomColor = () =>
      "#" +
      Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, "0");

    setGradient((prev) => ({
      ...prev,
      colors: prev.colors.map((c) => ({ ...c, color: randomColor() })),
      auraPoints: prev.auraPoints.map((p) => ({ ...p, color: randomColor() })),
      meshPoints: prev.meshPoints.map((p) => ({ ...p, color: randomColor() })),
      angle: Math.round(Math.random() * 360),
      marbleSeed: Math.round(Math.random() * 100),
    }));
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />

      {/* Presets + Randomize */}
      <div className="border-b border-border px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <PresetBar />
          </div>
          <button
            onClick={randomize}
            className="shrink-0 px-4 py-2 rounded-xl bg-surface-2 border border-border text-sm text-text-dim hover:text-text hover:border-accent transition-all"
          >
            Randomize
          </button>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 px-6 py-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          {/* Preview + Code */}
          <div className="space-y-6 min-w-0">
            <GradientPreview />
            <CodeOutput />
          </div>

          {/* Controls + Palettes */}
          <aside className="bg-surface-2 border border-border rounded-2xl p-5 h-fit">
            <GradientControls />
          </aside>
        </div>
      </main>
    </div>
  );
}
