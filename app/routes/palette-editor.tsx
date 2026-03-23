import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate, useLoaderData, useFetcher, Link } from "react-router";
import { db } from "~/db";
import { palettes as palettesTable } from "~/db/schema";
import { eq } from "drizzle-orm";
import { data } from "react-router";
import { makePaletteColor, type PaletteColor, type PaletteShade } from "~/lib/palette";
import { Nav } from "~/components/nav";
import type { Route } from "./+types/palette-editor";

const uid = () => Math.random().toString(36).slice(2, 9);

export async function loader({ params }: Route.LoaderArgs) {
  const id = Number(params.id);
  if (isNaN(id)) throw new Response("Not found", { status: 404 });

  const rows = await db.select().from(palettesTable).where(eq(palettesTable.id, id));
  if (rows.length === 0) throw new Response("Not found", { status: 404 });

  const row = rows[0];
  const parsed: PaletteColor[] | PaletteShade[] = (() => {
    try { return JSON.parse(row.shades); } catch { return []; }
  })();

  const colors: PaletteColor[] = Array.isArray(parsed) && parsed.length > 0 && "base" in parsed[0]
    ? (parsed as PaletteColor[])
    : [];

  if (colors.length === 0 && row.baseColor) {
    colors.push(makePaletteColor(row.name, row.baseColor));
  }

  return { palette: { id: row.id, name: row.name, colors } };
}

export async function action({ request, params }: Route.ActionArgs) {
  const id = Number(params.id);
  if (isNaN(id)) return data({ ok: false }, { status: 400 });

  const formData = await request.formData();
  const name = formData.get("name") as string;
  const shades = formData.get("shades") as string;

  if (!name || !shades) return data({ ok: false }, { status: 400 });

  await db.update(palettesTable)
    .set({ name, shades })
    .where(eq(palettesTable.id, id));

  return data({ ok: true });
}

interface HistoryEntry {
  id: string;
  label: string;
  snapshot: PaletteColor[];
  time: number;
}

/** Color input that separates live preview (input) from commit (change).
 *  React's onChange fires continuously for color inputs, so we
 *  attach a native "change" listener which only fires on picker close. */
function ColorPicker({
  value,
  onPreview,
  onCommit,
  className,
}: {
  value: string;
  onPreview: (hex: string) => void;
  onCommit: (hex: string) => void;
  className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handler = (e: Event) => onCommit((e.target as HTMLInputElement).value);
    el.addEventListener("change", handler);
    return () => el.removeEventListener("change", handler);
  }, [onCommit]);

  return (
    <input
      ref={ref}
      type="color"
      value={value}
      onInput={(e) => onPreview((e.target as HTMLInputElement).value)}
      onChange={() => {}} // suppress React warning, native handler does the work
      className={className}
    />
  );
}

export function meta() {
  return [
    { title: "Edit Palette — Gradient Galore" },
  ];
}

export default function PaletteEditorPage() {
  const navigate = useNavigate();
  const { palette } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  // Working copy of colors
  const [colors, setColors] = useState<PaletteColor[]>(
    () => palette?.colors ?? []
  );
  const [paletteName, setPaletteName] = useState(
    () => palette?.name ?? "Untitled"
  );
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    if (!palette) return [];
    return [{
      id: uid(),
      label: "Original",
      snapshot: palette.colors,
      time: Date.now(),
    }];
  });
  const [activeHistoryIdx, setActiveHistoryIdx] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const pushHistory = useCallback((label: string, next: PaletteColor[]) => {
    setHistory((prev) => {
      // Trim any future entries if we were in the middle of history
      const trimmed = prev.slice(activeHistoryIdx);
      return [
        { id: uid(), label, snapshot: next, time: Date.now() },
        ...trimmed,
      ];
    });
    setActiveHistoryIdx(0);
    setColors(next);
    setDirty(true);
  }, [activeHistoryIdx]);

  const navigateTo = useCallback((idx: number) => {
    const entry = history[idx];
    if (!entry) return;
    setColors(entry.snapshot);
    setActiveHistoryIdx(idx);
    setDirty(true);
  }, [history]);

  const handleSave = () => {
    fetcher.submit(
      { name: paletteName, shades: JSON.stringify(colors) },
      { method: "post" }
    );
    setDirty(false);
  };

  const handleCopy = async (color: string) => {
    try { await navigator.clipboard.writeText(color); } catch { return; }
    setCopied(color);
    setTimeout(() => setCopied(null), 1200);
  };

  // --- Editing actions ---
  // Live preview while dragging color picker (no history entry)
  const previewColor = (idx: number, hex: string) => {
    setColors((prev) => {
      const next = [...prev];
      next[idx] = makePaletteColor(hex, prev[idx].name);
      return next;
    });
    setDirty(true);
  };

  // Commit on picker close — logs to history
  const commitColor = (idx: number, hex: string) => {
    const next = [...colors];
    next[idx] = makePaletteColor(hex, colors[idx].name);
    pushHistory(`Changed ${colors[idx].name} to ${hex}`, next);
  };

  // Live preview rename (no history entry)
  const previewRename = (idx: number, name: string) => {
    setColors((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], name };
      return next;
    });
    setDirty(true);
  };

  // Commit rename on blur/Enter
  const commitRename = (idx: number) => {
    pushHistory(`Renamed to "${colors[idx].name}"`, colors);
  };

  const removeColor = (idx: number) => {
    const name = colors[idx].name;
    const next = colors.filter((_, i) => i !== idx);
    pushHistory(`Removed ${name}`, next);
  };

  const addColor = () => {
    const names = ["Primary", "Secondary", "Accent", "Neutral", "Highlight", "Surface"];
    const used = new Set(colors.map((c) => c.name));
    const name = names.find((n) => !used.has(n)) ?? `Color ${colors.length + 1}`;
    const next = [...colors, makePaletteColor("#6366f1", name)];
    pushHistory(`Added ${name}`, next);
  };

  const moveColor = (from: number, to: number) => {
    if (to < 0 || to >= colors.length) return;
    const next = [...colors];
    [next[from], next[to]] = [next[to], next[from]];
    pushHistory(`Moved ${colors[from].name}`, next);
  };

  if (!palette) {
    return (
      <div className="min-h-screen flex flex-col">
        <Nav />
        <main className="flex-1 px-6 py-12">
          <div className="max-w-5xl mx-auto text-center">
            <p className="text-text-dim mb-4">Palette not found.</p>
            <Link to="/palettes" className="text-accent hover:underline text-sm">
              Back to palettes
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />

      <main className="flex-1 px-6 py-6">
        <div className="max-w-7xl mx-auto">
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Link to="/palettes" className="text-text-dim hover:text-text transition-all text-sm">
                &larr; Palettes
              </Link>
              <input
                type="text"
                value={paletteName}
                onChange={(e) => { setPaletteName(e.target.value); setDirty(true); }}
                className="text-lg font-semibold bg-transparent border-b border-transparent focus:border-accent focus:outline-none"
              />
              {dirty && (
                <span className="text-xs text-text-dim bg-surface-3 px-2 py-0.5 rounded-md">
                  Unsaved
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={!dirty}
                className="px-5 py-2 rounded-xl bg-accent text-black text-sm font-medium hover:bg-accent-hover transition-all disabled:opacity-40"
              >
                Save
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
            {/* Editor */}
            <div className="space-y-6">
              {/* Key colors hero strip — click to edit */}
              <div className="flex h-28 rounded-2xl overflow-hidden">
                {colors.map((pc, idx) => (
                  <label
                    key={idx}
                    className="flex-1 relative group cursor-pointer"
                    style={{ backgroundColor: pc.base }}
                  >
                    <ColorPicker
                      value={pc.base}
                      onPreview={(hex) => previewColor(idx, hex)}
                      onCommit={(hex) => commitColor(idx, hex)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/25 pointer-events-none">
                      <span className="text-xs font-medium text-white">{pc.name}</span>
                      <span className="text-[10px] font-mono text-white/80 mt-0.5">{pc.base}</span>
                      <span className="text-[9px] text-white/50 mt-1">Click to edit</span>
                    </div>
                  </label>
                ))}
              </div>

              {/* Color editors */}
              <div className="space-y-3">
                {colors.map((pc, idx) => (
                  <div
                    key={idx}
                    className="bg-surface-2 border border-border rounded-xl overflow-hidden"
                  >
                    {/* Color header row */}
                    <div className="flex items-center gap-3 p-3">
                      <div className="flex flex-col shrink-0 -my-1">
                        <button onClick={() => moveColor(idx, idx - 1)} disabled={idx === 0}
                          className="text-text-dim hover:text-text disabled:opacity-20 transition-all leading-none p-0.5">
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        <button onClick={() => moveColor(idx, idx + 1)} disabled={idx === colors.length - 1}
                          className="text-text-dim hover:text-text disabled:opacity-20 transition-all leading-none p-0.5">
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                      <ColorPicker
                        value={pc.base}
                        onPreview={(hex) => previewColor(idx, hex)}
                        onCommit={(hex) => commitColor(idx, hex)}
                        className="w-9 h-9 rounded-lg border border-border cursor-pointer bg-transparent shrink-0"
                      />
                      <input
                        type="text"
                        value={pc.name}
                        onChange={(e) => previewRename(idx, e.target.value)}
                        onBlur={() => commitRename(idx)}
                        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                        className="bg-transparent text-sm font-medium text-text w-32 focus:outline-none border-b border-transparent focus:border-accent"
                      />
                      <span className="text-xs font-mono text-text-dim">{pc.base}</span>
                      <button
                        onClick={() => setExpanded(expanded === pc.name ? null : pc.name)}
                        className="ml-auto text-xs text-text-dim hover:text-text transition-all px-2 py-1 rounded-lg hover:bg-surface-3"
                      >
                        {expanded === pc.name ? "Hide" : "Shades"}
                      </button>
                      {colors.length > 1 && (
                        <button
                          onClick={() => removeColor(idx)}
                          className="text-text-dim hover:text-red-400 transition-all text-lg leading-none shrink-0"
                        >
                          &times;
                        </button>
                      )}
                    </div>

                    {/* Shade strip */}
                    <div className="flex h-8">
                      {pc.shades.map((s) => (
                        <div
                          key={s.shade}
                          className="flex-1 cursor-pointer relative group hover:flex-[2] transition-all"
                          style={{ backgroundColor: s.color }}
                          onClick={() => handleCopy(s.color)}
                        >
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                            <span className="text-[8px] font-mono text-white font-bold">{s.shade}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Expanded grid */}
                    {expanded === pc.name && (
                      <div className="grid grid-cols-6 sm:grid-cols-11 gap-1.5 p-3 border-t border-border">
                        {pc.shades.map((s) => (
                          <button
                            key={s.shade}
                            onClick={() => handleCopy(s.color)}
                            className="group flex flex-col items-center gap-1"
                          >
                            <div
                              className="w-full aspect-square rounded-lg border border-transparent group-hover:border-accent transition-all group-hover:scale-110"
                              style={{ backgroundColor: s.color }}
                            />
                            <span className="text-[8px] text-text-dim tabular-nums">{s.shade}</span>
                            <span className="text-[7px] font-mono text-text-dim/60">
                              {copied === s.color ? "Copied!" : s.color}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {colors.length < 8 && (
                  <button
                    onClick={addColor}
                    className="w-full py-2.5 border border-dashed border-border rounded-xl text-sm text-text-dim hover:text-text hover:border-accent transition-all bg-transparent"
                  >
                    + Add Color
                  </button>
                )}
              </div>
            </div>

            {/* History sidebar */}
            <aside className="bg-surface-2 border border-border rounded-2xl p-4 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto scrollbar-none">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-dim mb-3">
                Change Log
              </h3>
              {history.length === 0 ? (
                <p className="text-xs text-text-dim/50">No changes yet.</p>
              ) : (
                <div className="space-y-1">
                  {history.map((entry, idx) => {
                    const isActive = idx === activeHistoryIdx;
                    const time = new Date(entry.time);
                    const timeStr = time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
                    return (
                      <button
                        key={entry.id}
                        onClick={() => navigateTo(idx)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all ${
                          isActive
                            ? "bg-accent/10 text-text"
                            : "text-text-dim hover:text-text hover:bg-surface-3"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium truncate">{entry.label}</span>
                          {isActive && (
                            <span className="text-[9px] text-accent shrink-0">Current</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-text-dim/50 tabular-nums">{timeStr}</span>
                          {/* Mini color preview */}
                          <div className="flex gap-px flex-1 justify-end">
                            {entry.snapshot.map((pc) => (
                              <div
                                key={pc.name}
                                className="w-3 h-3 rounded-sm"
                                style={{ backgroundColor: pc.base }}
                              />
                            ))}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
