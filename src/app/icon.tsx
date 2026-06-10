import { ImageResponse } from "next/og";

/**
 * Favicon — BioHubNet four-petal mark at 64×64. Mirrors the
 * geometry of <LogoMark> in src/components/ui/Logo.tsx and the
 * standalone /public/biohubnet-logo.svg. Four rotated petals
 * around a central 4-pointed star.
 *
 * Note: ImageResponse renders via Satori, which doesn't support
 * SVG `<symbol>` / `<use>` (we use those in the inline LogoMark
 * because they trim duplication, but the runtime needs the path
 * spelled out four times here).
 */
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

const PETAL_PATH =
  "M 24 2 C 35 2 43 9 43 19 C 43 24 39 26 33 25 C 28 23 26 23 24 23 C 22 23 20 23 15 25 C 9 26 5 24 5 19 C 5 9 13 2 24 2 Z";

const STAR_PATH =
  "M 24 16 C 25 20 28 23 32 24 C 28 25 25 28 24 32 C 23 28 20 25 16 24 C 20 23 23 20 24 16 Z";

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
          background:
            "linear-gradient(135deg,#eef2f4 0%,#dfe7ee 100%)",
        }}
      >
        <svg width="64" height="64" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="ic-top" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#1d4f8b" />
              <stop offset="55%" stopColor="#2c8aa3" />
              <stop offset="100%" stopColor="#3fa86a" />
            </linearGradient>
            <linearGradient id="ic-right" x1="1" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#52b066" />
              <stop offset="55%" stopColor="#3aa28a" />
              <stop offset="100%" stopColor="#1e6d9c" />
            </linearGradient>
            <linearGradient id="ic-bottom" x1="1" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#1d4f8b" />
              <stop offset="50%" stopColor="#2674a0" />
              <stop offset="100%" stopColor="#48a25f" />
            </linearGradient>
            <linearGradient id="ic-left" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor="#173d6f" />
              <stop offset="55%" stopColor="#226d9a" />
              <stop offset="100%" stopColor="#3c9c63" />
            </linearGradient>
          </defs>
          <path d={PETAL_PATH} fill="url(#ic-top)" />
          <g transform="rotate(90 24 24)">
            <path d={PETAL_PATH} fill="url(#ic-right)" />
          </g>
          <g transform="rotate(180 24 24)">
            <path d={PETAL_PATH} fill="url(#ic-bottom)" />
          </g>
          <g transform="rotate(270 24 24)">
            <path d={PETAL_PATH} fill="url(#ic-left)" />
          </g>
          <path d={STAR_PATH} fill="#ffffff" />
        </svg>
      </div>
    ),
    size,
  );
}
