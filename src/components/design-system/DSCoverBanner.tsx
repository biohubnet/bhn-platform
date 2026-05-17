"use client";
/**
 * Full-bleed cinematic cover banner — THEME-DRIVEN deep editorial
 * stage with dreamy blurred auroras, fine SVG noise, and a mid-line
 * horizon hairline.
 *
 * Base colour + all four aurora tints come from each theme's
 * `--hero-bg` + `--hero-mesh-{1..4}` tokens (defined in
 * globals.css), so every theme paints its own stage:
 *
 *   • Light      → deep teal with cyan/mint/blue/dark-cyan auroras
 *   • Dark       → near-black with cobalt/indigo/deep-navy auroras
 *   • Rosalind   → deep sage with sage/rose/deep-fern accents
 *   • Sakura     → deep wine with blossom pink + cream
 *   • Hitech     → near-black with electric cyan + teal
 *   • Greenwood  → deep forest with sage + canary + leaf
 *   • Atompunk   → blueprint navy with atomic teal + tangerine + canary
 *   • Icecream   → light pink with peach + mint + lilac
 *
 * Standalone — DSPageHeader's cinematic branch composes its own
 * version of this stage inline so the title's paper-body overlap
 * lines up cleanly. This primitive remains for surfaces that want
 * a bare cover (no copy inside) or want to render their own content
 * via `children`.
 */
import type { ReactNode } from "react";

export function DSCoverBanner({
  children,
  height = "h-56 sm:h-72 lg:h-[22rem]",
}: {
  children?: ReactNode;
  /** Tailwind height classes. Default matches the previous HR-
   *  overview cover; pass a smaller `h-44 sm:h-56` etc. when the
   *  surface doesn't have room for a full editorial stage. */
  height?: string;
}) {
  return (
    <div
      className={`relative ${height} w-full overflow-hidden`}
      style={{ backgroundColor: "var(--hero-bg, #0d3a51)" }}
    >
      {/* Four dreamy auroras, theme-driven. Positioned so visual
          weight rotates around the stage rather than clumping. */}
      <div
        aria-hidden
        className="absolute -top-40 -left-32 w-[36rem] h-[36rem] rounded-full blur-3xl opacity-70"
        style={{
          background:
            "radial-gradient(closest-side, var(--hero-mesh-1, #56bdf8), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="absolute -bottom-32 right-1/3 w-[34rem] h-[34rem] rounded-full blur-3xl opacity-60"
        style={{
          background:
            "radial-gradient(closest-side, var(--hero-mesh-2, #f472b6), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="absolute top-0 right-0 w-[24rem] h-[24rem] rounded-full blur-3xl opacity-45"
        style={{
          background:
            "radial-gradient(closest-side, var(--hero-mesh-4, #facc15), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="absolute bottom-0 left-1/3 w-[22rem] h-[22rem] rounded-full blur-3xl opacity-45"
        style={{
          background:
            "radial-gradient(closest-side, var(--hero-mesh-3, #4ade80), transparent 70%)",
        }}
      />

      {/* SVG noise overlay — fine grain to break up the gradient
          banding and add editorial texture. */}
      <svg
        aria-hidden
        className="absolute inset-0 w-full h-full opacity-[0.22] mix-blend-overlay pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <filter id="ds-cover-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="3" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 1
                    0 0 0 0 1
                    0 0 0 0 1
                    0 0 0 0.4 0"
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#ds-cover-noise)" />
      </svg>

      {/* Horizon hairline — subtle scene boundary at the mid-line */}
      <div
        aria-hidden
        className="absolute left-0 right-0 top-1/2 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
      />

      {/* Optional slot — caller renders title / eyebrow / etc here.
          Positioned inside the relative parent so it lands above
          all decoration. */}
      {children && (
        <div className="relative h-full w-full flex flex-col justify-end p-6 sm:p-8">
          {children}
        </div>
      )}
    </div>
  );
}
