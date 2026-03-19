import { useAtom, useSetAtom, useAtomValue } from "jotai";
import { gradientAtom, activeColorTargetAtom, type ColorTarget } from "~/lib/atoms";
import { PaletteStrip } from "~/components/palette-strip";
import {
  GRADIENT_TYPES,
  RADIAL_SIZES,
  BLEND_MODES,
  createId,
  type AuraPoint,
  type ColorStop,
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

function rangeFill(value: number, min: number, max: number) {
  return { "--range-fill": ((value - min) / (max - min)) * 100 } as React.CSSProperties;
}

function Slider({
  label, value, min, max, step = 1, suffix = "", onChange,
}: {
  label: string; value: number; min: number; max: number;
  step?: number; suffix?: string; onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-2">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-text-dim tabular-nums text-xs bg-surface-3 px-2 py-0.5 rounded-md">{value}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        style={rangeFill(value, min, max)}
        onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

function Toggle({ label, checked, onChange }: {
  label: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between text-sm cursor-pointer">
      <span>{label}</span>
      <button type="button" role="switch" aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5.5 rounded-full transition-colors ${checked ? "bg-accent" : "bg-surface-3"}`}>
        <span className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white transition-transform ${checked ? "translate-x-4.5" : ""}`} />
      </button>
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
            value === opt.value ? "bg-accent text-white" : "text-text-dim hover:text-text"
          }`}>
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function SelectableColor({
  color, isSelected, onSelect, onChange, className = "w-8 h-8",
}: {
  color: string; isSelected: boolean;
  onSelect: () => void; onChange: (color: string) => void;
  className?: string;
}) {
  return (
    <div className="relative shrink-0" onClick={onSelect}>
      <input
        type="color"
        value={color}
        onChange={(e) => onChange(e.target.value)}
        className={`${className} rounded-lg shrink-0 ${isSelected ? "ring-2 ring-accent ring-offset-2 ring-offset-surface-2" : ""}`}
      />
    </div>
  );
}

function ColorStopEditor({
  stop, canDelete, isSelected, onSelect, onChange, onDelete,
}: {
  stop: ColorStop; canDelete: boolean; isSelected: boolean;
  onSelect: () => void; onChange: (stop: ColorStop) => void; onDelete: () => void;
}) {
  return (
    <div className={`flex items-center gap-2 group rounded-lg p-1 -m-1 transition-colors ${isSelected ? "bg-accent/10" : ""}`}>
      <SelectableColor color={stop.color} isSelected={isSelected} onSelect={onSelect}
        onChange={(c) => onChange({ ...stop, color: c })} />
      <input type="text" value={stop.color}
        onFocus={onSelect}
        onChange={(e) => onChange({ ...stop, color: e.target.value })}
        className="bg-surface-3 border border-border rounded-lg px-2 py-1.5 text-xs font-mono w-20" />
      <input type="range" min={0} max={100} value={stop.position}
        style={rangeFill(stop.position, 0, 100)}
        onChange={(e) => onChange({ ...stop, position: Number(e.target.value) })}
        className="flex-1 min-w-0" />
      <span className="text-xs text-text-dim w-7 text-right tabular-nums shrink-0">{stop.position}%</span>
      {canDelete && (
        <button onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 text-text-dim hover:text-red-400 transition-all text-lg leading-none shrink-0">
          &times;
        </button>
      )}
    </div>
  );
}

function PointEditor<T extends { id: string; color: string; x: number; y: number; opacity: number }>({
  point, canDelete, isSelected, isFirst, isLast, sizeLabel, sizeValue, sizeMin, sizeMax,
  onSelect, onSizeChange, onChange, onDelete, onMoveUp, onMoveDown,
}: {
  point: T; canDelete: boolean; isSelected: boolean; isFirst: boolean; isLast: boolean;
  sizeLabel: string; sizeValue: number; sizeMin: number; sizeMax: number;
  onSelect: () => void; onSizeChange: (v: number) => void;
  onChange: (point: T) => void; onDelete: () => void;
  onMoveUp: () => void; onMoveDown: () => void;
}) {
  return (
    <div className={`space-y-2 p-4 rounded-xl group relative transition-colors ${isSelected ? "bg-accent/10 ring-1 ring-accent/30" : "bg-surface-3"}`}>
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
        <SelectableColor color={point.color} isSelected={isSelected} onSelect={onSelect}
          onChange={(c) => onChange({ ...point, color: c })} className="w-7 h-7" />
        <input type="text" value={point.color}
          onFocus={onSelect}
          onChange={(e) => onChange({ ...point, color: e.target.value })}
          className="bg-surface border border-border rounded-lg px-2 py-1 text-xs font-mono w-20" />
        {canDelete && (
          <button onClick={onDelete}
            className="ml-auto opacity-0 group-hover:opacity-100 text-text-dim hover:text-red-400 transition-all text-lg leading-none">
            &times;
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 pt-1">
        <MiniSlider label="X" value={point.x} min={0} max={100} onChange={(v) => onChange({ ...point, x: v })} />
        <MiniSlider label="Y" value={point.y} min={0} max={100} onChange={(v) => onChange({ ...point, y: v })} />
        <MiniSlider label={sizeLabel} value={sizeValue} min={sizeMin} max={sizeMax} onChange={onSizeChange} />
        <MiniSlider label="Opac" value={point.opacity} min={0} max={100} onChange={(v) => onChange({ ...point, opacity: v })} />
      </div>
    </div>
  );
}

function MiniSlider({ label, value, min, max, onChange }: {
  label: string; value: number; min: number; max: number; onChange: (v: number) => void;
}) {
  return (
    <label className="text-xs flex flex-col gap-1">
      <div className="flex justify-between">
        <span className="text-text-dim">{label}</span>
        <span className="text-text-dim tabular-nums">{value}</span>
      </div>
      <input type="range" min={min} max={max} value={value}
        style={rangeFill(value, min, max)}
        onChange={(e) => onChange(Number(e.target.value))} className="w-full" />
    </label>
  );
}

function swap<T>(arr: T[], i: number, j: number): T[] {
  if (i < 0 || j < 0 || i >= arr.length || j >= arr.length) return arr;
  const copy = [...arr];
  [copy[i], copy[j]] = [copy[j], copy[i]];
  return copy;
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
        <input type="text" value={value}
          onFocus={onSelect}
          onChange={(e) => onChange(e.target.value)}
          className="bg-surface-3 border border-border rounded-lg px-3 py-1.5 text-sm font-mono w-24" />
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

export function GradientControls() {
  const [state, setState] = useAtom(gradientAtom);
  const [activeTarget, setActiveTarget] = useAtom(activeColorTargetAtom);
  const set = <K extends keyof GradientState>(key: K, val: GradientState[K]) =>
    setState({ ...state, [key]: val });
  const updateColors = (colors: ColorStop[]) => set("colors", colors);

  const addColor = () => {
    const lastColor = state.colors[state.colors.length - 1];
    const newId = createId();
    updateColors([
      ...state.colors,
      { id: newId, color: "#ffffff", position: Math.min(100, (lastColor?.position ?? 50) + 10) },
    ]);
    setActiveTarget({ type: "color", id: newId });
  };

  const addAuraPoint = () => {
    const newId = createId();
    set("auraPoints", [
      ...state.auraPoints,
      {
        id: newId,
        color: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0"),
        x: Math.round(Math.random() * 60 + 20), y: Math.round(Math.random() * 60 + 20),
        size: 60 + Math.round(Math.random() * 20), opacity: 50 + Math.round(Math.random() * 30),
      },
    ]);
    setActiveTarget({ type: "aura", id: newId });
  };

  const addMeshPoint = () => {
    const newId = createId();
    set("meshPoints", [
      ...state.meshPoints,
      {
        id: newId,
        color: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0"),
        x: Math.round(Math.random() * 80 + 10), y: Math.round(Math.random() * 80 + 10),
        spread: 35, opacity: 100,
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
                  ? "bg-accent text-white shadow-lg shadow-accent/25"
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
            {state.colors.map((stop) => (
              <ColorStopEditor key={stop.id} stop={stop}
                canDelete={state.colors.length > 2}
                isSelected={isTargetMatch(activeTarget, { type: "color", id: stop.id })}
                onSelect={() => setActiveTarget({ type: "color", id: stop.id })}
                onChange={(updated) => updateColors(state.colors.map((c) => (c.id === updated.id ? updated : c)))}
                onDelete={() => updateColors(state.colors.filter((c) => c.id !== stop.id))} />
            ))}
          </div>
          <button onClick={addColor}
            className="w-full py-2 border border-dashed border-border rounded-xl text-sm text-text-dim hover:text-text hover:border-accent transition-all">
            + Add Color
          </button>
        </Section>
      )}

      {/* Aura layers */}
      {state.type === "aura" && (
        <Section title="Aura Layers">
          <div className="space-y-3">
            {state.auraPoints.map((point, idx) => (
              <PointEditor<AuraPoint> key={point.id} point={point}
                canDelete={state.auraPoints.length > 2}
                isSelected={isTargetMatch(activeTarget, { type: "aura", id: point.id })}
                isFirst={idx === 0} isLast={idx === state.auraPoints.length - 1}
                onSelect={() => setActiveTarget({ type: "aura", id: point.id })}
                sizeLabel="Size" sizeValue={point.size} sizeMin={10} sizeMax={100}
                onSizeChange={(v) => set("auraPoints", state.auraPoints.map((p) => p.id === point.id ? { ...p, size: v } : p))}
                onChange={(updated) => set("auraPoints", state.auraPoints.map((p) => p.id === updated.id ? updated : p))}
                onDelete={() => set("auraPoints", state.auraPoints.filter((p) => p.id !== point.id))}
                onMoveUp={() => set("auraPoints", swap(state.auraPoints, idx, idx - 1))}
                onMoveDown={() => set("auraPoints", swap(state.auraPoints, idx, idx + 1))} />
            ))}
          </div>
          <button onClick={addAuraPoint}
            className="w-full py-2 border border-dashed border-border rounded-xl text-sm text-text-dim hover:text-text hover:border-accent transition-all">
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
                canDelete={state.meshPoints.length > 2}
                isSelected={isTargetMatch(activeTarget, { type: "mesh", id: point.id })}
                isFirst={idx === 0} isLast={idx === state.meshPoints.length - 1}
                onSelect={() => setActiveTarget({ type: "mesh", id: point.id })}
                sizeLabel="Size" sizeValue={point.spread} sizeMin={10} sizeMax={100}
                onSizeChange={(v) => set("meshPoints", state.meshPoints.map((p) => p.id === point.id ? { ...p, spread: v } : p))}
                onChange={(updated) => set("meshPoints", state.meshPoints.map((p) => p.id === updated.id ? updated : p))}
                onDelete={() => set("meshPoints", state.meshPoints.filter((p) => p.id !== point.id))}
                onMoveUp={() => set("meshPoints", swap(state.meshPoints, idx, idx - 1))}
                onMoveDown={() => set("meshPoints", swap(state.meshPoints, idx, idx + 1))} />
            ))}
          </div>
          <button onClick={addMeshPoint}
            className="w-full py-2 border border-dashed border-border rounded-xl text-sm text-text-dim hover:text-text hover:border-accent transition-all">
            + Add Point
          </button>
        </Section>
      )}

      {/* Per-type settings */}
      {showAngle && (
        <Section title="Direction">
          <Slider label="Angle" value={state.angle} min={0} max={360} suffix="°" onChange={(v) => set("angle", v)} />
        </Section>
      )}

      {showPosition && (
        <Section title="Position">
          <Slider label="Center X" value={state.positionX} min={0} max={100} suffix="%" onChange={(v) => set("positionX", v)} />
          <Slider label="Center Y" value={state.positionY} min={0} max={100} suffix="%" onChange={(v) => set("positionY", v)} />
        </Section>
      )}

      {showRepeating && (
        <Section title="Options">
          <Toggle label="Repeating" checked={state.repeating} onChange={(v) => set("repeating", v)} />
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
        <BgColorPicker label="Background" value={state.auraBgColor}
          isSelected={isTargetMatch(activeTarget, { type: "auraBg" })}
          onSelect={() => setActiveTarget({ type: "auraBg" })}
          onChange={(v) => set("auraBgColor", v)} />
      )}

      {state.type === "marble" && (
        <Section title="Marble Settings">
          <Slider label="Shape Size" value={state.marbleScale} min={1} max={20} onChange={(v) => set("marbleScale", v)} />
          <Slider label="Blur" value={state.marbleTurbulence} min={1} max={10} onChange={(v) => set("marbleTurbulence", v)} />
          <Slider label="Rotation" value={state.marbleRotate} min={0} max={360} suffix="°" onChange={(v) => set("marbleRotate", v)} />
          <Slider label="Variation" value={state.marbleSeed} min={0} max={100} onChange={(v) => set("marbleSeed", v)} />
          <div>
            <span className="text-xs text-text-dim mb-1.5 block">Blend Mode</span>
            <div className="grid grid-cols-3 gap-1">
              {BLEND_MODES.map((opt) => (
                <button key={opt.value} onClick={() => set("marbleBlendMode", opt.value)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                    state.marbleBlendMode === opt.value
                      ? "bg-accent text-white"
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
        <BgColorPicker label="Background" value={state.meshBgColor}
          isSelected={isTargetMatch(activeTarget, { type: "meshBg" })}
          onSelect={() => setActiveTarget({ type: "meshBg" })}
          onChange={(v) => set("meshBgColor", v)} />
      )}
    </div>
  );
}
