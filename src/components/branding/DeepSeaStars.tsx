"use client";

/**
 * DeepSeaStars — featherweight star particles that drift through
 * a dark stage like marine snow / plankton sinking through the
 * deep ocean. Used on the /login backdrop behind the biotech
 * glyphs to give the dark hero a sense of depth + quiet motion.
 *
 * Each star:
 *   • starts off the top of the viewport, drifts downward over
 *     16–36 s with a horizontal sway (different sway profile per
 *     `variant`, so neighbours never sync up), rotating slowly
 *     as it sinks; fades in near the top and back out near the
 *     bottom.
 *   • is one of two micro-shapes — a soft 5-pointed sea-star
 *     silhouette or a 4-armed twinkle-cross.
 *   • carries its own colour tint (cyan / sky / teal / white)
 *     and a per-instance peak opacity (low — 0.2–0.5 — so the
 *     cloud reads as atmosphere, never as foreground UI).
 *
 * Implementation notes:
 *   • Positions / sizes / variants are HARDCODED (not random)
 *     so SSR + client render match and hydration stays clean.
 *   • Animation is pure CSS keyframes (`sea-star-sink-{a,b,c,d}`
 *     in globals.css); no JS animation loop, no per-frame React
 *     re-renders. `will-change: transform, opacity` gives the
 *     compositor a hint without forcing layer promotion.
 *   • `prefers-reduced-motion` zeroes the animation (handled in
 *     the keyframes block in globals.css).
 *   • `aria-hidden` + `pointer-events-none` so screen readers
 *     and mouse interactions ignore the entire layer.
 */

import { useEffect, useState, type CSSProperties } from "react";

type Variant = "a" | "b" | "c" | "d";
type Shape = "star" | "twinkle";

interface StarDef {
  /** Horizontal start position as % of the viewport width. */
  x: number;
  /** Render size in px. Stars look best between 5 and 12. */
  size: number;
  /** Animation duration in seconds. 16–36 ish reads as "slow drift". */
  duration: number;
  /** Negative animation-delay so a fresh page-load already has
   *  stars mid-flight rather than all starting at the top. */
  delay: number;
  /** Which sea-star-sink-* keyframe variant to use. Four variants
   *  with different horizontal sway profiles keep the cloud organic. */
  variant: Variant;
  /** Tiny 5-point sea-star silhouette or 4-point twinkle-cross. */
  shape: Shape;
  /** Tailwind text-* colour. Set the tint via `currentColor` on
   *  the SVG inside. */
  tint: string;
  /** Peak opacity (the value the keyframe fades to at the middle
   *  of the fall). Low values keep these as atmosphere. */
  opacity: number;
}

/** Hand-tuned roster — 24 stars distributed across the full
 *  width with a slight bias toward the periphery (away from the
 *  central form area). Mix of small / medium sizes, four
 *  drift-variant flavours, two shapes, and a palette of cool
 *  greens / cyans / sky-blues / off-whites so the cloud reads
 *  cohesively against the midnight stage. */
const STARS: StarDef[] = [
  // ─── LEFT PERIPHERY (x ≤ 22%) ────────────────────────────────
  { x:  3, size:  7, duration: 24, delay:  -4, variant: "a", shape: "star",    tint: "text-cyan-200",  opacity: 0.50 },
  { x:  8, size:  5, duration: 32, delay: -18, variant: "b", shape: "twinkle", tint: "text-sky-200",   opacity: 0.40 },
  { x: 11, size:  9, duration: 28, delay:  -2, variant: "c", shape: "star",    tint: "text-teal-200",  opacity: 0.45 },
  { x: 15, size:  6, duration: 36, delay: -22, variant: "d", shape: "twinkle", tint: "text-white",     opacity: 0.30 },
  { x: 18, size:  8, duration: 22, delay:  -8, variant: "a", shape: "star",    tint: "text-emerald-100", opacity: 0.42 },
  { x: 21, size:  5, duration: 30, delay: -14, variant: "c", shape: "twinkle", tint: "text-cyan-100",  opacity: 0.35 },

  // ─── MID-LEFT (22% < x ≤ 38%) ────────────────────────────────
  { x: 26, size:  6, duration: 26, delay:  -6, variant: "b", shape: "star",    tint: "text-sky-300",   opacity: 0.35 },
  { x: 31, size: 10, duration: 34, delay: -20, variant: "d", shape: "twinkle", tint: "text-cyan-200",  opacity: 0.30 },
  { x: 36, size:  5, duration: 20, delay: -10, variant: "a", shape: "star",    tint: "text-white",     opacity: 0.25 },

  // ─── CENTER (38% < x ≤ 62%) — quietest band so it doesn't
  // ─── visually fight the form column ─────────────────────────
  { x: 43, size:  4, duration: 28, delay: -16, variant: "c", shape: "twinkle", tint: "text-cyan-200",  opacity: 0.22 },
  { x: 48, size:  6, duration: 24, delay:  -4, variant: "b", shape: "star",    tint: "text-sky-200",   opacity: 0.20 },
  { x: 52, size:  4, duration: 32, delay: -24, variant: "d", shape: "twinkle", tint: "text-white",     opacity: 0.18 },
  { x: 58, size:  5, duration: 26, delay: -12, variant: "a", shape: "star",    tint: "text-teal-100",  opacity: 0.22 },

  // ─── MID-RIGHT (62% < x ≤ 78%) ───────────────────────────────
  { x: 64, size: 10, duration: 30, delay:  -2, variant: "c", shape: "star",    tint: "text-sky-200",   opacity: 0.38 },
  { x: 69, size:  5, duration: 22, delay: -18, variant: "a", shape: "twinkle", tint: "text-cyan-200",  opacity: 0.35 },
  { x: 74, size:  7, duration: 28, delay:  -8, variant: "b", shape: "star",    tint: "text-emerald-100", opacity: 0.40 },

  // ─── RIGHT PERIPHERY (x ≥ 78%) ───────────────────────────────
  { x: 79, size:  6, duration: 24, delay: -14, variant: "d", shape: "twinkle", tint: "text-cyan-100",  opacity: 0.32 },
  { x: 83, size:  8, duration: 32, delay:  -6, variant: "a", shape: "star",    tint: "text-teal-200",  opacity: 0.45 },
  { x: 86, size:  5, duration: 26, delay: -10, variant: "c", shape: "twinkle", tint: "text-sky-300",   opacity: 0.35 },
  { x: 89, size:  9, duration: 34, delay: -22, variant: "b", shape: "star",    tint: "text-white",     opacity: 0.28 },
  { x: 92, size:  6, duration: 28, delay:  -2, variant: "d", shape: "twinkle", tint: "text-cyan-200",  opacity: 0.42 },
  { x: 95, size:  7, duration: 22, delay: -16, variant: "a", shape: "star",    tint: "text-sky-200",   opacity: 0.38 },
  { x: 97, size:  4, duration: 30, delay:  -8, variant: "c", shape: "twinkle", tint: "text-teal-100",  opacity: 0.30 },
];

export function DeepSeaStars({ appearMs = 6000 }: { appearMs?: number }) {
  // Flip true a frame after mount so the entrance opacity transition plays.
  // Each star's delay is spread across `appearMs`, so the cloud fades in
  // progressively rather than popping in all at once. SSR renders hidden
  // (opacity 0) → no hydration mismatch; the entrance is a client effect.
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {STARS.map((s, i) => {
        const entranceDelay =
          STARS.length > 1 ? (i / (STARS.length - 1)) * appearMs : 0;
        return (
          <span
            key={i}
            className="absolute top-0"
            style={{
              left: `${s.x}%`,
              opacity: shown ? 1 : 0,
              transition: "opacity 1200ms ease-out",
              transitionDelay: `${Math.round(entranceDelay)}ms`,
            }}
          >
            <span
              className={`inline-block ${s.tint} sea-star-sink-${s.variant}`}
              style={
                {
                  animationDuration: `${s.duration}s`,
                  animationDelay: `${s.delay}s`,
                  "--star-op": s.opacity,
                } as CSSProperties
              }
            >
              {s.shape === "star" ? <SeaStarShape size={s.size} /> : <TwinkleShape size={s.size} />}
            </span>
          </span>
        );
      })}
    </div>
  );
}

/** Five-pointed star silhouette — the iconic sea-star shape, with
 *  rounded inner notches so it reads as organic rather than
 *  geometric / sheriff-badge. Filled in `currentColor`. */
function SeaStarShape({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="currentColor"
      stroke="none"
      role="presentation"
    >
      <path
        d="M 10 1
           L 12.2 7.4
           Q 12.5 8.2, 13.4 8.2
           L 19.2 8.2
           L 14.5 12.0
           Q 13.8 12.5, 14.1 13.4
           L 15.9 19.1
           L 10.7 15.5
           Q 10 15.0, 9.3 15.5
           L 4.1 19.1
           L 5.9 13.4
           Q 6.2 12.5, 5.5 12.0
           L 0.8 8.2
           L 6.6 8.2
           Q 7.5 8.2, 7.8 7.4
           Z"
      />
    </svg>
  );
}

/** Four-armed twinkle / sparkle — the classic ✦. Longer
 *  vertical + horizontal axes than diagonal ones, so it reads
 *  as a starlight glint rather than a square. */
function TwinkleShape({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="currentColor"
      stroke="none"
      role="presentation"
    >
      <path
        d="M 10 0
           Q 10.6 8.6, 11.4 9.4
           Q 12.2 9.4, 20 10
           Q 12.2 10.6, 11.4 11.4
           Q 10.6 12.2, 10 20
           Q 9.4 12.2, 8.6 11.4
           Q 7.8 10.6, 0 10
           Q 7.8 9.4, 8.6 8.6
           Q 9.4 8.6, 10 0
           Z"
      />
    </svg>
  );
}
