"use client";

/**
 * SpinningCentrifuge — corner-accent glyph for the /login backdrop,
 * replacing the half-sketch / half-painted BHN petal mark with a
 * top-down view of a benchtop centrifuge spinning at speed.
 *
 * ── Motion-blur technique ───────────────────────────────────────
 * Instead of using a CSS `filter: blur(...)` on the rotor (which
 * would also soften the housing + hub and look flat), we draw the
 * rotor as SIX ghost copies at staggered rotational offsets — the
 * leading "frame" is the sharpest (opacity 0.95), each older frame
 * fades back through 0.62 → 0.38 → 0.22 → 0.12 → 0.06. The whole
 * stack then rotates together via a fast CSS `@keyframes cfg-spin`
 * (one full revolution every 0.5 s). The eye reads the staggered
 * opacity trail as persistence-of-vision motion blur — the same
 * way a strobe-lit fan looks blurred even though each strobe
 * snapshot is sharp.
 *
 * ── Extras that sell "spinning fast" ────────────────────────────
 *   • Tangential speed-line dashes just OUTSIDE the rotor edge,
 *     drawn STATIC (not in the spinning group). They visually
 *     blur into the spinning rotor and read as "air being
 *     whipped up around the disc".
 *   • Dashed angular smear ring at the rotor circumference,
 *     IN the spinning group — at 6 dashes per 360° rotating
 *     once per 0.5 s, it merges into a near-continuous blur ring.
 *   • Pulsing LED in the status panel (≤1 s blink) + a mono
 *     "13,400 RPM" readout in the corner so the speed cue is
 *     verbal as well as visual.
 *   • Faint radial gradient "heat haze" backwash behind the rotor.
 *
 * ── Other notes ─────────────────────────────────────────────────
 *   • `currentColor` everywhere — the parent tints via Tailwind
 *     `text-*` utilities (the /login page uses a steel-cyan).
 *   • `prefers-reduced-motion`: keyframe defined in globals.css
 *     so the spin freezes (rotor settles at rest, LED stops
 *     pulsing) when the user has the OS preference on.
 *   • `aria-label` describes what's happening for assistive tech;
 *     parent wrapper applies `aria-hidden` if the centrifuge is
 *     purely decorative in that context.
 */

interface Props {
  size?: number;
  className?: string;
}

/** Six ghost copies of the rotor — (rotationDegrees, opacity) pairs
 *  that produce the motion-blur trail. The leading frame is the last
 *  entry (rot 0, op 0.95); older "frames" fade back as you walk the
 *  array from the end. Eight degrees between adjacent frames keeps
 *  the trail tight at one rotation per 0.5 s. */
const GHOSTS: Array<{ rot: number; op: number }> = [
  { rot: -34, op: 0.06 },
  { rot: -26, op: 0.12 },
  { rot: -18, op: 0.22 },
  { rot: -10, op: 0.38 },
  { rot:  -4, op: 0.62 },
  { rot:   0, op: 0.95 },
];

/** Six sample tubes at 60° intervals around the rotor. Stored as
 *  pre-computed cartesian centres in the SVG (120, 120)-centred
 *  240×240 viewBox so the JSX stays declarative + no `Math.cos`
 *  calls happen during render. */
const TUBES: Array<{ cx: number; cy: number }> = [
  { cx: 120, cy:  50 },   //   0°
  { cx: 180.62, cy:  85 },  //  60°
  { cx: 180.62, cy: 155 },  // 120°
  { cx: 120, cy: 190 },   // 180°
  { cx:  59.38, cy: 155 },  // 240°
  { cx:  59.38, cy:  85 },  // 300°
];

/** Twelve tangential speed-line dashes around the rotor edge,
 *  hand-placed at 30° intervals just outside the 100-radius edge,
 *  each dash leaning ~3.5° clockwise so the eye picks up the
 *  rotation direction. Pre-computed for the same reasons as TUBES. */
const SPEED_LINES: Array<{
  x1: number; y1: number; x2: number; y2: number;
}> = [
  { x1: 120,    y1:  20,    x2: 113.30, y2:  29.42 },  //   0°
  { x1: 153.00, y1:  28.84, x2: 142.73, y2:  35.30 },  //  30°
  { x1: 178.58, y1:  53.00, x2: 173.40, y2:  64.30 },  //  60°
  { x1: 220,    y1: 120,    x2: 210.58, y2: 113.30 },  //  90°
  { x1: 211.16, y1: 153.00, x2: 204.70, y2: 142.73 },  // 120°
  { x1: 187.00, y1: 178.58, x2: 175.70, y2: 173.40 },  // 150°
  { x1: 120,    y1: 220,    x2: 126.70, y2: 210.58 },  // 180°
  { x1:  87.00, y1: 211.16, x2:  97.27, y2: 204.70 },  // 210°
  { x1:  61.42, y1: 187.00, x2:  66.60, y2: 175.70 },  // 240°
  { x1:  20,    y1: 120,    x2:  29.42, y2: 126.70 },  // 270°
  { x1:  28.84, y1:  87.00, x2:  35.30, y2:  97.27 },  // 300°
  { x1:  53.00, y1:  61.42, x2:  64.30, y2:  66.60 },  // 330°
];

export function SpinningCentrifuge({ size = 480, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 240 240"
      fill="none"
      stroke="currentColor"
      className={className}
      role="img"
      aria-label="Benchtop centrifuge — rotor spinning at speed with motion blur"
    >
      <defs>
        {/* Heat-haze backwash behind the rotor — soft radial
            gradient suggesting agitated air. */}
        <radialGradient id="cfg-haze" cx="50%" cy="50%" r="50%">
          <stop offset="0%"  stopColor="currentColor" stopOpacity="0.18" />
          <stop offset="55%" stopColor="currentColor" stopOpacity="0.06" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* ── Housing — rounded square with a circular porthole.
            Outer rect is the body, inner circles are the porthole
            rim + a faint inner safety ring. */}
      <rect x="14" y="14" width="212" height="212" rx="22" strokeWidth="2" opacity="0.45" />
      <circle cx="120" cy="120" r="106" strokeWidth="0.8" strokeDasharray="2 4" opacity="0.25" />
      <circle cx="120" cy="120" r="96"  strokeWidth="1.6" opacity="0.55" />
      <circle cx="120" cy="120" r="92"  strokeWidth="0.9" strokeDasharray="2 3" opacity="0.35" />

      {/* ── Bolt dots at the four corners of the housing for the
            industrial feel. */}
      <g fill="currentColor" stroke="none" opacity="0.55">
        <circle cx="26"  cy="26"  r="2.2" />
        <circle cx="214" cy="26"  r="2.2" />
        <circle cx="26"  cy="214" r="2.2" />
        <circle cx="214" cy="214" r="2.2" />
      </g>

      {/* ── Status panel — bottom-right corner of the housing.
            Pulsing LED + an RPM readout in mono. */}
      <g>
        <rect x="150" y="200" width="68" height="18" rx="2" strokeWidth="0.9" opacity="0.5" />
        <circle cx="160" cy="209" r="2.4" fill="currentColor" stroke="none" opacity="0.85">
          <animate attributeName="opacity" values="0.25;1;0.25" dur="0.9s" repeatCount="indefinite" />
        </circle>
        <text
          x="168" y="213"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          fontSize="9"
          fill="currentColor"
          stroke="none"
          opacity="0.8"
        >
          13,400 rpm
        </text>
      </g>

      {/* ── Power LED — top-left of the housing — solid (not
            pulsing) so it reads as "machine powered". */}
      <g>
        <circle cx="32" cy="32" r="2.6" fill="currentColor" stroke="none" opacity="0.85" />
        <circle cx="32" cy="32" r="5"   strokeWidth="0.6" opacity="0.4" />
      </g>

      {/* ── Heat-haze backwash — drawn behind the spinning rotor.
            Subtle radial wash suggesting agitated air around the
            high-speed disc. */}
      <circle cx="120" cy="120" r="100" fill="url(#cfg-haze)" stroke="none" />

      {/* ── Speed-line dashes — STATIC, outside the rotor edge.
            They blur visually with the spinning rotor and read
            as "air being whipped up around the disc". */}
      <g opacity="0.55" strokeWidth="1.4" strokeLinecap="round">
        {SPEED_LINES.map((l, i) => (
          <line key={`spd-${i}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />
        ))}
      </g>

      {/* ── SPINNING ROTOR — six ghost copies at staggered
            rotational offsets, all rotating together via the
            cfg-spin CSS keyframe. The leading frame (rot 0) is
            at 0.95 opacity; older "frames" fade to 0.06 so the
            trail reads as motion blur. */}
      <g
        className="cfg-spin"
        style={{
          transformOrigin: "120px 120px",
          transformBox: "view-box",
        }}
      >
        {/* Dashed angular smear ring AT the rotor edge — six
            dashes which, at one rotation per 0.5 s, smear into a
            near-continuous blur ring. */}
        <circle
          cx="120" cy="120" r="86"
          strokeWidth="2.4"
          strokeDasharray="22 18"
          opacity="0.35"
        />

        {GHOSTS.map((g, i) => (
          <g
            key={`ghost-${i}`}
            transform={`rotate(${g.rot} 120 120)`}
            opacity={g.op}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Rotor disc — translucent fill so the housing
                shows through, defined edge */}
            <circle cx="120" cy="120" r="78" strokeWidth="1.4" fill="currentColor" fillOpacity="0.06" />
            <circle cx="120" cy="120" r="78" strokeWidth="0.6" strokeDasharray="1 2" opacity="0.5" />

            {/* Radial spokes hub → each tube position */}
            {TUBES.map((t, j) => (
              <line
                key={`spoke-${i}-${j}`}
                x1="120" y1="120" x2={t.cx} y2={t.cy}
                strokeWidth="1.3"
                opacity="0.6"
              />
            ))}

            {/* Sample tubes — outer body + liquid meniscus + a
                small pellet dot at the centre (the actual
                centrifugation outcome) */}
            {TUBES.map((t, j) => (
              <g key={`tube-${i}-${j}`}>
                <circle cx={t.cx} cy={t.cy} r="11"  strokeWidth="1.5" fill="currentColor" fillOpacity="0.20" />
                <circle cx={t.cx} cy={t.cy} r="6.5" strokeWidth="0.8" fill="currentColor" fillOpacity="0.35" />
                <circle cx={t.cx} cy={t.cy} r="2.4" fill="currentColor" fillOpacity="0.9" stroke="none" />
              </g>
            ))}
          </g>
        ))}
      </g>

      {/* ── Central hub — drawn AFTER the spinning rotor so it
            sits on top, sharp and still. Two-ring design with a
            bright pinpoint at dead centre — reads as the polished
            metal collar holding the rotor onto the motor shaft. */}
      <circle cx="120" cy="120" r="11" fill="currentColor" stroke="none" />
      <circle cx="120" cy="120" r="7"  fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.9" />
      <circle cx="120" cy="120" r="2.6" fill="rgba(255,255,255,0.88)" stroke="none" />
    </svg>
  );
}
