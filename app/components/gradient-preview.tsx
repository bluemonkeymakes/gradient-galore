import { useAtomValue } from "jotai";
import { gradientAtom } from "~/lib/atoms";
import { generateCSS } from "~/lib/gradient-engine";
import { MarbleCanvas } from "~/components/marble-canvas";

export function GradientPreview() {
  const state = useAtomValue(gradientAtom);
  const css = generateCSS(state);

  const baseStyle: React.CSSProperties =
    state.type === "aura"
      ? { backgroundColor: state.auraBgColor, backgroundImage: css }
      : state.type === "mesh"
        ? { backgroundColor: state.meshBgColor, backgroundImage: css }
        : state.type === "marble"
          ? {}
          : { background: css };

  return (
    <div className="relative w-full aspect-4/3 max-h-lg rounded-2xl overflow-hidden checkerboard">
      {state.type === "marble" ? (
        <MarbleCanvas />
      ) : (
        <div
          className="absolute inset-0 rounded-2xl transition-all duration-300"
          style={baseStyle}
        />
      )}
    </div>
  );
}
