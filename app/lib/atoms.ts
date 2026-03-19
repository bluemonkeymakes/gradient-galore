import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { defaultState, type GradientState } from "./gradient-engine";
import { type Palette } from "./palette";

export const gradientAtom = atom<GradientState>(defaultState());

export const palettesAtom = atomWithStorage<Palette[]>(
  "gradient-galore-palettes",
  []
);

/** Tracks which color input is currently "active" so palette swatches apply to it */
export type ColorTarget =
  | { type: "color"; id: string }
  | { type: "aura"; id: string }
  | { type: "mesh"; id: string }
  | { type: "auraBg" }
  | { type: "meshBg" }
  | null;

export const activeColorTargetAtom = atom<ColorTarget>(null);
