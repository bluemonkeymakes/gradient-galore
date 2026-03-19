import { useId } from "react";
import { useAtomValue } from "jotai";
import { gradientAtom } from "~/lib/atoms";

export function MarbleCanvas() {
  const state = useAtomValue(gradientAtom);
  const filterId = useId();
  const maskId = useId();

  const colors = state.colors;
  const bgColor = colors[0]?.color ?? "#8b5cf6";
  const color1 = colors[1]?.color ?? "#ec4899";
  const color2 = colors[2]?.color ?? colors[0]?.color ?? "#f97316";

  const blur = 4 + (state.marbleTurbulence / 10) * 16;
  const scale1 = 0.8 + (state.marbleScale / 20) * 0.8;
  const scale2 = 0.9 + (state.marbleScale / 20) * 0.7;
  const baseRotate = state.marbleRotate;
  const rotate1 = (baseRotate + state.marbleSeed * 3.6) % 360;
  const rotate2 = (baseRotate + (state.marbleSeed * 7.3) % 360) % 360;
  const tx1 = ((state.marbleSeed * 1.7) % 20) - 10;
  const ty1 = ((state.marbleSeed * 2.3) % 20) - 10;
  const tx2 = ((state.marbleSeed * 3.1) % 20) - 10;
  const ty2 = ((state.marbleSeed * 4.7) % 20) - 10;
  const blendMode = state.marbleBlendMode;

  return (
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className="absolute inset-0 w-full h-full rounded-2xl"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <filter
          id={filterId}
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity={0} result="BackgroundImageFix" />
          <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur stdDeviation={blur} result="blur" />
        </filter>
        <clipPath id={maskId}>
          <rect width={100} height={100} />
        </clipPath>
      </defs>

      <g clipPath={`url(#${maskId})`}>
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
          const r = (baseRotate + (state.marbleSeed * (i + 5.3)) % 360) % 360;
          const tx = ((state.marbleSeed * (i + 2.1)) % 24) - 12;
          const ty = ((state.marbleSeed * (i + 3.7)) % 24) - 12;
          const s = 0.7 + (state.marbleScale / 20) * 0.9;
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
