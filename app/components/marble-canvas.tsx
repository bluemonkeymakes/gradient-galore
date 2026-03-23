import { useId } from "react";
import { useAtomValue } from "jotai";
import { gradientAtom } from "~/lib/atoms";
import type { GradientState } from "~/lib/gradient-engine";

/** Pure marble renderer — no jotai dependency */
export function MarbleSvg({ state, className = "" }: { state: GradientState; className?: string }) {
  return <MarbleInner state={state} className={className} />;
}

/** Live marble canvas that reads from the jotai atom */
export function MarbleCanvas() {
  const state = useAtomValue(gradientAtom);
  return <MarbleInner state={state} className="rounded-2xl" />;
}

function MarbleInner({ state, className = "" }: { state: GradientState; className?: string }) {
  const uid = useId();
  const colors = state.colors;
  const bgColor = colors[0]?.color ?? "#8b5cf6";
  const color1 = colors[1]?.color ?? "#ec4899";
  const color2 = colors[2]?.color ?? colors[0]?.color ?? "#f97316";

  // Blur: 0.5 → 15 (wider range, starts low so shapes are visible)
  const blur = 0.5 + ((state.marbleTurbulence ?? 3) / 10) * 14.5;
  // Scale: 0.4 → 2.2 (much wider range)
  const scale1 = 0.4 + ((state.marbleScale ?? 4) / 20) * 1.8;
  const scale2 = 0.5 + ((state.marbleScale ?? 4) / 20) * 1.5;
  const seed = state.marbleSeed ?? 1;
  const baseRotate = state.marbleRotate ?? 0;
  const rotate1 = (baseRotate + seed * 3.6) % 360;
  const rotate2 = (baseRotate + seed * 7.3) % 360;
  // Translation: -25 to +25 (wider movement)
  const tx1 = ((seed * 1.7) % 50) - 25;
  const ty1 = ((seed * 2.3) % 50) - 25;
  const tx2 = ((seed * 3.1) % 50) - 25;
  const ty2 = ((seed * 4.7) % 50) - 25;
  const blendMode = state.marbleBlendMode ?? "overlay";

  const filterId = `marble-blur-${uid}`;
  const clipId = `marble-clip-${uid}`;

  return (
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={`absolute inset-0 w-full h-full ${className}`}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <filter
          id={filterId}
          x="-50"
          y="-50"
          width="200"
          height="200"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur in="SourceGraphic" stdDeviation={blur} />
        </filter>
        <clipPath id={clipId}>
          <rect width={100} height={100} />
        </clipPath>
      </defs>

      <g clipPath={`url(#${clipId})`}>
        <rect width={100} height={100} fill={bgColor} />

        <path
          filter={`url(#${filterId})`}
          d="M32.414 59.35L50.376 70.5H72.5V-0.5H33.728L26.5 13.381L45.557 40.461L32.414 59.35Z"
          fill={color1}
          transform={`translate(${tx1} ${ty1}) rotate(${rotate1} 50 50) scale(${scale1})`}
        />

        <path
          filter={`url(#${filterId})`}
          style={{ mixBlendMode: blendMode }}
          d="M22.216 24L0 46.75L14.108 84.879L78 86L74.919 26.724L52.541 30.729L65.513 50.915L42.163 78.31L22.215 24Z"
          fill={color2}
          transform={`translate(${tx2} ${ty2}) rotate(${rotate2} 50 50) scale(${scale2})`}
        />

        {colors.slice(3).map((c, i) => {
          const r = (baseRotate + seed * (i + 5.3)) % 360;
          const tx = ((seed * (i + 2.1)) % 50) - 25;
          const ty = ((seed * (i + 3.7)) % 50) - 25;
          const s = 0.4 + ((state.marbleScale ?? 4) / 20) * 1.6;
          const blend = i % 2 === 0 ? blendMode : "soft-light";
          return (
            <path
              key={c.id}
              filter={`url(#${filterId})`}
              style={{ mixBlendMode: blend as React.CSSProperties["mixBlendMode"] }}
              d="M15 55L35 20L65 15L85 45L70 80L30 85Z"
              fill={c.color}
              transform={`translate(${tx} ${ty}) rotate(${r} 50 50) scale(${s})`}
            />
          );
        })}
      </g>
    </svg>
  );
}
