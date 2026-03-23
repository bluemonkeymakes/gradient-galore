import { useEffect, useCallback } from "react";
import { useSetAtom, useAtomValue } from "jotai";
import { useLoaderData } from "react-router";
import type { Route } from "./+types/home";
import { gradientAtom, palettesAtom, pushGradientHistoryAtom, undoGradientAtom, redoGradientAtom, gradientHistoryAtom, gradientFutureAtom } from "~/lib/atoms";
import { db } from "~/db";
import { palettes as palettesTable } from "~/db/schema";
import { desc } from "drizzle-orm";
import type { Palette, PaletteColor } from "~/lib/palette";
import { Nav } from "~/components/nav";
import { GradientPreview } from "~/components/gradient-preview";
import { GradientControls } from "~/components/gradient-controls";
import { CodeOutput } from "~/components/code-output";
import { PresetBar } from "~/components/presets";
import { PublishButton } from "~/components/publish-dialog";
import { ToastContainer } from "~/components/toast";

export async function loader() {
  const rows = await db.select().from(palettesTable).orderBy(desc(palettesTable.createdAt));

  const palettes: Palette[] = rows.map((row) => {
    const parsed: PaletteColor[] = (() => {
      try { return JSON.parse(row.shades); } catch { return []; }
    })();
    return {
      id: String(row.id),
      name: row.name,
      colors: Array.isArray(parsed) && parsed.length > 0 && "base" in parsed[0]
        ? parsed
        : [],
    };
  }).filter((p) => p.colors.length > 0);

  return { palettes };
}

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
  const { palettes } = useLoaderData<typeof loader>();
  const setGradient = useSetAtom(gradientAtom);
  const setPalettes = useSetAtom(palettesAtom);
  const pushHistory = useSetAtom(pushGradientHistoryAtom);
  const undo = useSetAtom(undoGradientAtom);
  const redo = useSetAtom(redoGradientAtom);
  const hasUndo = useAtomValue(gradientHistoryAtom).length > 0;
  const hasRedo = useAtomValue(gradientFutureAtom).length > 0;

  // Seed palettes atom from server data
  useEffect(() => {
    setPalettes(palettes);
  }, [palettes, setPalettes]);

  // Keyboard shortcuts: Ctrl+Z undo, Ctrl+Shift+Z redo
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);

  const randomize = () => {
    const randomColor = () =>
      "#" +
      Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, "0");

    setGradient((prev) => {
      pushHistory(prev);
      return {
        ...prev,
        colors: prev.colors.map((c) => ({ ...c, color: randomColor() })),
        auraPoints: prev.auraPoints.map((p) => ({ ...p, color: randomColor() })),
        meshPoints: prev.meshPoints.map((p) => ({ ...p, color: randomColor() })),
        angle: Math.round(Math.random() * 360),
        marbleSeed: Math.round(Math.random() * 100),
      };
    });
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
          <div className="flex gap-1 shrink-0">
            <button
              onClick={() => undo()}
              disabled={!hasUndo}
              className="px-2.5 py-2 rounded-lg bg-surface-2 border border-border text-text-dim hover:text-text transition-all disabled:opacity-30"
              title="Undo (Ctrl+Z)"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
              </svg>
            </button>
            <button
              onClick={() => redo()}
              disabled={!hasRedo}
              className="px-2.5 py-2 rounded-lg bg-surface-2 border border-border text-text-dim hover:text-text transition-all disabled:opacity-30"
              title="Redo (Ctrl+Shift+Z)"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
              </svg>
            </button>
          </div>
          <button
            onClick={randomize}
            className="shrink-0 px-4 py-2 rounded-xl bg-surface-2 border border-border text-sm text-text-dim hover:text-text hover:border-accent transition-all"
          >
            Randomize
          </button>
          <PublishButton />
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
          <aside className="bg-surface-2 border border-border rounded-2xl p-5 lg:sticky lg:top-6 lg:max-h-dvh lg:overflow-y-auto controls-scroll">
            <GradientControls />
          </aside>
        </div>
      </main>
      <ToastContainer />
    </div>
  );
}
