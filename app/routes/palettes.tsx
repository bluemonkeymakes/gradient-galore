import { useState } from "react";
import { Link, useLoaderData, useFetcher, useNavigate } from "react-router";
import { useSetAtom } from "jotai";
import { db } from "~/db";
import { palettes as palettesTable } from "~/db/schema";
import { desc, eq } from "drizzle-orm";
import { data } from "react-router";
import { parsePalettes, makePaletteColor, autoGenerateName, autoGenerateTags, type Palette, type PaletteColor } from "~/lib/palette";
import { applyPaletteToGradient } from "~/lib/gradient-engine";
import { activePaletteAtom, gradientAtom, pushGradientHistoryAtom } from "~/lib/atoms";
import { Nav } from "~/components/nav";
import type { Route } from "./+types/palettes";

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
        ? parsed : [],
    };
  }).filter((p) => p.colors.length > 0);
  return { palettes };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "delete") {
    const id = Number(formData.get("id"));
    if (!isNaN(id)) {
      await db.delete(palettesTable).where(eq(palettesTable.id, id));
    }
    return data({ ok: true });
  }

  if (intent === "import") {
    const raw = formData.get("text") as string;
    if (!raw) return data({ ok: false }, { status: 400 });
    const parsed = parsePalettes(raw);
    for (const p of parsed) {
      const colors = p.colors;
      if (colors.length === 0) continue;
      const hexes = colors.map((c) => c.base);
      const isGenericName = !p.name || p.name === "Imported" || p.name === "Untitled";
      await db.insert(palettesTable).values({
        name: isGenericName ? autoGenerateName(hexes) : p.name,
        baseColor: colors[0].base,
        shades: JSON.stringify(colors),
        tags: autoGenerateTags(hexes),
      });
    }
    return data({ ok: true });
  }

  if (intent === "removeColor") {
    const id = Number(formData.get("id"));
    const colorName = formData.get("colorName") as string;
    if (isNaN(id)) return data({ ok: false }, { status: 400 });
    const rows = await db.select().from(palettesTable).where(eq(palettesTable.id, id));
    if (rows.length === 0) return data({ ok: false }, { status: 404 });
    const row = rows[0];
    const colors: PaletteColor[] = (() => { try { return JSON.parse(row.shades); } catch { return []; } })();
    const updated = colors.filter((c) => c.name !== colorName);
    if (updated.length === 0) {
      await db.delete(palettesTable).where(eq(palettesTable.id, id));
    } else {
      await db.update(palettesTable).set({ shades: JSON.stringify(updated) }).where(eq(palettesTable.id, id));
    }
    return data({ ok: true });
  }

  if (intent === "reorder") {
    const id = Number(formData.get("id"));
    const from = Number(formData.get("from"));
    const to = Number(formData.get("to"));
    if (isNaN(id)) return data({ ok: false }, { status: 400 });
    const rows = await db.select().from(palettesTable).where(eq(palettesTable.id, id));
    if (rows.length === 0) return data({ ok: false }, { status: 404 });
    const colors: PaletteColor[] = (() => { try { return JSON.parse(rows[0].shades); } catch { return []; } })();
    if (to >= 0 && to < colors.length) {
      [colors[from], colors[to]] = [colors[to], colors[from]];
      await db.update(palettesTable).set({ shades: JSON.stringify(colors) }).where(eq(palettesTable.id, id));
    }
    return data({ ok: true });
  }

  return data({ ok: false, error: "Unknown intent" }, { status: 400 });
}

export function meta() {
  return [
    { title: "Palette Maker — Gradient Galore" },
    { name: "description", content: "Create, import, and manage design color palettes." },
  ];
}

function ColorScaleRow({
  pc,
  onCopy,
  copied,
  onRemove,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  pc: PaletteColor;
  onCopy: (color: string) => void;
  copied: string | null;
  onRemove?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-1">
      {/* Header: reorder + base swatch + name + expand + remove */}
      <div className="flex items-center gap-3">
        <div className="flex flex-col shrink-0 -my-1">
          <button onClick={onMoveUp} disabled={isFirst}
            className="text-text-dim hover:text-text disabled:opacity-20 transition-all leading-none p-0.5"
            title="Move up">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button onClick={onMoveDown} disabled={isLast}
            className="text-text-dim hover:text-text disabled:opacity-20 transition-all leading-none p-0.5"
            title="Move down">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
        <button
          onClick={() => onCopy(pc.base)}
          className="w-8 h-8 rounded-lg shrink-0 border border-transparent hover:border-accent hover:scale-110 transition-all"
          style={{ backgroundColor: pc.base }}
          title={pc.base}
        />
        <span className="text-sm font-medium flex-1">{pc.name}</span>
        <span className="text-xs font-mono text-text-dim">
          {copied === pc.base ? "Copied!" : pc.base}
        </span>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-text-dim hover:text-text transition-all px-2 py-1 rounded-lg hover:bg-surface-3"
        >
          {expanded ? "Collapse" : "All shades"}
        </button>
        {onRemove && (
          <button
            onClick={onRemove}
            className="text-text-dim hover:text-red-400 transition-all text-lg leading-none shrink-0"
            title="Remove color"
          >
            &times;
          </button>
        )}
      </div>

      {/* Shade strip — always visible */}
      <div className="flex h-8 rounded-lg overflow-hidden">
        {pc.shades.map((s) => (
          <div
            key={s.shade}
            className="flex-1 cursor-pointer relative group hover:flex-[2] transition-all"
            style={{ backgroundColor: s.color }}
            onClick={() => onCopy(s.color)}
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
              <span className="text-[8px] font-mono text-white font-bold">{s.shade}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Expanded shade grid */}
      {expanded && (
        <div className="grid grid-cols-11 gap-1.5 pt-1">
          {pc.shades.map((s) => (
            <button
              key={s.shade}
              onClick={() => onCopy(s.color)}
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
  );
}

function PaletteCard({
  palette,
  onDelete,
}: {
  palette: Palette;
  onDelete: () => void;
}) {
  const setActivePalette = useSetAtom(activePaletteAtom);
  const setGradient = useSetAtom(gradientAtom);
  const pushHistory = useSetAtom(pushGradientHistoryAtom);
  const navigate = useNavigate();

  const handleUseInGradient = () => {
    setActivePalette(palette);
    setGradient((prev) => {
      pushHistory(prev);
      return applyPaletteToGradient(prev, palette.colors.map((c) => c.base));
    });
    navigate("/");
  };

  return (
    <div className="bg-surface-2 border border-border rounded-2xl overflow-hidden group hover:border-accent/50 transition-all">
      {/* Key colors strip */}
      <div className="flex h-32">
        {palette.colors.map((pc) => (
          <div key={pc.name} className="flex-1" style={{ backgroundColor: pc.base }} />
        ))}
      </div>
      {/* Shade preview */}
      <div className="flex h-3">
        {palette.colors.map((pc) => (
          <div key={pc.name} className="flex-1 flex">
            {pc.shades.filter((_, i) => i % 2 === 0).map((s) => (
              <div key={s.shade} className="flex-1" style={{ backgroundColor: s.color }} />
            ))}
          </div>
        ))}
      </div>
      {/* Info */}
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold truncate">{palette.name}</h3>
            <p className="text-[10px] text-text-dim">
              {palette.colors.length} color{palette.colors.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex gap-1">
            <Link
              to={`/palettes/create?from=${palette.id}`}
              className="text-xs px-2.5 py-1 rounded-lg text-text-dim hover:text-accent hover:bg-surface-3 transition-all"
            >
              Edit
            </Link>
            <button
              onClick={onDelete}
              className="text-xs px-2.5 py-1 rounded-lg text-text-dim hover:text-red-400 hover:bg-surface-3 transition-all"
            >
              Remove
            </button>
          </div>
        </div>
        <button
          onClick={handleUseInGradient}
          className="w-full py-1.5 rounded-lg text-xs font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-all"
        >
          Use in Gradient
        </button>
      </div>
    </div>
  );
}

function isValidPalette(p: unknown): p is Palette {
  if (!p || typeof p !== "object") return false;
  const obj = p as Record<string, unknown>;
  if (!Array.isArray(obj.colors)) return false;
  return obj.colors.length > 0 && typeof (obj.colors[0] as Record<string, unknown>)?.base === "string";
}

export default function PalettesPage() {
  const { palettes } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");

  const handleImport = () => {
    if (!importText.trim()) return;
    fetcher.submit(
      { intent: "import", text: importText },
      { method: "post" }
    );
    setImportText("");
    setShowImport(false);
  };

  const handleDelete = (id: string) => {
    fetcher.submit(
      { intent: "delete", id },
      { method: "post" }
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />

      <main className="flex-1 px-6 py-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Toolbar */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Palettes</h2>
              <p className="text-xs text-text-dim">
                Build palettes from key colors. Each generates a full shade scale.
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                to="/palettes/create"
                className="px-4 py-2 rounded-xl text-sm font-medium bg-accent text-black hover:bg-accent-hover transition-all"
              >
                + Create
              </Link>
              <button
                onClick={() => setShowImport(!showImport)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  showImport
                    ? "bg-surface-3 border border-border text-text"
                    : "bg-surface-2 border border-border text-text-dim hover:text-text"
                }`}
              >
                {showImport ? "Cancel" : "Import"}
              </button>
              {palettes.length > 0 && (
                <button
                  onClick={() => {
                    if (confirm(`Delete all ${palettes.length} palettes? This cannot be undone.`)) {
                      palettes.forEach((p) => handleDelete(p.id));
                    }
                  }}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-surface-2 border border-border text-text-dim hover:text-red-400 transition-all"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          {/* Import area */}
          {showImport && (
            <div className="bg-surface-2 border border-border rounded-2xl p-5 space-y-4">
              <div>
                <h3 className="text-sm font-semibold mb-1">Paste palette text</h3>
                <p className="text-xs text-text-dim">
                  Supports hex colors, Tailwind configs, CSS variables, named values, and more.
                  Each color generates a full 50-950 shade scale.
                </p>
              </div>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={`Hex colors (one per line or comma-separated):\n#6d28d9, #0891b2, #e11d48\n\nNamed values:\nPrimary: #6d28d9\nAccent: #e11d48\n\nTailwind config:\nprimary: {\n  500: '#6d28d9',\n}\n\nCSS variables:\n--color-brand-500: #6d28d9;`}
                className="w-full h-48 bg-surface border border-border rounded-xl px-4 py-3 text-sm font-mono text-text placeholder:text-text-dim/40 resize-none focus:outline-none focus:border-accent"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowImport(false); setImportText(""); }}
                  className="px-6 py-2.5 rounded-xl border border-border text-sm font-medium text-text-dim hover:text-text transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={!importText.trim()}
                  className="px-6 py-2.5 rounded-xl bg-accent text-black text-sm font-medium hover:bg-accent-hover transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Import
                </button>
              </div>
            </div>
          )}

          {/* Empty state */}
          {palettes.length === 0 && !showImport && (
            <div className="bg-surface-2 border border-border rounded-2xl p-12 text-center">
              <p className="text-text-dim mb-2">No palettes yet.</p>
              <p className="text-xs text-text-dim/60 mb-4">
                Create a palette from key colors or import hex values.
              </p>
              <div className="flex gap-3 justify-center">
                <Link
                  to="/palettes/create"
                  className="px-6 py-2.5 rounded-xl bg-accent text-black text-sm font-medium hover:bg-accent-hover transition-all"
                >
                  Create Palette
                </Link>
                <button
                  onClick={() => setShowImport(true)}
                  className="px-6 py-2.5 rounded-xl border border-border text-sm font-medium text-text-dim hover:text-text transition-all"
                >
                  Import
                </button>
              </div>
            </div>
          )}

          {/* Palette cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {palettes.map((palette) => (
              <PaletteCard
                key={palette.id}
                palette={palette}
                onDelete={() => {
                  if (confirm(`Delete "${palette.name}"?`)) handleDelete(palette.id);
                }}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
