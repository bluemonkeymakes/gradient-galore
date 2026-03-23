import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { defaultState, type GradientState } from "./gradient-engine";
import { type Palette } from "./palette";

/** Current gradient being edited — persisted to localStorage (ephemeral editor state) */
export const gradientAtom = atomWithStorage<GradientState>(
  "gradient-galore-state",
  defaultState()
);

/** True once atomWithStorage has hydrated from localStorage */
export const hydratedAtom = atom(false);

/** Palettes loaded from the DB via route loaders — NOT persisted locally */
export const palettesAtom = atom<Palette[]>([]);

/** Tracks which color input is currently "active" so palette swatches apply to it */
export type ColorTarget =
  | { type: "color"; id: string }
  | { type: "aura"; id: string }
  | { type: "mesh"; id: string }
  | { type: "auraBg" }
  | { type: "meshBg" }
  | null;

export const activeColorTargetAtom = atom<ColorTarget>(null);

export const showHandlesAtom = atom(true);

/** The palette currently loaded for use in the gradient editor */
export const activePaletteAtom = atom<Palette | null>(null);

/** Gradient editor undo/redo history */
const MAX_HISTORY = 50;
export const gradientHistoryAtom = atom<GradientState[]>([]);
export const gradientFutureAtom = atom<GradientState[]>([]);

export const pushGradientHistoryAtom = atom(
  null,
  (get, set, snapshot: GradientState) => {
    const history = get(gradientHistoryAtom);
    set(gradientHistoryAtom, [snapshot, ...history].slice(0, MAX_HISTORY));
    set(gradientFutureAtom, []);
  }
);

export const undoGradientAtom = atom(
  null,
  (get, set) => {
    const history = get(gradientHistoryAtom);
    if (history.length === 0) return;
    const [prev, ...rest] = history;
    const current = get(gradientAtom);
    set(gradientFutureAtom, [current, ...get(gradientFutureAtom)]);
    set(gradientAtom, prev);
    set(gradientHistoryAtom, rest);
  }
);

export const redoGradientAtom = atom(
  null,
  (get, set) => {
    const future = get(gradientFutureAtom);
    if (future.length === 0) return;
    const [next, ...rest] = future;
    const current = get(gradientAtom);
    set(gradientHistoryAtom, [current, ...get(gradientHistoryAtom)]);
    set(gradientAtom, next);
    set(gradientFutureAtom, rest);
  }
);
