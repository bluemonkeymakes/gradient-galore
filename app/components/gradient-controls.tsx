import { useCallback, useRef, useState, useEffect } from "react";
import { useAtom, useAtomValue } from "jotai";

import { gradientAtom, activeColorTargetAtom, showHandlesAtom, hydratedAtom, palettesAtom, type ColorTarget } from "~/lib/atoms";
import { PaletteStrip } from "~/components/palette-strip";
import { Slider as ShadSlider } from "~/components/ui/slider";
import { Switch } from "~/components/ui/switch";
import {
  GRADIENT_TYPES,
  EASING_PRESETS,
  RADIAL_SIZES,
  BLEND_MODES,
  NOISE_BLENDS,
  createId,
  cubicBezierAt,
  type AuraPoint,
  type ColorStop,
  type EasingCurve,
  type GradientState,
  type GradientType,
  type MeshPoint,
} from "~/lib/gradient-engine";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3.5">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-text-dim">{title}</h3>
      {children}
    </div>
  );
}

function Slider({
  label, value, min, max, step = 1, suffix = "", hint, onChange,
}: {
  label: string; value: number; min: number; max: number;
  step?: number; suffix?: string; hint?: string; onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex justify-between text-sm">
        <span className="font-medium group relative cursor-default">
          {label}
          {hint && (
            <>
              <span className="ml-1 text-text-dim/40 text-xs">?</span>
              <span className="absolute left-0 bottom-full mb-1.5 hidden group-hover:block bg-surface-3 border border-border text-xs text-text-dim px-3 py-2 rounded-lg w-48 leading-relaxed shadow-lg z-10">
                {hint}
              </span>
            </>
          )}
        </span>
        <span className="text-text-dim tabular-nums text-xs bg-surface-3 px-2 py-0.5 rounded-md">{value}{suffix}</span>
      </div>
      <ShadSlider min={min} max={max} step={step} value={[value]}
        onValueChange={(v) => onChange(v[0])} />
    </div>
  );
}

function Toggle({ label, checked, onChange }: {
  label: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between text-sm cursor-pointer">
      <span>{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

function SegmentedControl<T extends string>({
  options, value, onChange,
}: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; }) {
  return (
    <div className="flex gap-1 bg-surface rounded-xl p-1">
      {options.map((opt) => (
        <button key={opt.value} onClick={() => onChange(opt.value)}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
            value === opt.value ? "bg-accent text-black" : "text-text-dim hover:text-text"
          }`}>
          {opt.label}
        </button>
      ))}
    </div>
  );
}

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function isValidHex(v: string) {
  return HEX_RE.test(v);
}

function HexInput({
  value, onSelect, onChange, className = "",
}: {
  value: string; onSelect?: () => void;
  onChange: (color: string) => void; className?: string;
}) {
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(value);
  }, [value, focused]);

  const display = focused ? draft : value;

  return (
    <input
      type="text"
      value={display}
      onFocus={() => { setFocused(true); setDraft(value); onSelect?.(); }}
      onBlur={() => {
        setFocused(false);
        if (isValidHex(draft)) onChange(draft);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && isValidHex(draft)) {
          onChange(draft);
          (e.target as HTMLInputElement).blur();
        }
      }}
      onChange={(e) => {
        const v = e.target.value;
        setDraft(v);
        if (isValidHex(v)) onChange(v);
      }}
      className={`bg-surface-3 border rounded-lg px-2 py-1 text-xs font-mono w-20 transition-colors ${
        isValidHex(display) ? "border-border" : "border-red-500/50"
      } ${className}`}
    />
  );
}

function SelectableColor({
  color, isSelected, onSelect, onChange, className = "w-8 h-8",
}: {
  color: string; isSelected: boolean;
  onSelect: () => void; onChange: (color: string) => void;
  className?: string;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const palettes = useAtomValue(palettesAtom);
  const ref = useRef<HTMLDivElement>(null);

  // Close picker on outside click
  useEffect(() => {
    if (!showPicker) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPicker]);

  const hasPalettes = palettes.some((p) => p.colors?.length > 0);

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => {
          onSelect();
          if (hasPalettes) setShowPicker(!showPicker);
        }}
        className={`${className} rounded-lg shrink-0 border-2 transition-all ${
          isSelected ? "border-accent ring-2 ring-accent/20" : "border-border"
        }`}
        style={{ backgroundColor: color }}
      />

      {showPicker && (
        <div className="absolute top-full left-0 mt-2 z-50 bg-surface-2 border border-border rounded-xl p-3 shadow-xl w-56 space-y-3">
          {/* Native color picker */}
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={color}
              onChange={(e) => onChange(e.target.value)}
              className="w-8 h-8 rounded-lg shrink-0"
            />
            <span className="text-xs font-mono text-text-dim">{color}</span>
          </div>

          {/* Palette colors */}
          {palettes.filter((p) => p.colors?.length > 0).map((palette) => (
            <div key={palette.id} className="space-y-1.5">
              <span className="text-xs text-text-dim font-medium">{palette.name}</span>
              <div className="flex gap-1 flex-wrap">
                {palette.colors.map((pc) => (
                  <button
                    key={pc.name}
                    type="button"
                    onClick={() => { onChange(pc.base); setShowPicker(false); }}
                    className={`w-5 h-5 rounded-md border transition-all hover:scale-125 ${
                      color === pc.base ? "border-accent" : "border-transparent"
                    }`}
                    style={{ backgroundColor: pc.base }}
                    title={pc.name}
                  />
                ))}
              </div>
              {/* Show shades of the color closest to current */}
              {(() => {
                const match = palette.colors.find((pc) => pc.base === color);
                if (!match) return null;
                return (
                  <div className="flex gap-0.5 pt-0.5">
                    {match.shades.map((s) => (
                      <button
                        key={s.shade}
                        type="button"
                        onClick={() => { onChange(s.color); setShowPicker(false); }}
                        className="w-3.5 h-3.5 rounded-sm border border-transparent hover:border-accent hover:scale-125 transition-all"
                        style={{ backgroundColor: s.color }}
                        title={`${s.shade}: ${s.color}`}
                      />
                    ))}
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      )}

      {/* Fallback: if no palettes, just use native picker directly */}
      {!hasPalettes && (
        <input
          type="color"
          value={color}
          onChange={(e) => onChange(e.target.value)}
          onClick={onSelect}
          className={`absolute inset-0 opacity-0 cursor-pointer ${className}`}
        />
      )}
    </div>
  );
}

function ColorStopEditor({
  stop, canDelete, isSelected, isFirst, isLast,
  onSelect, onChange, onDelete, onMoveUp, onMoveDown,
}: {
  stop: ColorStop; canDelete: boolean; isSelected: boolean;
  isFirst: boolean; isLast: boolean;
  onSelect: () => void; onChange: (stop: ColorStop) => void; onDelete: () => void;
  onMoveUp: () => void; onMoveDown: () => void;
}) {
  return (
    <div className={`flex items-center gap-2 group rounded-lg p-1 -m-1 transition-colors ${isSelected ? "bg-accent/10" : ""}`}>
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
      <SelectableColor color={stop.color} isSelected={isSelected} onSelect={onSelect}
        onChange={(c) => onChange({ ...stop, color: c })} />
      <HexInput value={stop.color} onSelect={onSelect}
        onChange={(c) => onChange({ ...stop, color: c })} />
      <span className="text-xs text-text-dim tabular-nums shrink-0 ml-auto">{stop.position}%</span>
      {canDelete && (
        <button onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 text-text-dim hover:text-red-400 transition-all text-lg leading-none shrink-0">
          &times;
        </button>
      )}
    </div>
  );
}

function PointEditor<T extends { id: string; color: string; x: number; y: number; hardness: number; opacity: number; stretch: number; rotate: number; visible?: boolean }>({
  point, canDelete, isSelected, isFirst, isLast, sizeLabel, sizeValue, sizeMin, sizeMax,
  onSelect, onSizeChange, onChange, onDelete, onMoveUp, onMoveDown,
}: {
  point: T; canDelete: boolean; isSelected: boolean; isFirst: boolean; isLast: boolean;
  sizeLabel: string; sizeValue: number; sizeMin: number; sizeMax: number;
  onSelect: () => void; onSizeChange: (v: number) => void;
  onChange: (point: T) => void; onDelete: () => void;
  onMoveUp: () => void; onMoveDown: () => void;
}) {
  const isVisible = point.visible !== false;
  return (
    <div className={`space-y-2 p-4 rounded-xl group relative transition-colors ${!isVisible ? "opacity-40" : ""} ${isSelected ? "bg-accent/10 ring-1 ring-accent/30" : "bg-surface-3"}`}>
      <div className="flex items-center gap-2">
        {/* Reorder buttons */}
        <div className="flex flex-col shrink-0 -my-1">
          <button onClick={onMoveUp} disabled={isFirst}
            className="text-text-dim hover:text-text disabled:opacity-20 disabled:hover:text-text-dim transition-all leading-none p-0.5"
            title="Move up (higher z-index)">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button onClick={onMoveDown} disabled={isLast}
            className="text-text-dim hover:text-text disabled:opacity-20 disabled:hover:text-text-dim transition-all leading-none p-0.5"
            title="Move down (lower z-index)">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
        {/* Visibility toggle */}
        <button
          onClick={() => onChange({ ...point, visible: !isVisible })}
          className="shrink-0 p-0.5 text-text-dim hover:text-text transition-all"
          title={isVisible ? "Hide layer" : "Show layer"}
        >
          {isVisible ? (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          )}
        </button>
        <SelectableColor color={point.color} isSelected={isSelected} onSelect={onSelect}
          onChange={(c) => onChange({ ...point, color: c })} className="w-7 h-7" />
        <HexInput value={point.color} onSelect={onSelect}
          onChange={(c) => onChange({ ...point, color: c })} />
        {canDelete && (
          <button onClick={onDelete}
            className="ml-auto opacity-0 group-hover:opacity-100 text-text-dim hover:text-red-400 transition-all text-lg leading-none">
            &times;
          </button>
        )}
      </div>
      <div className="grid grid-cols-5 gap-3 pt-1">
        <div className="col-span-3">
          <span className="text-xs text-text-dim mb-1.5 block">Position</span>
          <XYPad x={point.x} y={point.y}
            onChange={(px, py) => onChange({ ...point, x: px, y: py })} />
        </div>
        <div className="col-span-2">
          <span className="text-xs text-text-dim mb-1.5 block">Rotate</span>
          <AngleDial compact value={point.rotate} onChange={(v) => onChange({ ...point, rotate: v })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 pt-1">
        <MiniSlider label={sizeLabel} value={sizeValue} min={sizeMin} max={sizeMax} onChange={onSizeChange} />
        <MiniSlider label="Hardness" value={point.hardness} min={0} max={100} onChange={(v) => onChange({ ...point, hardness: v })} />
        <MiniSlider label="Opacity" value={point.opacity} min={0} max={100} onChange={(v) => onChange({ ...point, opacity: v })} />
        <MiniSlider label="Stretch" value={point.stretch} min={0} max={100} onChange={(v) => onChange({ ...point, stretch: v })} />
      </div>
    </div>
  );
}

function MiniSlider({ label, value, min, max, onChange }: {
  label: string; value: number; min: number; max: number; onChange: (v: number) => void;
}) {
  return (
    <div className="text-xs flex flex-col gap-1.5">
      <div className="flex justify-between">
        <span className="text-text-dim">{label}</span>
        <span className="text-text-dim tabular-nums">{value}</span>
      </div>
      <ShadSlider min={min} max={max} value={[value]}
        onValueChange={(v) => onChange(v[0])} />
    </div>
  );
}

function AngleDial({ value, onChange, compact = false }: {
  value: number; onChange: (v: number) => void; compact?: boolean;
}) {
  const dialRef = useRef<HTMLDivElement>(null);

  const angleFromPointer = useCallback((e: React.MouseEvent | MouseEvent) => {
    const rect = dialRef.current!.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
    return Math.round(((deg % 360) + 360) % 360);
  }, []);

  const onPointerDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onChange(angleFromPointer(e));
      const onMove = (ev: MouseEvent) => onChange(angleFromPointer(ev));
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [angleFromPointer, onChange],
  );

  const rad = (value * Math.PI) / 180;
  const r = 38;
  const handleX = 50 + Math.sin(rad) * r;
  const handleY = 50 - Math.cos(rad) * r;

  const dial = (
    <div
      ref={dialRef}
      onMouseDown={onPointerDown}
      className={`relative shrink-0 cursor-pointer ${compact ? "w-full aspect-square" : "w-24 h-24"}`}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full border-0">
        <circle cx="50" cy="50" r="46" fill="none" className="stroke-border" strokeWidth="1.5" />
        {[0, 90, 180, 270].map((tick) => {
          const tr = (tick * Math.PI) / 180;
          const x1 = 50 + Math.sin(tr) * 42;
          const y1 = 50 - Math.cos(tr) * 42;
          const x2 = 50 + Math.sin(tr) * 46;
          const y2 = 50 - Math.cos(tr) * 46;
          return (
            <line key={tick} x1={x1} y1={y1} x2={x2} y2={y2}
              className="stroke-text-dim" strokeWidth="1.5" strokeLinecap="round" />
          );
        })}
        <line x1="50" y1="50" x2={handleX} y2={handleY}
          className="stroke-accent" strokeWidth="2" strokeLinecap="round" />
        <circle cx="50" cy="50" r="3" className="fill-text-dim" />
        <circle cx={handleX} cy={handleY} r="5" className="fill-accent" />
      </svg>
    </div>
  );

  if (compact) {
    return (
      <div className="flex flex-col gap-1.5">
        {dial}
        <span className="text-xs text-text-dim tabular-nums text-center">{value}°</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      {dial}
      <div className="flex flex-col gap-1">
        <span className="text-2xl font-semibold tabular-nums">{value}°</span>
        <span className="text-xs text-text-dim">Angle</span>
      </div>
    </div>
  );
}

function XYPad({ x, y, onChange }: {
  x: number; y: number; onChange: (x: number, y: number) => void;
}) {
  const padRef = useRef<HTMLDivElement>(null);

  const posFromPointer = useCallback((e: React.MouseEvent | MouseEvent) => {
    const rect = padRef.current!.getBoundingClientRect();
    const px = Math.round(Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100)));
    const py = Math.round(Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100)));
    return { px, py };
  }, []);

  const onPointerDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const { px, py } = posFromPointer(e);
      onChange(px, py);
      const onMove = (ev: MouseEvent) => {
        const { px, py } = posFromPointer(ev);
        onChange(px, py);
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [posFromPointer, onChange],
  );

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={padRef}
        onMouseDown={onPointerDown}
        className="relative w-full aspect-square rounded-xl bg-surface-3 border border-border cursor-crosshair overflow-hidden"
      >
        {/* Grid lines */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border" />
          <div className="absolute top-1/2 left-0 right-0 h-px bg-border" />
        </div>
        {/* Crosshair at position */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 bottom-0 w-px bg-accent/30" style={{ left: `${x}%` }} />
          <div className="absolute left-0 right-0 h-px bg-accent/30" style={{ top: `${y}%` }} />
        </div>
        {/* Handle dot */}
        <div
          className="absolute w-4 h-4 rounded-full bg-accent border-2 border-white shadow-lg -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ left: `${x}%`, top: `${y}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-text-dim tabular-nums">
        <span>X: {x}%</span>
        <span>Y: {y}%</span>
      </div>
    </div>
  );
}

function swap<T>(arr: T[], i: number, j: number): T[] {
  if (i < 0 || j < 0 || i >= arr.length || j >= arr.length) return arr;
  const copy = [...arr];
  [copy[i], copy[j]] = [copy[j], copy[i]];
  return copy;
}

/** Swap two color stops in the array AND exchange their position values */
function swapPositions(stops: ColorStop[], i: number, j: number): ColorStop[] {
  if (i < 0 || j < 0 || i >= stops.length || j >= stops.length) return stops;
  const copy = [...stops];
  const posI = copy[i].position;
  const posJ = copy[j].position;
  copy[i] = { ...copy[i], position: posJ };
  copy[j] = { ...copy[j], position: posI };
  [copy[i], copy[j]] = [copy[j], copy[i]];
  return copy;
}

/** Shared controls for the background gradient layer (aura/mesh) */
function BgGradientControls({
  state, setState, set, activeTarget, setActiveTarget, updateColors, addColor,
}: {
  state: GradientState;
  setState: (s: GradientState) => void;
  set: <K extends keyof GradientState>(key: K, val: GradientState[K]) => void;
  activeTarget: import("~/lib/atoms").ColorTarget;
  setActiveTarget: (t: import("~/lib/atoms").ColorTarget) => void;
  updateColors: (colors: ColorStop[]) => void;
  addColor: () => void;
}) {
  const bgType = state.bgGradientType ?? "linear";
  return (
    <>
      <SegmentedControl
        options={[
          { value: "linear" as const, label: "Linear" },
          { value: "radial" as const, label: "Radial" },
          { value: "conic" as const, label: "Conic" },
        ]}
        value={bgType}
        onChange={(v) => set("bgGradientType", v)} />
      {(bgType === "linear" || bgType === "conic") && (
        <AngleDial value={state.angle} onChange={(v) => set("angle", v)} />
      )}
      {(bgType === "radial" || bgType === "conic") && (
        <XYPad x={state.positionX} y={state.positionY}
          onChange={(px, py) => setState({ ...state, positionX: px, positionY: py })} />
      )}
      <div className="space-y-3">
        {state.colors.map((stop, idx) => (
          <ColorStopEditor key={stop.id} stop={stop}
            canDelete={state.colors.length > 2}
            isSelected={isTargetMatch(activeTarget, { type: "color", id: stop.id })}
            isFirst={idx === 0} isLast={idx === state.colors.length - 1}
            onSelect={() => setActiveTarget({ type: "color", id: stop.id })}
            onChange={(updated) => updateColors(state.colors.map((c) => (c.id === updated.id ? updated : c)))}
            onDelete={() => updateColors(state.colors.filter((c) => c.id !== stop.id))}
            onMoveUp={() => updateColors(swapPositions(state.colors, idx, idx - 1))}
            onMoveDown={() => updateColors(swapPositions(state.colors, idx, idx + 1))} />
        ))}
      </div>
      <button onClick={addColor}
        className="w-full py-2 border border-dashed border-border rounded-xl text-sm text-text-dim hover:text-text hover:border-accent transition-all bg-transparent">
        + Add Color
      </button>
      <BezierEasingEditor
        curve={state.easingCurve ?? [0, 0, 1, 1]}
        colors={state.colors}
        onChange={(c) => set("easingCurve", c)}
        onColorPositionChange={(id, pos) =>
          updateColors(state.colors.map((c) => c.id === id ? { ...c, position: pos } : c))
        }
      />
    </>
  );
}

function lerpHexSimple(a: string, b: string, t: number): string {
  const pa = a.replace("#", "");
  const pb = b.replace("#", "");
  const cl = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const r = cl(parseInt(pa.slice(0, 2), 16) * (1 - t) + parseInt(pb.slice(0, 2), 16) * t);
  const g = cl(parseInt(pa.slice(2, 4), 16) * (1 - t) + parseInt(pb.slice(2, 4), 16) * t);
  const bl = cl(parseInt(pa.slice(4, 6), 16) * (1 - t) + parseInt(pb.slice(4, 6), 16) * t);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bl.toString(16).padStart(2, "0")}`;
}

function BezierEasingEditor({ curve, colors, onChange, onColorPositionChange }: {
  curve: EasingCurve; colors: ColorStop[];
  onChange: (c: EasingCurve) => void;
  onColorPositionChange: (id: string, position: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef<1 | 2 | { type: "stop"; id: string } | null>(null);
  const size = 140;
  const pad = 14;
  const total = size + pad * 2;

  const toSvg = (x: number, y: number) => ({
    sx: pad + x * size,
    sy: pad + (1 - y) * size,
  });
  const fromSvg = (clientX: number, clientY: number) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const scale = rect.width / total;
    const padPx = pad * scale;
    const sizePx = size * scale;
    const x = Math.max(0, Math.min(1, (clientX - rect.left - padPx) / sizePx));
    const y = Math.max(-0.2, Math.min(1.2, 1 - (clientY - rect.top - padPx) / sizePx));
    return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 };
  };
  const xFromSvg = (clientX: number) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const scale = rect.width / total;
    const padPx = pad * scale;
    const sizePx = size * scale;
    return Math.round(Math.max(0, Math.min(100, ((clientX - rect.left - padPx) / sizePx) * 100)));
  };

  const [x1, y1, x2, y2] = curve;
  const p0 = toSvg(0, 0);
  const p1 = toSvg(x1, y1);
  const p2 = toSvg(x2, y2);
  const p3 = toSvg(1, 1);

  const curvePath = `M${p0.sx},${p0.sy} C${p1.sx},${p1.sy} ${p2.sx},${p2.sy} ${p3.sx},${p3.sy}`;

  const onPointerDown = useCallback((point: 1 | 2, e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as SVGElement).setPointerCapture(e.pointerId);
    dragging.current = point;
  }, []);

  const onStopPointerDown = useCallback((id: string, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as SVGElement).setPointerCapture(e.pointerId);
    dragging.current = { type: "stop", id };
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    if (typeof dragging.current === "object" && "type" in dragging.current) {
      onColorPositionChange(dragging.current.id, xFromSvg(e.clientX));
      return;
    }
    const { x, y } = fromSvg(e.clientX, e.clientY);
    if (dragging.current === 1) {
      onChange([x, y, curve[2], curve[3]]);
    } else {
      onChange([curve[0], curve[1], x, y]);
    }
  }, [curve, onChange, onColorPositionChange]);

  const onPointerUp = useCallback(() => {
    dragging.current = null;
  }, []);

  const isPreset = (p: EasingCurve) =>
    p[0] === curve[0] && p[1] === curve[1] && p[2] === curve[2] && p[3] === curve[3];

  // Color stop markers on the axes
  const sorted = [...colors].sort((a, b) => a.position - b.position);

  // Build eased gradient preview strip
  const easedStops: string[] = [];
  const n = 32;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    let color = sorted[sorted.length - 1]?.color ?? "#000";
    for (let s = 0; s < sorted.length - 1; s++) {
      const a = sorted[s];
      const b = sorted[s + 1];
      const aP = a.position / 100;
      const bP = b.position / 100;
      if (t <= bP) {
        if (bP > aP) {
          const segT = (t - aP) / (bP - aP);
          const clamped = Math.max(0, Math.min(1, segT));
          const easedSegT = cubicBezierAt(clamped, curve);
          color = lerpHexSimple(a.color, b.color, Math.max(0, Math.min(1, easedSegT)));
        } else {
          color = b.color;
        }
        break;
      }
    }
    easedStops.push(color);
  }
  const previewGradient = `linear-gradient(to right, ${easedStops.map((c, i) => `${c} ${((i / n) * 100).toFixed(1)}%`).join(", ")})`;

  return (
    <div>
      <span className="text-xs text-text-dim mb-2 block">Easing Curve</span>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${total} ${total + 12}`}
        className="w-full bg-surface-3 rounded-t-xl cursor-crosshair"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {/* Grid */}
        <rect x={pad} y={pad} width={size} height={size} fill="none" className="stroke-border" strokeWidth="1" />
        <line x1={pad} y1={pad + size / 2} x2={pad + size} y2={pad + size / 2} className="stroke-border" strokeWidth="0.5" strokeDasharray="4 4" />
        <line x1={pad + size / 2} y1={pad} x2={pad + size / 2} y2={pad + size} className="stroke-border" strokeWidth="0.5" strokeDasharray="4 4" />

        {/* Linear reference */}
        <line x1={p0.sx} y1={p0.sy} x2={p3.sx} y2={p3.sy} className="stroke-text-dim" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.3" />

        {/* Color stop markers on bottom axis — draggable */}
        {sorted.map((stop) => {
          const xPos = pad + (stop.position / 100) * size;
          return (
            <g key={stop.id} className="cursor-grab active:cursor-grabbing">
              <line x1={xPos} y1={pad + size} x2={xPos} y2={pad + size + 6} stroke={stop.color} strokeWidth="2" />
              {/* Visible dot */}
              <circle cx={xPos} cy={pad + size + 3} r="4.5" fill={stop.color} stroke="#000" strokeWidth="0.8" />
              {/* Invisible larger hit area */}
              <circle cx={xPos} cy={pad + size + 3} r="10" fill="transparent"
                onPointerDown={(e) => onStopPointerDown(stop.id, e)} />
              {/* Position label */}
              <text x={xPos} y={pad + size + 13} textAnchor="middle"
                className="fill-text-dim" fontSize="6" fontFamily="monospace">
                {stop.position}
              </text>
            </g>
          );
        })}

        {/* Color stop markers on left axis (output, non-draggable) */}
        {sorted.map((stop) => {
          const yPos = pad + (1 - stop.position / 100) * size;
          return (
            <g key={`y-${stop.id}`}>
              <line x1={pad - 4} y1={yPos} x2={pad} y2={yPos} stroke={stop.color} strokeWidth="2" />
              <circle cx={pad - 1} cy={yPos} r="3" fill={stop.color} stroke="#000" strokeWidth="0.5" />
            </g>
          );
        })}

        {/* Control handles */}
        <line x1={p0.sx} y1={p0.sy} x2={p1.sx} y2={p1.sy} className="stroke-accent" strokeWidth="1" opacity="0.5" />
        <line x1={p3.sx} y1={p3.sy} x2={p2.sx} y2={p2.sy} className="stroke-accent" strokeWidth="1" opacity="0.5" />

        {/* Curve */}
        <path d={curvePath} fill="none" className="stroke-accent" strokeWidth="2.5" strokeLinecap="round" />

        {/* Endpoints */}
        <circle cx={p0.sx} cy={p0.sy} r="3.5" className="fill-text-dim" />
        <circle cx={p3.sx} cy={p3.sy} r="3.5" className="fill-text-dim" />

        {/* Draggable control points */}
        <circle
          cx={p1.sx} cy={p1.sy} r="7"
          className="fill-accent cursor-grab active:cursor-grabbing"
          stroke="#000" strokeWidth="1" strokeOpacity="0.3"
          onPointerDown={(e) => onPointerDown(1, e)}
        />
        <circle
          cx={p2.sx} cy={p2.sy} r="7"
          className="fill-accent cursor-grab active:cursor-grabbing"
          stroke="#000" strokeWidth="1" strokeOpacity="0.3"
          onPointerDown={(e) => onPointerDown(2, e)}
        />
      </svg>

      {/* Eased gradient preview strip */}
      <div
        className="h-4 rounded-b-xl"
        style={{ background: previewGradient }}
      />

      {/* Presets */}
      <div className="flex gap-1 mt-2">
        {EASING_PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => onChange(p.curve)}
            className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
              isPreset(p.curve)
                ? "bg-accent text-black"
                : "bg-surface text-text-dim hover:text-text"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Values */}
      <div className="mt-1.5">
        <span className="text-[9px] text-text-dim/50 font-mono">
          cubic-bezier({x1}, {y1}, {x2}, {y2})
        </span>
      </div>
    </div>
  );
}

function BgColorPicker({ label, value, isSelected, onSelect, onChange }: {
  label: string; value: string; isSelected: boolean;
  onSelect: () => void; onChange: (v: string) => void;
}) {
  return (
    <Section title={label}>
      <div className={`flex items-center gap-3 rounded-lg p-1 -m-1 transition-colors ${isSelected ? "bg-accent/10" : ""}`}>
        <SelectableColor color={value} isSelected={isSelected} onSelect={onSelect}
          onChange={onChange} className="w-9 h-9" />
        <HexInput value={value} onSelect={onSelect} onChange={onChange} />
      </div>
    </Section>
  );
}

function isTargetMatch(target: ColorTarget, check: ColorTarget): boolean {
  if (!target || !check) return false;
  if (target.type !== check.type) return false;
  if ("id" in target && "id" in check) return target.id === check.id;
  return true;
}

/** Find a position that's furthest from all existing points */
function findOpenSpot(existing: { x: number; y: number }[]): { x: number; y: number } {
  if (existing.length === 0) return { x: 50, y: 50 };

  // Test a grid of candidates and pick the one with the greatest minimum distance to any existing point
  let bestX = 50;
  let bestY = 50;
  let bestDist = 0;
  for (let cx = 10; cx <= 90; cx += 10) {
    for (let cy = 10; cy <= 90; cy += 10) {
      const minDist = Math.min(
        ...existing.map((p) => Math.hypot(p.x - cx, p.y - cy))
      );
      if (minDist > bestDist) {
        bestDist = minDist;
        bestX = cx;
        bestY = cy;
      }
    }
  }
  return { x: bestX, y: bestY };
}

export function GradientControls() {
  const [hydrated, setHydrated] = useAtom(hydratedAtom);
  const [state, setState] = useAtom(gradientAtom);
  const [activeTarget, setActiveTarget] = useAtom(activeColorTargetAtom);
  const [showHandles, setShowHandles] = useAtom(showHandlesAtom);

  // Wait for atomWithStorage to hydrate before rendering interactive controls
  useEffect(() => { setHydrated(true); }, [setHydrated]);
  if (!hydrated) return <div className="h-96 animate-pulse bg-surface-3 rounded-xl" />;
  const set = <K extends keyof GradientState>(key: K, val: GradientState[K]) =>
    setState({ ...state, [key]: val });
  const updateColors = (colors: ColorStop[]) => set("colors", colors);

  const exportAs = async (format: "png" | "svg") => {
    const el = document.getElementById("gradient-preview");
    if (!el) return;
    const { toPng, toSvg } = await import("html-to-image");
    const fn = format === "png" ? toPng : toSvg;
    const dataUrl = await fn(el, { pixelRatio: 2 });
    const link = document.createElement("a");
    link.download = `gradient.${format}`;
    link.href = dataUrl;
    link.click();
  };

  const addColor = () => {
    const newId = createId();
    // Find the largest gap between existing stops and place the new one in the middle
    const sorted = [...state.colors].sort((a, b) => a.position - b.position);
    let bestGap = 0;
    let bestPos = 50;
    for (let i = 0; i < sorted.length - 1; i++) {
      const gap = sorted[i + 1].position - sorted[i].position;
      if (gap > bestGap) {
        bestGap = gap;
        bestPos = Math.round(sorted[i].position + gap / 2);
      }
    }
    // Also check gap before first and after last
    if (sorted[0] && sorted[0].position > bestGap) {
      bestGap = sorted[0].position;
      bestPos = Math.round(sorted[0].position / 2);
    }
    if (sorted.length > 0 && (100 - sorted[sorted.length - 1].position) > bestGap) {
      bestPos = Math.round(sorted[sorted.length - 1].position + (100 - sorted[sorted.length - 1].position) / 2);
    }
    // Pick a contrasting color so it's immediately visible
    const randomColor = "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0");
    updateColors([
      ...state.colors,
      { id: newId, color: randomColor, position: bestPos },
    ]);
    setActiveTarget({ type: "color", id: newId });
  };

  const addAuraPoint = () => {
    const newId = createId();
    const { x, y } = findOpenSpot(state.auraPoints);
    set("auraPoints", [
      ...state.auraPoints,
      {
        id: newId,
        color: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0"),
        x, y,
        size: 60 + Math.round(Math.random() * 20), hardness: 0, opacity: 50 + Math.round(Math.random() * 30),
        stretch: 50, rotate: 0,
      },
    ]);
    setActiveTarget({ type: "aura", id: newId });
  };

  const addMeshPoint = () => {
    const newId = createId();
    const { x, y } = findOpenSpot(state.meshPoints);
    set("meshPoints", [
      ...state.meshPoints,
      {
        id: newId,
        color: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0"),
        x, y,
        spread: 35, hardness: 0, opacity: 100, stretch: 50, rotate: 0,
      },
    ]);
    setActiveTarget({ type: "mesh", id: newId });
  };

  const showPosition = state.type === "radial" || state.type === "conic";
  const showAngle = state.type === "linear" || state.type === "conic";
  const showRepeating = state.type === "linear" || state.type === "radial" || state.type === "conic";
  const showColors = state.type !== "mesh" && state.type !== "aura";

  return (
    <div className="space-y-7">
      {/* Type selector */}
      <Section title="Gradient Type">
        <div className="grid grid-cols-3 gap-2">
          {GRADIENT_TYPES.map((t) => (
            <button key={t.value} onClick={() => set("type", t.value as GradientType)}
              className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                state.type === t.value
                  ? "bg-accent text-black shadow-lg shadow-accent/25"
                  : "bg-surface-3 text-text-dim hover:text-text hover:bg-surface-3/80"
              }`}>
              <div>{t.label}</div>
              <div className="text-[10px] opacity-70 mt-0.5">{t.description}</div>
            </button>
          ))}
        </div>
      </Section>

      {/* Palette quick-pick */}
      <PaletteStrip />

      {/* Color stops — linear, radial, conic, marble */}
      {showColors && (
        <Section title="Colors">
          <div className="space-y-3">
            {state.colors.map((stop, idx) => (
              <ColorStopEditor key={stop.id} stop={stop}
                canDelete={state.colors.length > 2}
                isSelected={isTargetMatch(activeTarget, { type: "color", id: stop.id })}
                isFirst={idx === 0} isLast={idx === state.colors.length - 1}
                onSelect={() => setActiveTarget({ type: "color", id: stop.id })}
                onChange={(updated) => updateColors(state.colors.map((c) => (c.id === updated.id ? updated : c)))}
                onDelete={() => updateColors(state.colors.filter((c) => c.id !== stop.id))}
                onMoveUp={() => updateColors(swapPositions(state.colors, idx, idx - 1))}
                onMoveDown={() => updateColors(swapPositions(state.colors, idx, idx + 1))} />
            ))}
          </div>
          <button onClick={addColor}
            className="w-full py-2 border border-dashed border-border rounded-xl text-sm text-text-dim hover:text-text hover:border-accent transition-all bg-transparent">
            + Add Color
          </button>
          <BezierEasingEditor
            curve={state.easingCurve ?? [0, 0, 1, 1]}
            colors={state.colors}
            onChange={(c) => set("easingCurve", c)}
            onColorPositionChange={(id, pos) =>
              updateColors(state.colors.map((c) => c.id === id ? { ...c, position: pos } : c))
            }
          />
        </Section>
      )}

      {/* Canvas handles toggle */}
      {(state.type === "aura" || state.type === "mesh") && (
        <Section title="Canvas">
          <Toggle label="Show Drag Handles" checked={showHandles}
            onChange={setShowHandles} />
        </Section>
      )}

      {/* Aura layers */}
      {state.type === "aura" && (
        <Section title="Aura Layers">
          <div className="space-y-3">
            {state.auraPoints.map((point, idx) => (
              <PointEditor<AuraPoint> key={point.id} point={point}
                canDelete={state.auraPoints.length > 1}
                isSelected={isTargetMatch(activeTarget, { type: "aura", id: point.id })}
                isFirst={idx === 0} isLast={idx === state.auraPoints.length - 1}
                onSelect={() => setActiveTarget({ type: "aura", id: point.id })}
                sizeLabel="Size" sizeValue={point.size} sizeMin={1} sizeMax={200}
                onSizeChange={(v) => set("auraPoints", state.auraPoints.map((p) => p.id === point.id ? { ...p, size: v } : p))}
                onChange={(updated) => set("auraPoints", state.auraPoints.map((p) => p.id === updated.id ? updated : p))}
                onDelete={() => set("auraPoints", state.auraPoints.filter((p) => p.id !== point.id))}
                onMoveUp={() => set("auraPoints", swap(state.auraPoints, idx, idx - 1))}
                onMoveDown={() => set("auraPoints", swap(state.auraPoints, idx, idx + 1))} />
            ))}
          </div>
          <button onClick={addAuraPoint}
            className="w-full py-2 border border-dashed border-border rounded-xl text-sm text-text-dim hover:text-text hover:border-accent transition-all bg-transparent">
            + Add Layer
          </button>
        </Section>
      )}

      {/* Mesh points */}
      {state.type === "mesh" && (
        <Section title="Mesh Points">
          <div className="space-y-3">
            {state.meshPoints.map((point, idx) => (
              <PointEditor<MeshPoint> key={point.id} point={point}
                canDelete={state.meshPoints.length > 1}
                isSelected={isTargetMatch(activeTarget, { type: "mesh", id: point.id })}
                isFirst={idx === 0} isLast={idx === state.meshPoints.length - 1}
                onSelect={() => setActiveTarget({ type: "mesh", id: point.id })}
                sizeLabel="Size" sizeValue={point.spread} sizeMin={1} sizeMax={200}
                onSizeChange={(v) => set("meshPoints", state.meshPoints.map((p) => p.id === point.id ? { ...p, spread: v } : p))}
                onChange={(updated) => set("meshPoints", state.meshPoints.map((p) => p.id === updated.id ? updated : p))}
                onDelete={() => set("meshPoints", state.meshPoints.filter((p) => p.id !== point.id))}
                onMoveUp={() => set("meshPoints", swap(state.meshPoints, idx, idx - 1))}
                onMoveDown={() => set("meshPoints", swap(state.meshPoints, idx, idx + 1))} />
            ))}
          </div>
          <button onClick={addMeshPoint}
            className="w-full py-2 border border-dashed border-border rounded-xl text-sm text-text-dim hover:text-text hover:border-accent transition-all bg-transparent">
            + Add Point
          </button>
        </Section>
      )}

      {/* Per-type settings */}
      {showAngle && (
        <Section title="Direction">
          <AngleDial value={state.angle} onChange={(v) => set("angle", v)} />
        </Section>
      )}

      {showPosition && (
        <Section title="Position">
          <XYPad x={state.positionX} y={state.positionY}
            onChange={(px, py) => setState({ ...state, positionX: px, positionY: py })} />
        </Section>
      )}

      {showRepeating && (
        <Section title="Repeat">
          <Toggle label="Repeating Pattern" checked={state.repeating} onChange={(v) => set("repeating", v)} />
        </Section>
      )}

      {state.type === "radial" && (
        <Section title="Radial Shape">
          <SegmentedControl
            options={[{ value: "circle" as const, label: "Circle" }, { value: "ellipse" as const, label: "Ellipse" }]}
            value={state.radialShape} onChange={(v) => set("radialShape", v)} />
          <div className="mt-2">
            <span className="text-xs text-text-dim mb-1.5 block">Size</span>
            <SegmentedControl options={RADIAL_SIZES} value={state.radialSize} onChange={(v) => set("radialSize", v)} />
          </div>
        </Section>
      )}

      {state.type === "aura" && (
        <Section title="Background">
          <div className={`flex items-center gap-3 rounded-lg p-2 transition-colors ${isTargetMatch(activeTarget, { type: "auraBg" }) ? "bg-accent/10" : ""}`}>
            <SelectableColor color={state.auraBgColor}
              isSelected={isTargetMatch(activeTarget, { type: "auraBg" })}
              onSelect={() => setActiveTarget({ type: "auraBg" })}
              onChange={(v) => set("auraBgColor", v)} className="w-9 h-9" />
            <HexInput value={state.auraBgColor}
              onSelect={() => setActiveTarget({ type: "auraBg" })}
              onChange={(v) => set("auraBgColor", v)} />
          </div>
          <Toggle label="Gradient Layer" checked={state.bgGradient ?? false}
            onChange={(v) => set("bgGradient", v)} />
          {state.bgGradient && (
            <BgGradientControls
              state={state} setState={setState} set={set}
              activeTarget={activeTarget} setActiveTarget={setActiveTarget}
              updateColors={updateColors} addColor={addColor} />
          )}
        </Section>
      )}

      {state.type === "marble" && (
        <Section title="Marble Settings">
          <Slider label="Shape Size" hint="Scale of the colored shapes — small creates tight patterns, large fills the canvas" value={state.marbleScale} min={1} max={20} onChange={(v) => set("marbleScale", v)} />
          <Slider label="Blur" hint="Softness of shape edges — low keeps defined forms, high melts them together" value={state.marbleTurbulence} min={1} max={10} onChange={(v) => set("marbleTurbulence", v)} />
          <Slider label="Variation" hint="Changes the position and rotation seed — each value produces a unique arrangement" value={state.marbleSeed} min={0} max={100} onChange={(v) => set("marbleSeed", v)} />
          <div>
            <span className="text-xs text-text-dim mb-1.5 block">Rotation</span>
            <AngleDial value={state.marbleRotate} onChange={(v) => set("marbleRotate", v)} />
          </div>
          <div>
            <span className="text-xs text-text-dim mb-1.5 block">Blend Mode</span>
            <div className="grid grid-cols-3 gap-1">
              {BLEND_MODES.map((opt) => (
                <button key={opt.value} onClick={() => set("marbleBlendMode", opt.value)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                    state.marbleBlendMode === opt.value
                      ? "bg-accent text-black"
                      : "bg-surface text-text-dim hover:text-text"
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </Section>
      )}

      {state.type === "mesh" && (
        <Section title="Background">
          <div className={`flex items-center gap-3 rounded-lg p-2 transition-colors ${isTargetMatch(activeTarget, { type: "meshBg" }) ? "bg-accent/10" : ""}`}>
            <SelectableColor color={state.meshBgColor}
              isSelected={isTargetMatch(activeTarget, { type: "meshBg" })}
              onSelect={() => setActiveTarget({ type: "meshBg" })}
              onChange={(v) => set("meshBgColor", v)} className="w-9 h-9" />
            <HexInput value={state.meshBgColor}
              onSelect={() => setActiveTarget({ type: "meshBg" })}
              onChange={(v) => set("meshBgColor", v)} />
          </div>
          <Toggle label="Gradient Layer" checked={state.bgGradient ?? false}
            onChange={(v) => set("bgGradient", v)} />
          {state.bgGradient && (
            <BgGradientControls
              state={state} setState={setState} set={set}
              activeTarget={activeTarget} setActiveTarget={setActiveTarget}
              updateColors={updateColors} addColor={addColor} />
          )}
        </Section>
      )}

      {/* Noise overlay — available on all types */}
      <Section title="Grain / Noise">
        <Toggle label="Enable Noise" checked={state.noiseEnabled ?? false}
          onChange={(v) => set("noiseEnabled", v)} />
        {state.noiseEnabled && (
          <>
            <Slider label="Intensity" hint="Opacity of the noise texture layer"
              value={state.noiseIntensity ?? 30} min={0} max={100} suffix="%"
              onChange={(v) => set("noiseIntensity", v)} />
            <Slider label="Scale" hint="Grain size — low is fine, high is coarse"
              value={state.noiseScale ?? 4} min={1} max={10}
              onChange={(v) => set("noiseScale", v)} />
            <div>
              <span className="text-xs text-text-dim mb-1.5 block">Blend</span>
              <SegmentedControl options={NOISE_BLENDS} value={state.noiseBlend ?? "overlay"}
                onChange={(v) => set("noiseBlend", v)} />
            </div>
          </>
        )}
      </Section>

      {/* Export */}
      <Section title="Export">
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => exportAs("png")}
            className="py-2 rounded-xl bg-surface-3 text-sm text-text-dim hover:text-text transition-all">
            PNG
          </button>
          <button onClick={() => exportAs("svg")}
            className="py-2 rounded-xl bg-surface-3 text-sm text-text-dim hover:text-text transition-all">
            SVG
          </button>
        </div>
      </Section>
    </div>
  );
}
