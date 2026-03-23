import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate, useFetcher, useLoaderData } from "react-router";
import { db } from "~/db";
import { palettes as palettesTable } from "~/db/schema";
import { eq } from "drizzle-orm";
import {
  makePaletteColor,
  randomOklchHex,
  relativeLuminance,
  generateTints,
  generateShades,
  generateTones,
  type PaletteColor,
  type PaletteShade,
} from "~/lib/palette";
import type { Route } from "./+types/palette-create";
import { CollapsibleSection } from "~/components/collapsible-section";
import { HarmonyGenerator } from "~/components/harmony-generator";
import { RandomizeButton } from "~/components/lock-randomize";
import { OklchSliders } from "~/components/oklch-sliders";
import { PaletteAdjustments } from "~/components/palette-adjustments";
import { ContrastChecker } from "~/components/contrast-checker";
import { ExportFormats } from "~/components/export-formats";
import { Switch } from "~/components/ui/switch";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const fromId = url.searchParams.get("from");
  if (!fromId) return { existing: null };

  const id = Number(fromId);
  if (isNaN(id)) return { existing: null };

  const rows = await db.select().from(palettesTable).where(eq(palettesTable.id, id));
  if (rows.length === 0) return { existing: null };

  const row = rows[0];
  const parsed: PaletteColor[] = (() => {
    try {
      const p = JSON.parse(row.shades);
      return Array.isArray(p) && p.length > 0 && "base" in p[0] ? p : [];
    } catch { return []; }
  })();

  return {
    existing: {
      id: row.id,
      name: row.name,
      colors: parsed,
      tags: row.tags,
    },
  };
}

export function meta() {
  return [
    { title: "Create Palette — Gradient Galore" },
    { name: "description", content: "Immersive full-viewport palette creation." },
  ];
}

interface ColorEntry {
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

const NAMES = [
  "Primary", "Secondary", "Accent", "Neutral",
  "Highlight", "Surface", "Muted", "Emphasis",
];

function textColorForBg(hex: string): string {
  return relativeLuminance(hex) > 0.18 ? "#000000" : "#ffffff";
}

function dimColor(hex: string): string {
  return relativeLuminance(hex) > 0.18
    ? "rgba(0,0,0,0.5)"
    : "rgba(255,255,255,0.5)";
}

function ScaleRow({
  label,
  swatches,
  onCopy,
  copied,
}: {
  label: string;
  swatches: PaletteShade[];
  onCopy: (color: string) => void;
  copied: string | null;
}) {
  return (
    <div className="flex h-6 group/row overflow-hidden" title={label}>
      <div className="flex-1 flex min-w-0">
        {swatches.map((s) => {
          const fg = textColorForBg(s.color);
          return (
            <div
              key={s.shade}
              className="flex-1 min-w-0 flex items-center justify-center cursor-pointer hover:flex-[2] transition-all group/swatch relative"
              style={{ backgroundColor: s.color }}
              onClick={() => onCopy(s.color)}
              title={`${label} ${s.shade}: ${s.color}`}
            >
              <span
                className="font-mono leading-none opacity-0 group-hover/swatch:opacity-100 transition-opacity whitespace-nowrap"
                style={{ color: fg, fontSize: "8px" }}
              >
                {copied === s.color ? "Copied!" : s.color}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PaletteCreatePage() {
  const { existing } = useLoaderData<typeof loader>();
  const isEditing = existing !== null;

  const initialEntries: ColorEntry[] = existing
    ? existing.colors.map((c) => ({ id: uid(), name: c.name, hex: c.base }))
    : STARTER;

  const [paletteName, setPaletteName] = useState(existing?.name ?? "Untitled");
  const [entries, setEntries] = useState<ColorEntry[]>(initialEntries);
  const [lockedIds, setLockedIds] = useState<Set<string>>(new Set());
  const [tags, setTags] = useState(existing?.tags ?? "");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showOklchSliders, setShowOklchSliders] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const fetcher = useFetcher();
  const navigate = useNavigate();
  const isSubmitting = fetcher.state === "submitting";
  const isDone = fetcher.data?.ok;

  const paletteColors: PaletteColor[] = useMemo(
    () => entries.map((e) => makePaletteColor(e.hex, e.name)),
    [entries]
  );

  useEffect(() => {
    if (isDone) {
      const timer = setTimeout(() => navigate("/palettes"), 1000);
      return () => clearTimeout(timer);
    }
  }, [isDone, navigate]);

  // Spacebar to randomize unlocked colors
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.code === "Space") {
        e.preventDefault();
        setEntries((prev) =>
          prev.map((entry) =>
            lockedIds.has(entry.id) ? entry : { ...entry, hex: randomOklchHex() }
          )
        );
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lockedIds]);

  const updateEntry = (id: string, patch: Partial<ColorEntry>) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...patch } : e))
    );
  };

  const addEntry = () => {
    if (entries.length >= 8) return;
    const used = new Set(entries.map((e) => e.name));
    const name = NAMES.find((n) => !used.has(n)) ?? `Color ${entries.length + 1}`;
    setEntries([...entries, { id: uid(), name, hex: randomOklchHex() }]);
  };

  const removeEntry = (id: string) => {
    if (entries.length <= 1) return;
    setEntries((prev) => prev.filter((e) => e.id !== id));
    setLockedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const duplicateEntry = (id: string) => {
    if (entries.length >= 8) return;
    setEntries((prev) => {
      const idx = prev.findIndex((e) => e.id === id);
      if (idx === -1) return prev;
      const src = prev[idx];
      const copy = { ...src, id: uid(), name: `${src.name} Copy` };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  };

  const moveEntry = (id: string, dir: -1 | 1) => {
    setEntries((prev) => {
      const idx = prev.findIndex((e) => e.id === id);
      const target = idx + dir;
      if (idx === -1 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const toggleLock = (id: string) => {
    setLockedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCopy = async (color: string) => {
    try { await navigator.clipboard.writeText(color); } catch { return; }
    setCopied(color);
    setTimeout(() => setCopied(null), 1200);
  };

  const handleSave = () => {
    fetcher.submit(
      {
        category: "palette",
        name: paletteName || "Untitled",
        baseColor: entries[0]?.hex ?? "#000000",
        shades: JSON.stringify(paletteColors),
        tags,
      },
      { method: "post", action: "/api/publish" }
    );
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Top bar */}
      <header className="shrink-0 flex items-center gap-3 px-4 py-3 bg-surface-2 border-b border-border z-30">
        <button
          onClick={() => setDrawerOpen(!drawerOpen)}
          className="p-2 rounded-lg text-text-dim hover:text-text hover:bg-surface-3 transition-all"
          title="Toggle tools"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <Link
          to="/palettes"
          className="text-sm text-text-dim hover:text-text transition-all"
        >
          &larr; Back
        </Link>

        <div className="h-5 w-px bg-border" />

        <input
          type="text"
          value={paletteName}
          onChange={(e) => setPaletteName(e.target.value)}
          placeholder="Palette name..."
          className="flex-1 bg-transparent text-sm font-semibold text-text border-b border-transparent focus:border-accent focus:outline-none max-w-64 truncate"
        />

        <span className="text-xs text-text-dim hidden sm:block">
          Press space to randomize
        </span>

        {entries.length < 8 && (
          <button
            onClick={addEntry}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-text-dim hover:text-text border border-border hover:border-accent transition-all"
          >
            + Add
          </button>
        )}

        <button
          onClick={handleSave}
          disabled={isSubmitting}
          className="px-5 py-1.5 rounded-lg bg-accent text-black text-sm font-medium hover:bg-accent-hover transition-all disabled:opacity-40"
        >
          {isDone ? "Saved!" : isSubmitting ? "Saving..." : "Save"}
        </button>
      </header>

      {/* Main area */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Drawer backdrop */}
        {drawerOpen && (
          <div
            className="absolute inset-0 bg-black/40 z-20"
            onClick={() => setDrawerOpen(false)}
          />
        )}

        {/* Drawer panel */}
        <aside
          className={`absolute top-0 left-0 bottom-0 w-80 bg-surface-2 border-r border-border z-30 overflow-y-auto controls-scroll transition-transform duration-300 ${
            drawerOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Tools</h2>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1 rounded-lg text-text-dim hover:text-text hover:bg-surface-3 transition-all"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

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
                <span>Show sliders per column</span>
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

            <div className="space-y-1.5 pt-2 border-t border-border">
              <label className="text-xs font-medium text-text-dim">Tags</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g. brand, modern"
                className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-text placeholder:text-text-dim/40 focus:outline-none focus:border-accent"
              />
            </div>
          </div>
        </aside>

        {/* Color columns — each with its own shade scale at bottom */}
        <div className="flex-1 flex min-w-0 overflow-hidden">
          {entries.map((entry, idx) => {
            const pc = paletteColors.find((c) => c.name === entry.name);
            const fg = textColorForBg(entry.hex);
            const fgDim = dimColor(entry.hex);
            const isLocked = lockedIds.has(entry.id);
            const isFirst = idx === 0;
            const isLast = idx === entries.length - 1;

            return (
              <div
                key={entry.id}
                className="flex-1 flex flex-col min-w-0 overflow-hidden"
              >
                {/* Main color area */}
                <div
                  className="flex-1 flex flex-col items-center overflow-hidden"
                  style={{ backgroundColor: entry.hex }}
                >
                  {/* Column controls */}
                  <div className="shrink-0 flex flex-col items-center gap-1.5 pt-3 pb-2 px-1 overflow-hidden w-full">
                    <input
                      type="color"
                      value={entry.hex}
                      onChange={(e) => updateEntry(entry.id, { hex: e.target.value })}
                      className="w-8 h-8 rounded-lg border-2 cursor-pointer bg-transparent shrink-0"
                      style={{ borderColor: fgDim }}
                    />
                    <input
                      type="text"
                      value={entry.name}
                      onChange={(e) => updateEntry(entry.id, { name: e.target.value })}
                      className="bg-transparent text-center text-xs font-semibold w-full min-w-0 focus:outline-none border-b border-transparent focus:border-current truncate"
                      style={{ color: fg }}
                    />
                    <span
                      className="text-xs font-mono cursor-pointer transition-all hover:opacity-80 truncate max-w-full"
                      style={{ color: fgDim, fontSize: "10px" }}
                      onClick={() => handleCopy(entry.hex)}
                      title="Click to copy"
                    >
                      {copied === entry.hex ? "Copied!" : entry.hex}
                    </span>

                    <div className="flex items-center gap-0.5 flex-wrap justify-center">
                      {!isFirst && (
                        <button
                          onClick={() => moveEntry(entry.id, -1)}
                          className="p-1 rounded-lg transition-all hover:scale-110"
                          style={{ color: fgDim }}
                          title="Move left"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                      )}
                      {!isLast && (
                        <button
                          onClick={() => moveEntry(entry.id, 1)}
                          className="p-1 rounded-lg transition-all hover:scale-110"
                          style={{ color: fgDim }}
                          title="Move right"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => toggleLock(entry.id)}
                        className="p-1 rounded-lg transition-all hover:scale-110"
                        style={{ color: isLocked ? fg : fgDim }}
                        title={isLocked ? "Unlock" : "Lock"}
                      >
                        {isLocked ? (
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <rect x="3" y="11" width="18" height="11" rx="2" />
                            <path d="M7 11V7a5 5 0 0110 0v4" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <rect x="3" y="11" width="18" height="11" rx="2" />
                            <path d="M7 11V7a5 5 0 019.9-1" />
                          </svg>
                        )}
                      </button>
                      {entries.length < 8 && (
                        <button
                          onClick={() => duplicateEntry(entry.id)}
                          className="p-1 rounded-lg transition-all hover:scale-110"
                          style={{ color: fgDim }}
                          title="Duplicate"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <rect x="9" y="9" width="13" height="13" rx="2" />
                            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                          </svg>
                        </button>
                      )}
                      {entries.length > 1 && (
                        <button
                          onClick={() => removeEntry(entry.id)}
                          className="p-1 rounded-lg transition-all hover:scale-110"
                          style={{ color: fgDim }}
                          title="Remove"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" d="M18 6L6 18M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {showOklchSliders && (
                      <div className="w-full bg-surface/80 rounded-lg p-1.5 min-w-0">
                        <OklchSliders
                          hex={entry.hex}
                          onChange={(hex) => updateEntry(entry.id, { hex })}
                        />
                      </div>
                    )}
                  </div>

                  {/* Body fill */}
                  <div className="flex-1" />
                </div>

                {/* Tints, Shades, Tones scales */}
                <div className="shrink-0 overflow-hidden">
                  <ScaleRow
                    label="Tint"
                    swatches={generateTints(entry.hex)}
                    onCopy={handleCopy}
                    copied={copied}
                  />
                  <ScaleRow
                    label="Shade"
                    swatches={generateShades(entry.hex)}
                    onCopy={handleCopy}
                    copied={copied}
                  />
                  <ScaleRow
                    label="Tone"
                    swatches={generateTones(entry.hex)}
                    onCopy={handleCopy}
                    copied={copied}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
