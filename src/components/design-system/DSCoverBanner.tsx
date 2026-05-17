"use client";
/**
 * Full-bleed cinematic cover banner — deep editorial gradient, four
 * auroras, mid-line horizon, bottom vignette, and an SVG-noise
 * overlay.
 *
 * Extracted verbatim from the `/employer` HR-overview cover so any
 * surface using the Cinematic DS gets the same brand-stage visual.
 * Previously this used soft pastels from CSS variables; the new
 * version commits to the editorial deep-gradient look the user
 * pointed at (#0b0f24 → #142046 → #312e81 → #6b21a8 → #831843).
 *
 * Pure presentational — no design-system branching; the wrapper
 * primitives (DSPageHeader) gate on `designSystem === "cinematic"`
 * before rendering this. The wrapper also owns the rounded-3xl /
 * shadow chrome so this banner is bare on the inside of a panel.
 */
import type { ReactNode } from "react";

export function DSCoverBanner({
  children,
  height = "h-56 sm:h-72 lg:h-[22rem]",
}: {
  children?: ReactNode;
  /** Tailwind height classes. Default matches the HR-overview
   *  cover; pass a smaller `h-44 sm:h-56` etc. when the surface
   *  doesn't have room for a full editorial stage. */
  height?: string;
}) {
  return (
    <div className={`relative ${height} w-full overflow-hidden`}>
      {/* Deep editorial base — 5-stop linear from near-black through
          midnight blue, indigo, royal purple, into rose. Matches the
          HR-overview cover one-for-one so themes look consistent. */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(135deg, #0b0f24 0%, #142046 25%, #312e81 50%, #6b21a8 75%, #831843 100%)",
        }}
      />

      {/* Four large auroras — radial blur blobs in cyan / pink /
          yellow / green. Positioned so the visual weight rotates
          around the stage rather than clumping in one corner. */}
      <div
        aria-hidden
        className="absolute -top-40 -left-32 w-[36rem] h-[36rem] rounded-full blur-3xl opacity-70"
        style={{
          background:
            "radial-gradient(closest-side, rgba(56,189,248,0.7), rgba(56,189,248,0) 70%)",
        }}
      />
      <div
        aria-hidden
        className="absolute -bottom-32 right-1/3 w-[34rem] h-[34rem] rounded-full blur-3xl opacity-60"
        style={{
          background:
            "radial-gradient(closest-side, rgba(244,114,182,0.7), rgba(244,114,182,0) 70%)",
        }}
      />
      <div
        aria-hidden
        className="absolute top-0 right-0 w-[24rem] h-[24rem] rounded-full blur-3xl opacity-40"
        style={{
          background:
            "radial-gradient(closest-side, rgba(250,204,21,0.5), rgba(250,204,21,0) 70%)",
        }}
      />
      <div
        aria-hidden
        className="absolute bottom-0 left-1/3 w-[22rem] h-[22rem] rounded-full blur-3xl opacity-40"
        style={{
          background:
            "radial-gradient(closest-side, rgba(74,222,128,0.5), rgba(74,222,128,0) 70%)",
        }}
      />

      {/* SVG noise overlay — 22% opacity, screen-blended white-noise
          texture that breaks up the gradient banding. */}
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
        className="absolute left-0 right-0 top-1/2 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
      />
      {/* Bottom vignette — pushes content forward, anchors the body
          wash beneath the cover when used inside a panel */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent via-transparent to-black/40"
      />

      {/* Top-left "Brand stage" label — small editorial marker, only
          rendered when no `children` slot is in use (avoids colliding
          with caller content). */}
      {!children && (
        <div className="absolute top-5 left-6 sm:left-10 flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] font-bold text-white/70">
          <span
            aria-hidden
            className="w-6 h-px"
            style={{
              background:
                "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.7))",
            }}
          />
          Brand stage
        </div>
      )}

      {/* Optional slot — caller renders title / eyebrow / etc here.
          Positioned inside the relative parent so it lands above all
          decoration. Note: when wrapped by DSPageHeader, content
          lives in the BODY beneath the cover (not in this slot),
          mirroring the HR-overview identity-row placement. */}
      {children && (
        <div className="relative h-full w-full flex flex-col justify-end p-6 sm:p-8">
          {children}
        </div>
      )}
    </div>
  );
}
