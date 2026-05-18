/**
 * StylizedMark — the BHN four-petal emblem rendered as a design-
 * study: the LEFT half is hand-drawn sketch (construction grid +
 * stroke-only petal outlines + pencil annotations), the RIGHT
 * half is the finished gradient-coloured mark. A faint dashed
 * vertical line shows the split.
 *
 * Same petal + star geometry as src/components/ui/Logo.tsx and
 * public/biohubnet-logo.svg — just scaled to a 480×480 viewBox so
 * the grid + construction circles read clearly at backdrop size.
 *
 * Used as a backdrop element on the login page. Sized via the
 * `size` prop; positioning is the caller's responsibility (this
 * component renders an inline-block SVG with no positioning of
 * its own).
 */
import { cn } from "@/lib/utils";

interface Props {
  size?: number;
  className?: string;
}

const PETAL_PATH =
  "M 240 20 C 350 20 430 90 430 190 C 430 240 390 260 330 250 C 280 230 260 230 240 230 C 220 230 200 230 150 250 C 90 260 50 240 50 190 C 50 90 130 20 240 20 Z";
const STAR_PATH =
  "M 240 160 C 250 200 280 230 320 240 C 280 250 250 280 240 320 C 230 280 200 250 160 240 C 200 230 230 200 240 160 Z";

export function StylizedMark({ size = 480, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 480 480"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="BioHubNet — design study"
      className={cn("inline-block", className)}
    >
      <defs>
        <pattern id="sm-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path
            d="M 20 0 L 0 0 0 20"
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="0.5"
          />
        </pattern>

        {/* Coloured-half gradient ramps — same blue → green
            family the production LogoMark uses. */}
        <linearGradient id="sm-top" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"  stopColor="#1d4f8b" />
          <stop offset="55%" stopColor="#2c8aa3" />
          <stop offset="100%" stopColor="#3fa86a" />
        </linearGradient>
        <linearGradient id="sm-right" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#52b066" />
          <stop offset="55%" stopColor="#3aa28a" />
          <stop offset="100%" stopColor="#1e6d9c" />
        </linearGradient>
        <linearGradient id="sm-bottom" x1="1" y1="1" x2="0" y2="0">
          <stop offset="0%"  stopColor="#1d4f8b" />
          <stop offset="50%" stopColor="#2674a0" />
          <stop offset="100%" stopColor="#48a25f" />
        </linearGradient>
        <linearGradient id="sm-left" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%"  stopColor="#173d6f" />
          <stop offset="55%" stopColor="#226d9a" />
          <stop offset="100%" stopColor="#3c9c63" />
        </linearGradient>

        <clipPath id="sm-left-half">
          <rect x="0" y="0" width="240" height="480" />
        </clipPath>
        <clipPath id="sm-right-half">
          <rect x="240" y="0" width="240" height="480" />
        </clipPath>

        <symbol id="sm-petal" viewBox="0 0 480 480" overflow="visible">
          <path d={PETAL_PATH} />
        </symbol>
        <symbol id="sm-star" viewBox="0 0 480 480" overflow="visible">
          <path d={STAR_PATH} />
        </symbol>
      </defs>

      {/* ── LEFT HALF — sketch + construction grid ── */}
      <g clipPath="url(#sm-left-half)">
        <rect x="0" y="0" width="480" height="480" fill="url(#sm-grid)" />

        {/* Construction circles (dashed) + crosshair guides — the
            hand-drawn "I'm laying out the four-fold symmetry" feel. */}
        <circle cx="240" cy="240" r="210" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.6" strokeDasharray="3 4" />
        <circle cx="240" cy="240" r="120" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.6" strokeDasharray="3 4" />
        <circle cx="240" cy="240" r="80"  fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="0.6" strokeDasharray="3 4" />
        <line x1="240" y1="0" x2="240" y2="480" stroke="rgba(255,255,255,0.18)" strokeWidth="0.6" />
        <line x1="0"   y1="240" x2="480" y2="240" stroke="rgba(255,255,255,0.14)" strokeWidth="0.6" />

        {/* Petal outlines — all four rotations rendered, then
            clipped to the left half. */}
        <use href="#sm-petal"                                 fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.4" strokeLinejoin="round" />
        <use href="#sm-petal" transform="rotate(90 240 240)"  fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.4" strokeLinejoin="round" />
        <use href="#sm-petal" transform="rotate(180 240 240)" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.4" strokeLinejoin="round" />
        <use href="#sm-petal" transform="rotate(270 240 240)" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.4" strokeLinejoin="round" />

        {/* Central 4-pointed star outline */}
        <use href="#sm-star" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="1" />

        {/* Hand-drawn registration marks (tiny crosses at the
            corners of the bounding box). Designer's notebook feel. */}
        <g stroke="rgba(255,255,255,0.32)" strokeWidth="0.6" strokeLinecap="round">
          <line x1="36" y1="36" x2="48" y2="48" /><line x1="36" y1="48" x2="48" y2="36" />
          <line x1="36" y1="432" x2="48" y2="444" /><line x1="36" y1="444" x2="48" y2="432" />
        </g>

        {/* Tiny "240" + axis labels — engineer's chart vibe */}
        <text x="246" y="14" fill="rgba(255,255,255,0.35)" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="9">y</text>
        <text x="464" y="252" fill="rgba(255,255,255,0.28)" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="9">x</text>
      </g>

      {/* ── RIGHT HALF — finished, full-colour ── */}
      <g clipPath="url(#sm-right-half)">
        <use href="#sm-petal"                                 fill="url(#sm-top)" />
        <use href="#sm-petal" transform="rotate(90 240 240)"  fill="url(#sm-right)" />
        <use href="#sm-petal" transform="rotate(180 240 240)" fill="url(#sm-bottom)" />
        <use href="#sm-petal" transform="rotate(270 240 240)" fill="url(#sm-left)" />
        <use href="#sm-star" fill="#ffffff" />
      </g>

      {/* Subtle vertical split line showing the sketch ↔ colour
          handoff. Dashed so it reads as a designer's intention,
          not a hard divide. */}
      <line
        x1="240" y1="0" x2="240" y2="480"
        stroke="rgba(255,255,255,0.30)"
        strokeWidth="0.6"
        strokeDasharray="3 5"
      />
    </svg>
  );
}
