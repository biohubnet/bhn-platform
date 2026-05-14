import { ImageResponse } from "next/og";

/**
 * App favicon — renders the official BioHubNet diamond-cluster mark.
 *
 * Mirrors src/components/ui/Logo.tsx but inlines the SVG primitives
 * because next/og's ImageResponse runs in an isolated edge-runtime
 * sandbox without the cn() helper or the shared BHN colour object.
 *
 * Output is a 64×64 PNG served at /icon — browsers pick it up
 * automatically; no <link> tag needed in the layout.
 */
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

const BHN = { teal: "#327A80", blue: "#1A8DB6", mint: "#7FC9A5" } as const;

const STRIPES = [
  { y: 9.5, h: 1.6 },
  { y: 14.5, h: 2.2 },
  { y: 20, h: 1.6 },
  { y: 25.5, h: 2.2 },
  { y: 31, h: 1.6 },
  { y: 36.5, h: 2.2 },
  { y: 42, h: 1.6 },
  { y: 47.5, h: 2.2 },
  { y: 53, h: 1.6 },
];

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 64,
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "white",
        }}
      >
        <svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <clipPath id="d-tl">
              <path d="M18,4 L32,18 L18,32 L4,18 Z" />
            </clipPath>
            <clipPath id="d-tr">
              <path d="M46,4 L60,18 L46,32 L32,18 Z" />
            </clipPath>
            <clipPath id="d-mid">
              <path d="M32,18 L46,32 L32,46 L18,32 Z" />
            </clipPath>
            <clipPath id="d-btm">
              <path d="M32,32 L46,46 L32,60 L18,46 Z" />
            </clipPath>
          </defs>
          {/* top-left teal */}
          <g clipPath="url(#d-tl)">
            <rect x="0" y="0" width="64" height="64" fill={BHN.teal} />
            {STRIPES.map((s) => (
              <rect key={`tl${s.y}`} x="0" y={s.y} width="64" height={s.h} fill="white" />
            ))}
          </g>
          {/* top-right mint */}
          <g clipPath="url(#d-tr)">
            <rect x="0" y="0" width="64" height="64" fill={BHN.mint} />
            {STRIPES.map((s) => (
              <rect key={`tr${s.y}`} x="0" y={s.y} width="64" height={s.h} fill="white" />
            ))}
          </g>
          {/* bottom blue */}
          <g clipPath="url(#d-btm)">
            <rect x="0" y="0" width="64" height="64" fill={BHN.blue} />
            {STRIPES.map((s) => (
              <rect key={`b${s.y}`} x="0" y={s.y} width="64" height={s.h} fill="white" />
            ))}
          </g>
          {/* middle blue — drawn last, stacks on top at overlaps */}
          <g clipPath="url(#d-mid)">
            <rect x="0" y="0" width="64" height="64" fill={BHN.blue} />
            {STRIPES.map((s) => (
              <rect key={`m${s.y}`} x="0" y={s.y} width="64" height={s.h} fill="white" />
            ))}
          </g>
        </svg>
      </div>
    ),
    size,
  );
}
