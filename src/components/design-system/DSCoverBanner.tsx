"use client";
/**
 * Full-bleed cinematic cover banner — THEME-DRIVEN gradient mesh
 * stage with an editorial noise overlay and a mid-line horizon.
 *
 * Each theme owns the colour story. The banner uses the
 * `.hero-mesh-brand` utility (defined in globals.css) which reads
 * the theme's `--hero-bg` + `--hero-mesh-{1..4}` + `--hero-fg`
 * tokens:
 *
 *   • Light      → deep teal stage with cyan/mint/blue auroras
 *   • Dark       → near-black with cobalt/indigo auroras
 *   • Rosalind   → deep sage with rose accent
 *   • Sakura     → deep wine with blossom pink
 *   • Hitech     → near-black with electric cyan
 *   • Greenwood  → deep forest with sage + canary
 *   • Atompunk   → blueprint navy with atomic teal + tangerine
 *   • Icecream   → light pink (the only light-hero theme; CSS
 *                  scope-override flips white text → deep berry)
 *
 * The bottom scrim on `.hero-mesh-brand::before` is a universal
 * contrast fail-safe.
 *
 * Standalone — DSPageHeader's cinematic branch no longer composes
 * this banner; it draws the same mesh inline so eyebrow/title can
 * sit directly on the stage with no paper body underneath. This
 * primitive remains for surfaces that want a bare cover (no copy
 * inside) or want to render their own content via `children`.
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
      className={`relative ${height} w-full overflow-hidden text-white hero-mesh-brand`}
    >
      {/* Editorial noise overlay — fine SVG noise on top of the
          theme mesh so the gradient doesn't read as flat. */}
      <svg
        aria-hidden
        className="absolute inset-0 w-full h-full opacity-[0.18] mix-blend-overlay pointer-events-none"
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
        className="absolute left-0 right-0 top-1/2 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
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
