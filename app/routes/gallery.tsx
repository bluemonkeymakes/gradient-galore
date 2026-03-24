import { useState } from "react";
import { useLoaderData, useSearchParams, Link, useFetcher, useNavigate } from "react-router";
import { useSetAtom } from "jotai";
import { db } from "~/db";
import { gradients, palettes, type PaletteRow } from "~/db/schema";
import { desc, eq, and, ilike } from "drizzle-orm";
import { data } from "react-router";
import { Nav } from "~/components/nav";
import { GRADIENT_TYPES, applyPaletteToGradient, type GradientState } from "~/lib/gradient-engine";
import { GradientThumbnail } from "~/components/gradient-thumbnail";
import { activePaletteAtom, gradientAtom, pushGradientHistoryAtom } from "~/lib/atoms";
import { hexToOklch, type PaletteColor, type PaletteShade } from "~/lib/palette";
import type { Route } from "./+types/gallery";

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "gradients", label: "Gradients" },
  { value: "palettes", label: "Palettes" },
];

const GRADIENT_SUBTYPES = [{ value: "all", label: "All" }, ...GRADIENT_TYPES];

function isAdmin(request: Request): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  const cookies = request.headers.get("cookie") || "";
  const match = cookies.match(/admin_token=([^;]+)/);
  return match?.[1] === secret;
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const category = url.searchParams.get("category") || "all";
  const type = url.searchParams.get("type") || "all";
  const tag = url.searchParams.get("tag") || "";

  // Allow setting admin cookie via ?admin=<secret>
  const adminParam = url.searchParams.get("admin");
  const adminSecret = process.env.ADMIN_SECRET;
  let headers: HeadersInit | undefined;
  if (adminParam && adminSecret && adminParam === adminSecret) {
    headers = { "Set-Cookie": `admin_token=${adminSecret}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=86400` };
  }

  const admin = isAdmin(request) || (adminParam === adminSecret);

  const gradientRows =
    category !== "palettes"
      ? await db.select().from(gradients)
          .where(and(
            type !== "all" ? eq(gradients.type, type) : undefined,
            tag ? ilike(gradients.tags, `%${tag}%`) : undefined,
          ))
          .orderBy(desc(gradients.createdAt))
      : [];

  const paletteRows =
    category !== "gradients"
      ? await db.select().from(palettes)
          .where(tag ? ilike(palettes.tags, `%${tag}%`) : undefined)
          .orderBy(desc(palettes.createdAt))
      : [];

  const result = { gradients: gradientRows, palettes: paletteRows, category, type, tag, admin };
  return headers ? data(result, { headers }) : result;
}

export async function action({ request }: Route.ActionArgs) {
  if (!isAdmin(request)) {
    return data({ ok: false, error: "Unauthorized" }, { status: 403 });
  }

  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  const id = Number(formData.get("id"));
  if (isNaN(id)) return data({ ok: false }, { status: 400 });

  if (intent === "delete-gradient") {
    await db.delete(gradients).where(eq(gradients.id, id));
    return data({ ok: true });
  }

  if (intent === "delete-palette") {
    await db.delete(palettes).where(eq(palettes.id, id));
    return data({ ok: true });
  }

  return data({ ok: false, error: "Unknown intent" }, { status: 400 });
}

function GradientCard({ gradient, admin }: { gradient: typeof gradients.$inferSelect; admin: boolean }) {
  const state: GradientState | null = (() => {
    try { return JSON.parse(gradient.state); } catch { return null; }
  })();
  const fetcher = useFetcher();
  const tags = gradient.tags.split(",").map((t) => t.trim()).filter(Boolean);

  if (fetcher.data?.ok) return null;

  return (
    <div className="relative h-full">
      <Link to={`/gallery/${gradient.id}`}
        className="bg-surface-2 border border-border rounded-2xl overflow-hidden group hover:border-accent/50 transition-all flex flex-col h-full">
        {state ? (
          <GradientThumbnail state={state} className="aspect-video" />
        ) : (
          <div className="aspect-video" style={{ background: gradient.previewCss }} />
        )}
        <div className="p-3 space-y-1.5 flex-1 flex flex-col">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold truncate">{gradient.name}</h3>
            <span className="text-xs text-text-dim bg-surface-3 px-2 py-0.5 rounded-md capitalize shrink-0">
              {gradient.type}
            </span>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-auto">
              {tags.map((tag) => (
                <span key={tag} className="text-xs text-text-dim bg-surface-3 px-1.5 py-0.5 rounded">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </Link>
      {admin && (
        <fetcher.Form method="post" className="absolute top-2 right-2 z-10"
          onSubmit={(e) => { if (!confirm("Delete this gradient?")) e.preventDefault(); }}>
          <input type="hidden" name="intent" value="delete-gradient" />
          <input type="hidden" name="id" value={gradient.id} />
          <button
            type="submit"
            className="w-7 h-7 rounded-lg bg-black/60 text-white/70 hover:text-red-400 hover:bg-black/80 transition-all flex items-center justify-center text-sm"
            title="Delete gradient"
          >
            &times;
          </button>
        </fetcher.Form>
      )}
    </div>
  );
}

function PaletteGalleryCard({ palette, admin }: { palette: PaletteRow; admin: boolean; }) {
  const setActivePalette = useSetAtom(activePaletteAtom);
  const setGradient = useSetAtom(gradientAtom);
  const pushHistory = useSetAtom(pushGradientHistoryAtom);
  const navigate = useNavigate();
  // Handle both new format (PaletteColor[]) and legacy format (PaletteShade[])
  const parsed: PaletteColor[] | PaletteShade[] = (() => {
    try { return JSON.parse(palette.shades); } catch { return []; }
  })();

  const colors: PaletteColor[] = Array.isArray(parsed) && parsed.length > 0 && "base" in parsed[0]
    ? (parsed as PaletteColor[])
    : [];
  const legacyShades: PaletteShade[] = colors.length === 0 ? (parsed as PaletteShade[]) : [];

  const fetcher = useFetcher();
  const tags = palette.tags.split(",").map((t) => t.trim()).filter(Boolean);

  if (fetcher.data?.ok) return null;

  return (
    <div className="relative h-full">
    <Link to={`/palettes/create?from=${palette.id}`}
      className="bg-surface-2 border border-border rounded-2xl overflow-hidden group hover:border-accent/50 transition-all flex flex-col h-full">
      {/* Thumbnail — base colors + tone strip */}
      <div className="flex flex-col aspect-video">
        <div className="flex flex-1">
          {colors.length > 0 ? (
            colors.map((pc) => (
              <div key={pc.name} className="flex-1" style={{ backgroundColor: pc.base }} />
            ))
          ) : (
            legacyShades.map((s) => (
              <div key={s.shade} className="flex-1" style={{ backgroundColor: s.color }} />
            ))
          )}
        </div>
        {colors.length > 0 && (
          <div className="flex h-5">
            {colors.map((pc) => (
              <div key={pc.name} className="flex-1 flex">
                {pc.shades.filter((_, i) => i % 2 === 0).map((s) => (
                  <div key={s.shade} className="flex-1" style={{ backgroundColor: s.color }} />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Info below */}
      <div className="p-3 space-y-1.5 flex-1 flex flex-col">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold truncate">{palette.name}</h3>
          <span className="text-xs text-text-dim bg-surface-3 px-2 py-0.5 rounded-md shrink-0">
            {colors.length > 0 ? `${colors.length} colors` : "Palette"}
          </span>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.map((tag) => (
              <span key={tag} className="text-xs text-text-dim bg-surface-3 px-1.5 py-0.5 rounded">
                {tag}
              </span>
            ))}
          </div>
        )}
        {colors.length > 0 && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const pal = { id: String(palette.id), name: palette.name, colors };
              setActivePalette(pal);
              setGradient((prev) => {
                pushHistory(prev);
                return applyPaletteToGradient(prev, colors.map((c) => c.base));
              });
              navigate("/");
            }}
            className="w-full mt-auto py-1.5 rounded-lg text-xs font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-all"
          >
            Use in Gradient
          </button>
        )}
      </div>
    </Link>
    {admin && (
      <fetcher.Form method="post" className="absolute top-2 right-2 z-10"
        onSubmit={(e) => { if (!confirm("Delete this palette?")) e.preventDefault(); }}>
        <input type="hidden" name="intent" value="delete-palette" />
        <input type="hidden" name="id" value={palette.id} />
        <button
          type="submit"
          className="w-7 h-7 rounded-lg bg-black/60 text-white/70 hover:text-red-400 hover:bg-black/80 transition-all flex items-center justify-center text-sm"
          title="Delete palette"
        >
          &times;
        </button>
      </fetcher.Form>
    )}
    </div>
  );
}

export function meta() {
  return [
    { title: "Gallery — Gradient Galore" },
    { name: "description", content: "Browse published gradients and palettes." },
  ];
}

export default function GalleryPage() {
  const { gradients: gradientItems, palettes: paletteItems, category, type, tag, admin } =
    useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();

  const totalCount = gradientItems.length + paletteItems.length;

  const setFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    // Clear type sub-filter when switching categories
    if (key === "category" && value !== "gradients") {
      params.delete("type");
    }
    setSearchParams(params);
  };

  const [sortBy, setSortBy] = useState<"color" | "recent">("color");

  type GalleryItem =
    | { kind: "gradient"; item: (typeof gradientItems)[number] }
    | { kind: "palette"; item: (typeof paletteItems)[number] };

  // Extract all hex colors from an item
  const getColors = (entry: GalleryItem): string[] => {
    if (entry.kind === "gradient") {
      try {
        const state: GradientState = JSON.parse(entry.item.state);
        const colors = state.colors?.map((c) => c.color) ?? [];
        const aura = state.auraPoints?.map((p) => p.color) ?? [];
        const mesh = state.meshPoints?.map((p) => p.color) ?? [];
        return [...colors, ...aura, ...mesh].filter(Boolean);
      } catch { return []; }
    } else {
      const parsed: PaletteColor[] = (() => {
        try {
          const p = JSON.parse(entry.item.shades);
          return Array.isArray(p) && p.length > 0 && "base" in p[0] ? p : [];
        } catch { return []; }
      })();
      return parsed.map((c) => c.base);
    }
  };

  // Color set fingerprint: quantize hues into 30° buckets, sort, join as string.
  // Items with the same set of color families get the same fingerprint
  // and cluster together — a palette and gradients using its colors will match.
  const getColorSignature = (entry: GalleryItem): string => {
    const hexes = getColors(entry);
    if (hexes.length === 0) return "z";
    const oklchs = hexes.map(hexToOklch);
    // Only consider chromatic colors (skip near-gray)
    const chromatic = oklchs.filter((c) => c.C > 0.03);
    if (chromatic.length === 0) return "neutral";
    // Quantize each hue to a 30° bucket (12 buckets around the wheel)
    const buckets = [...new Set(chromatic.map((c) => Math.round(c.h / 30) % 12))].sort((a, b) => a - b);
    return buckets.join("-");
  };

  // Primary sort key for the group (lowest bucket = determines group position on the wheel)
  const getGroupHue = (sig: string): number => {
    if (sig === "z" || sig === "neutral") return 999;
    const first = parseInt(sig.split("-")[0]);
    return first;
  };

  const allItems: GalleryItem[] = (() => {
    const items: GalleryItem[] = [
      ...gradientItems.map((g) => ({ kind: "gradient" as const, item: g })),
      ...paletteItems.map((p) => ({ kind: "palette" as const, item: p })),
    ];

    if (sortBy !== "color") {
      return items.sort((a, b) =>
        new Date(b.item.createdAt).getTime() - new Date(a.item.createdAt).getTime()
      );
    }

    // Group by color signature, then sort groups by hue position
    const groups = new Map<string, GalleryItem[]>();
    for (const item of items) {
      const sig = getColorSignature(item);
      if (!groups.has(sig)) groups.set(sig, []);
      groups.get(sig)!.push(item);
    }

    // Within each group: palettes first, then gradients, then by date
    for (const group of groups.values()) {
      group.sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === "palette" ? -1 : 1;
        return new Date(b.item.createdAt).getTime() - new Date(a.item.createdAt).getTime();
      });
    }

    // Sort groups by hue position on the color wheel
    const sortedGroups = [...groups.entries()].sort(
      (a, b) => getGroupHue(a[0]) - getGroupHue(b[0])
    );

    return sortedGroups.flatMap(([, items]) => items);
  })();

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />

      <main className="flex-1 px-4 sm:px-6 py-4 sm:py-6">
        <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Gallery</h2>
              <p className="text-xs text-text-dim">
                {totalCount} item{totalCount !== 1 ? "s" : ""}
              </p>
            </div>
            <Link
              to="/"
              className="px-4 py-2 rounded-xl bg-accent text-black text-sm font-medium hover:bg-accent-hover transition-all"
            >
              + Create New
            </Link>
          </div>

          {/* Filters + sort */}
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2 items-center">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setFilter("category", c.value)}
                  className={`px-3 py-2 rounded-lg text-sm sm:text-xs font-medium transition-all ${
                    category === c.value
                      ? "bg-accent text-black"
                      : "bg-surface-2 border border-border text-text-dim hover:text-text"
                  }`}
                >
                  {c.label}
                </button>
              ))}

              <span className="w-px h-5 bg-border hidden sm:block" />

              <button
                onClick={() => setSortBy("color")}
                className={`px-3 py-2 rounded-lg text-sm sm:text-xs font-medium transition-all ${
                  sortBy === "color"
                    ? "bg-surface-3 text-text"
                    : "text-text-dim hover:text-text"
                }`}
              >
                By Color
              </button>
              <button
                onClick={() => setSortBy("recent")}
                className={`px-3 py-2 rounded-lg text-sm sm:text-xs font-medium transition-all ${
                  sortBy === "recent"
                    ? "bg-surface-3 text-text"
                    : "text-text-dim hover:text-text"
                }`}
              >
                Recent
              </button>
            </div>

            {/* Gradient sub-type filters */}
            {category === "gradients" && (
              <div className="flex flex-wrap gap-2">
                {GRADIENT_SUBTYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setFilter("type", t.value)}
                    className={`px-3 py-1.5 rounded-md text-sm sm:text-xs transition-all ${
                      type === t.value
                        ? "bg-surface-3 text-text font-medium"
                        : "text-text-dim hover:text-text"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Grid */}
          {allItems.length === 0 ? (
            <div className="bg-surface-2 border border-border rounded-2xl p-12 text-center">
              <p className="text-text-dim mb-4">Nothing published yet.</p>
              <Link
                to="/"
                className="px-6 py-2.5 rounded-xl bg-accent text-black text-sm font-medium hover:bg-accent-hover transition-all"
              >
                Create Your First
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {allItems.map((entry) =>
                entry.kind === "gradient" ? (
                  <GradientCard key={`g-${entry.item.id}`} gradient={entry.item} admin={admin} />
                ) : (
                  <PaletteGalleryCard key={`p-${entry.item.id}`} palette={entry.item} admin={admin} />
                )
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
