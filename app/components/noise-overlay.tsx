import { useAtomValue } from "jotai";
import { gradientAtom } from "~/lib/atoms";
import type { NoiseBlend } from "~/lib/gradient-engine";

export function NoiseOverlay() {
  const state = useAtomValue(gradientAtom);

  if (!state.noiseEnabled) return null;

  const freq = (state.noiseScale / 10) * 0.8 + 0.1; // 0.1 – 0.9
  const opacity = state.noiseIntensity / 100;
  const blend = state.noiseBlend as NoiseBlend;

  return (
    <div
      className="absolute inset-0 pointer-events-none z-10"
      style={{ mixBlendMode: blend, opacity }}
    >
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <filter id="noise-filter">
          <feTurbulence
            type="fractalNoise"
            baseFrequency={freq}
            numOctaves={4}
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#noise-filter)" />
      </svg>
    </div>
  );
}
