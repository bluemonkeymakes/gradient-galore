import { useState } from "react";
import { useAtomValue, useAtom, useSetAtom } from "jotai";
import { activePaletteAtom, activeColorTargetAtom, gradientAtom, pushGradientHistoryAtom } from "~/lib/atoms";
import { applyPaletteToGradient } from "~/lib/gradient-engine";
import { Link } from "react-router";

export function PaletteStrip() {
  const palette = useAtomValue(activePaletteAtom);
  const [target] = useAtom(activeColorTargetAtom);
  const setGradient = useSetAtom(gradientAtom);
  const pushHistory = useSetAtom(pushGradientHistoryAtom);
  const [expandedColor, setExpandedColor] = useState<string | null>(null);

  // No palette loaded — show a link to browse
  if (!palette || !Array.isArray(palette.colors) || palette.colors.length === 0) {
    return (
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-dim">
          Palette
        </h3>
        <Link
          to="/gallery?category=palettes"
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-surface text-xs text-text-dim hover:text-text border border-border hover:border-accent transition-all"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z" />
          </svg>
          Browse palettes to use here
        </Link>
      </div>
    );
  }

  const applyColor = (color: string) => {
    if (!target) return;
    setGradient((prev) => {
      switch (target.type) {
        case "color":
          return { ...prev, colors: prev.colors.map((c) => c.id === target.id ? { ...c, color } : c) };
        case "aura":
          return { ...prev, auraPoints: prev.auraPoints.map((p) => p.id === target.id ? { ...p, color } : p) };
        case "mesh":
          return { ...prev, meshPoints: prev.meshPoints.map((p) => p.id === target.id ? { ...p, color } : p) };
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
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2.5 bg-surface-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-dim">
          {palette.name}
        </h3>
        <Link to="/gallery?category=palettes" className="text-[10px] text-text-dim hover:text-accent transition-all">
          Change
        </Link>
      </div>

      <div className="px-3 py-3 space-y-2">
      {!target && (
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-surface text-[10px] text-text-dim/60">
          <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
          </svg>
          Click a color stop above, then pick from these swatches
        </div>
      )}

      {/* Apply all palette colors as gradient */}
      <button
        onClick={() => {
          const baseColors = palette.colors.map((pc) => pc.base);
          setGradient((prev) => {
            pushHistory(prev);
            return applyPaletteToGradient(prev, baseColors);
          });
        }}
        className="w-full py-1.5 rounded-lg text-xs font-medium bg-surface text-text-dim hover:text-text hover:bg-surface-4 transition-all border border-border"
      >
        Apply All Colors
      </button>

      {/* Base colors — click to expand shades */}
      <div className="flex gap-1.5 flex-wrap">
        {palette.colors.map((pc) => {
          const key = pc.name;
          const isExpanded = expandedColor === key;
          return (
            <button
              key={key}
              onClick={() => setExpandedColor(isExpanded ? null : key)}
              className={`w-7 h-7 rounded-lg shrink-0 border-2 transition-all ${
                isExpanded
                  ? "border-accent scale-110"
                  : "border-transparent hover:border-accent hover:scale-110"
              }`}
              style={{ backgroundColor: pc.base }}
              title={`${pc.name} — click to see shades`}
            />
          );
        })}
      </div>

      {/* Shade row */}
      {expandedColor && (() => {
        const pc = palette.colors.find((c) => c.name === expandedColor);
        if (!pc) return null;
        return (
          <div className="space-y-1">
            <span className="text-[9px] text-text-dim">
              {pc.name} — {target ? "click a shade to apply" : "select a color target first"}
            </span>
            <div className="flex gap-0.5 items-end">
              {pc.shades.map((s) => {
                const isBase = s.color === pc.base;
                return (
                  <button
                    key={s.shade}
                    onClick={() => applyColor(s.color)}
                    disabled={!target}
                    className={`shrink-0 border transition-all disabled:opacity-40 disabled:hover:scale-100 disabled:hover:border-transparent ${
                      isBase
                        ? "w-5 h-5 rounded-md border-accent hover:scale-110"
                        : "w-4 h-4 rounded-sm border-transparent hover:border-accent hover:scale-125"
                    }`}
                    style={{ backgroundColor: s.color }}
                    title={`${s.shade}: ${s.color}${isBase ? " (base)" : ""}`}
                  />
                );
              })}
            </div>
          </div>
        );
      })()}
      </div>
    </div>
  );
}
