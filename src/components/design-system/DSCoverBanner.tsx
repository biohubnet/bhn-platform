"use client";
/**
 * Full-bleed cinematic cover banner with five aurora gradients,
 * a horizon line, a soft vignette, and an SVG-noise overlay.
 *
 * Extracted from the inline implementation in `/employer` so any
 * surface can reuse the same brand-stage hero. Pure presentational
 * — no design-system branching; render this only when you're in
 * "cinematic" mode (the wrapper components handle the gating).
 *
 * The auroras read from CSS variables (`--brand-50`, `--brand-200`,
 * etc.) so they retint automatically for every color theme.
 */
import type { ReactNode } from "react";

export function DSCoverBanner({
  children,
  height = "h-44 sm:h-56",
}: {
  children?: ReactNode;
  height?: string;
}) {
  return (
    <div className={`relative ${height} w-full overflow-hidden rounded-3xl ring-1 ring-line shadow-[0_24px_60px_-20px_rgba(0,0,0,0.45)]`}>
      {/* Base wash */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(135deg, var(--brand-50) 0%, var(--bg) 60%, var(--brand-100) 100%)",
        }}
      />
      {/* Five auroras — radial gradient blurs in brand + accent hues */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute -top-16 left-1/4 w-[420px] h-[420px] rounded-full blur-3xl opacity-60"
          style={{ background: "radial-gradient(closest-side, rgba(56,189,248,0.55), transparent)" }}
        />
        <div
          className="absolute -top-12 right-[-60px] w-[380px] h-[380px] rounded-full blur-3xl opacity-55"
          style={{ background: "radial-gradient(closest-side, rgba(244,114,182,0.45), transparent)" }}
        />
        <div
          className="absolute top-12 left-[-40px] w-[320px] h-[320px] rounded-full blur-3xl opacity-45"
          style={{ background: "radial-gradient(closest-side, rgba(250,204,21,0.35), transparent)" }}
        />
        <div
          className="absolute bottom-[-40px] left-1/3 w-[460px] h-[460px] rounded-full blur-3xl opacity-50"
          style={{ background: "radial-gradient(closest-side, rgba(132,204,22,0.30), transparent)" }}
        />
        <div
          className="absolute bottom-[-80px] right-[10%] w-[420px] h-[420px] rounded-full blur-3xl opacity-55"
          style={{ background: "radial-gradient(closest-side, rgba(139,92,246,0.40), transparent)" }}
        />
      </div>

      {/* Horizon line — subtle white-on-transparent hairline at the
          vertical midline. Adds depth, reads as a scene boundary. */}
      <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

      {/* Soft bottom vignette — pushes content forward */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-b from-transparent to-black/30" />

      {/* SVG noise overlay — 22% opacity, screen-blended texture */}
      <svg
        aria-hidden
        className="absolute inset-0 w-full h-full opacity-[0.22] mix-blend-overlay pointer-events-none"
      >
        <filter id="ds-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#ds-noise)" />
      </svg>

      {/* Slot — caller renders title / eyebrow / etc here, positioned
          inside the relative parent so it lands above all decoration. */}
      {children && (
        <div className="relative h-full w-full flex flex-col justify-end p-6 sm:p-8">
          {children}
        </div>
      )}
    </div>
  );
}
