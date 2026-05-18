/**
 * StylizedMark — the BHN four-petal mark rendered as a design
 * study: the LEFT region is hand-drawn pencil sketch
 * (construction grid + dashed symmetry circles + crosshair guides
 * + multi-stroke wobbly petal outlines + tiny pencil annotations),
 * and the RIGHT region is the finished gradient-coloured mark
 * "brushed on" over the sketch.
 *
 * The split between sketch and colour is NOT a straight line —
 * an organic wavy clip-path makes it look like the brush stroked
 * a meandering edge across the design. A soft mask near the
 * boundary feathers the colour so it fades into the sketch like
 * wet paint catching the page texture.
 *
 * Pencil-sketch realism:
 *   • Three overlapping stroke copies per petal at slightly
 *     different translate offsets + opacities for a layered
 *     pencil-line look.
 *   • An SVG `feTurbulence` + `feDisplacementMap` filter
 *     applies micro-tremor to the strokes so they don't read
 *     as machine-perfect.
 *   • Tiny registration crosses + axis labels + a "Section
 *     A-A" stamp give the sheet a designer's-notebook feel.
 *
 * Same petal + star geometry as src/components/ui/Logo.tsx and
 * public/biohubnet-logo.svg — scaled to a 480×480 viewBox so the
 * grid + construction reads clearly at backdrop size.
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

/** Wavy organic curve from (~220, 0) down to (~220, 480) — the
 *  boundary between the sketch region and the colour-painted
 *  region. The colour `<g>` is clipped to everything RIGHT of
 *  this curve. */
const SPLIT_CURVE_RIGHT_CLIP =
  // Start top-right corner, walk down the curve, back along top
  "M 480 0 " +
  "L 240 0 " +
  "C 260 60 200 110 250 170 " +
  "C 290 230 200 280 260 340 " +
  "C 220 400 270 450 230 480 " +
  "L 480 480 Z";

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
        {/* Grid for the sketch region */}
        <pattern id="sm-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path
            d="M 20 0 L 0 0 0 20"
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="0.5"
          />
        </pattern>

        {/* Subtler 5-px sub-grid behind the main 20-px grid */}
        <pattern id="sm-subgrid" width="5" height="5" patternUnits="userSpaceOnUse">
          <path d="M 5 0 L 0 0 0 5" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.3" />
        </pattern>

        {/* Pencil-tremor filter — micro-displacement that makes
            the stroke wobble slightly so it reads hand-drawn. */}
        <filter id="sm-pencil-tremor" x="-2%" y="-2%" width="104%" height="104%">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="2.4" />
        </filter>

        {/* Colour gradients — same blue → green family as
            LogoMark / public/biohubnet-logo.svg. */}
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

        {/* Wavy clip-path — the colour region. The sketch is
            everything OUTSIDE this clip. */}
        <clipPath id="sm-color-region">
          <path d={SPLIT_CURVE_RIGHT_CLIP} />
        </clipPath>

        {/* Brush-edge feather mask — fades the colour from solid
            in the centre/right toward transparent at the wavy
            boundary, so the paint reads as "applied" not "stamped". */}
        <linearGradient id="sm-brush-fade" x1="0.25" y1="0.5" x2="0.7" y2="0.5">
          <stop offset="0%"   stopColor="#000000" stopOpacity="0" />
          <stop offset="22%"  stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="55%"  stopColor="#ffffff" stopOpacity="1" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
        </linearGradient>
        <mask id="sm-brush-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="480" height="480">
          <rect x="0" y="0" width="480" height="480" fill="url(#sm-brush-fade)" />
        </mask>

        <symbol id="sm-petal" viewBox="0 0 480 480" overflow="visible">
          <path d={PETAL_PATH} />
        </symbol>
        <symbol id="sm-star" viewBox="0 0 480 480" overflow="visible">
          <path d={STAR_PATH} />
        </symbol>
      </defs>

      {/* ── SKETCH LAYER (full canvas) — drawn first, gets
           visually erased on the right by the colour layer on top. */}
      <g>
        <rect x="0" y="0" width="480" height="480" fill="url(#sm-subgrid)" />
        <rect x="0" y="0" width="480" height="480" fill="url(#sm-grid)" />

        {/* Construction circles (dashed) + crosshair guides */}
        <g stroke="rgba(255,255,255,0.20)" strokeWidth="0.6" fill="none" strokeDasharray="3 4">
          <circle cx="240" cy="240" r="220" />
          <circle cx="240" cy="240" r="160" />
          <circle cx="240" cy="240" r="120" />
          <circle cx="240" cy="240" r="80" />
        </g>
        <g stroke="rgba(255,255,255,0.18)" strokeWidth="0.6">
          <line x1="240" y1="0" x2="240" y2="480" />
          <line x1="0"   y1="240" x2="480" y2="240" />
          {/* 45° / 135° diagonals for the symmetry construction */}
          <line x1="70"  y1="70"  x2="410" y2="410" opacity="0.5" />
          <line x1="410" y1="70"  x2="70"  y2="410" opacity="0.5" />
        </g>

        {/* Petal outlines — three stacked stroke copies at slight
            offsets + varying opacity give the pencil-sketch
            layered-line feel. Wrapped in the tremor filter so the
            strokes don't read as machine-perfect. */}
        <g filter="url(#sm-pencil-tremor)">
          {[
            { dx: 0,    dy: 0,    sw: 1.4, op: 0.62 },
            { dx: 0.7,  dy: 0.5,  sw: 1.0, op: 0.42 },
            { dx: -0.5, dy: 0.6,  sw: 0.8, op: 0.30 },
          ].map((s, i) => (
            <g key={i} transform={`translate(${s.dx} ${s.dy})`} stroke="rgba(255,255,255,0.75)" strokeWidth={s.sw} strokeLinejoin="round" fill="none" opacity={s.op}>
              <use href="#sm-petal" />
              <use href="#sm-petal" transform="rotate(90 240 240)" />
              <use href="#sm-petal" transform="rotate(180 240 240)" />
              <use href="#sm-petal" transform="rotate(270 240 240)" />
              <use href="#sm-star" />
            </g>
          ))}
        </g>

        {/* Designer's-notebook annotations */}
        <g stroke="rgba(255,255,255,0.35)" strokeWidth="0.6" strokeLinecap="round" fill="none">
          {/* Registration crosses at the corners of the bounding box */}
          <line x1="36" y1="36" x2="48" y2="48" /><line x1="36" y1="48" x2="48" y2="36" />
          <line x1="36" y1="432" x2="48" y2="444" /><line x1="36" y1="444" x2="48" y2="432" />
          {/* Tick marks on the centre axis at 80px increments */}
          <line x1="237" y1="40" x2="243" y2="40" />
          <line x1="237" y1="120" x2="243" y2="120" />
          <line x1="237" y1="360" x2="243" y2="360" />
          <line x1="237" y1="440" x2="243" y2="440" />
        </g>
        <g fill="rgba(255,255,255,0.4)" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="9">
          <text x="248" y="14">y</text>
          <text x="466" y="252">x</text>
          <text x="58"  y="46">R0</text>
          <text x="124" y="166" opacity="0.6">Ø160</text>
          <text x="44"  y="468" opacity="0.6">SECT. A-A</text>
        </g>
      </g>

      {/* ── COLOUR LAYER — clipped to the right of the wavy
           curve, and masked to feather softly along the boundary
           so the paint looks brushed-on rather than stamped. */}
      <g clipPath="url(#sm-color-region)" mask="url(#sm-brush-mask)">
        <use href="#sm-petal"                                 fill="url(#sm-top)" />
        <use href="#sm-petal" transform="rotate(90 240 240)"  fill="url(#sm-right)" />
        <use href="#sm-petal" transform="rotate(180 240 240)" fill="url(#sm-bottom)" />
        <use href="#sm-petal" transform="rotate(270 240 240)" fill="url(#sm-left)" />
        <use href="#sm-star" fill="#ffffff" />
      </g>
    </svg>
  );
}
