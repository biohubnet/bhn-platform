"use client";
/**
 * Page header primitive. Adapts to the active design system.
 *
 *   Classic     — title + eyebrow + description stacked, no chrome
 *   Cinematic   — full-bleed THEME-DRIVEN gradient mesh stage. Eyebrow
 *                 + title + description render directly OVER the
 *                 gradient (no paper body underneath). Each theme
 *                 paints its own stage via its own `--hero-bg` +
 *                 `--hero-mesh-{1..4}` + `--hero-fg` tokens (defined
 *                 in globals.css); the `.hero-mesh-brand` utility
 *                 reads them and the existing per-theme contrast
 *                 layer (bottom scrim + light-hero text overrides
 *                 for icecream) ensures readable text everywhere.
 *   Studio      — full-bleed gradient-mesh hero with two drifting
 *                 blob shapes + a curve-down divider. Eyebrow on
 *                 brand-light text, gradient-text accent on the
 *                 title, description on white/85 below, all
 *                 inside the hero. Optional aside slot renders to
 *                 the right (eg. stat tiles).
 *
 * Page code stays a single declarative call:
 *
 *   <DSPageHeader
 *     eyebrow="Admin · platform"
 *     title="AutoPipette"
 *     icon={<Pipette size={22} />}
 *     description="Health, helpfulness, and findings for AutoPipette."
 *   />
 */
import type { ReactNode } from "react";
import { useDesignSystem } from "@/components/ui/DesignSystemProvider";
import { DSEyebrow } from "./DSEyebrow";

interface Props {
  /** Small uppercase label above the title. Accepts a ReactNode so
   *  callers can include icons inline (e.g. `<><Compass size={11} />
   *  Program guide</>`). */
  eyebrow?: ReactNode;
  /** Page title — string or ReactNode. Some surfaces render dynamic
   *  fragments (e.g. `<>Hi, {firstName}.</>` on the dashboard). */
  title: ReactNode;
  description?: React.ReactNode;
  /** Optional icon — pass a React element (not a component
   *  reference), e.g. `icon={<Rocket size={22} className="text-brand-600" />}`.
   *
   *  Why an element and not a `ComponentType`: passing a function
   *  reference (like `icon={Rocket}`) as a prop from a server
   *  component to a client component is rejected by Next.js 16 +
   *  React 19 + Turbopack — only serializable values + React
   *  elements cross the boundary. The bug showed up as a generic
   *  "An error occurred in the Server Components render" with no
   *  recoverable message. */
  icon?: ReactNode;
  /** Studio-only optional slot rendered to the right of the
   *  title block (eg. a 2x2 stat-tile grid). Classic + Cinematic
   *  ignore. */
  aside?: ReactNode;
  /** Studio-only call-to-action buttons rendered below the
   *  description. Classic + Cinematic ignore. */
  actions?: ReactNode;
}

export function DSPageHeader({ eyebrow, title, description, icon, aside, actions }: Props) {
  const { designSystem } = useDesignSystem();

  if (designSystem === "studio") {
    return (
      <section className="full-bleed relative overflow-hidden text-white -mt-8 mb-2 hero-mesh-brand">
        {/* Drifting blob shapes — purely decorative, masked by
            the parent overflow-hidden. Drift animation respects
            prefers-reduced-motion via the CSS rule. */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="blob-shape blob-soft drift" style={{ width: 540, height: 540, top: -180, left: -160 }} />
          <div className="blob-shape blob-soft drift-slow" style={{ width: 660, height: 660, bottom: -260, right: -180, opacity: 0.55 }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 pt-14 pb-16">
          <div className={"grid gap-10 items-end " + (aside ? "md:grid-cols-[2fr_1fr]" : "")}>
            <div className="min-w-0">
              {eyebrow && (
                <DSEyebrow tone="onDark">
                  {icon && <span className="inline-flex items-center justify-center w-4 h-4 text-white/85">{icon}</span>}
                  {eyebrow}
                </DSEyebrow>
              )}
              <h1
                className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1] mt-3"
              >
                <span
                  className="gradient-text"
                  style={{
                    backgroundImage:
                      "linear-gradient(120deg, rgba(255,255,255,0.95) 0%, var(--brand-200, #bae6fd) 55%, rgba(255,255,255,0.95) 100%)",
                  }}
                >
                  {title}
                </span>
              </h1>
              {description && (
                <p className="mt-4 text-white/85 leading-relaxed text-sm md:text-base max-w-2xl">
                  {description}
                </p>
              )}
              {actions && (
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  {actions}
                </div>
              )}
            </div>
            {aside && <div className="min-w-0">{aside}</div>}
          </div>
        </div>
        <div className="curve-down" />
      </section>
    );
  }

  if (designSystem === "cinematic") {
    // Cinematic renders as ONE full-bleed stage. Eyebrow + title +
    // description + actions live DIRECTLY on the gradient (no paper
    // body underneath). Each theme paints its own colour story via
    // the `.hero-mesh-brand` utility, which reads the theme's
    // `--hero-bg` + `--hero-mesh-{1..4}` + `--hero-fg` tokens:
    //
    //   • Light theme    → deep teal stage with cyan/mint/blue auroras
    //   • Dark           → near-black with cobalt/indigo auroras
    //   • Rosalind       → deep sage with rose accent
    //   • Sakura         → deep wine with blossom pink
    //   • Hitech         → near-black with electric cyan
    //   • Greenwood      → deep forest with sage + canary
    //   • Atompunk       → blueprint navy with atomic teal + tangerine
    //   • Icecream       → light pink with deep berry text (CSS scope-
    //                      override flips text-white → dark berry)
    //
    // The bottom scrim (defined on `.hero-mesh-brand::before`) is a
    // universal contrast fail-safe; the per-theme `--hero-fg` is the
    // primary text colour.
    const hasIcon = Boolean(icon);
    const hasAside = Boolean(aside);

    return (
      <header className="full-bleed relative overflow-hidden -mt-8 mb-10 text-white hero-mesh-brand">
        {/* Editorial noise overlay — fine SVG noise at 16% on top of
            the theme mesh so the gradient doesn't read as flat.
            mix-blend-overlay so it works on both light + dark heroes. */}
        <svg
          aria-hidden
          className="absolute inset-0 w-full h-full opacity-[0.16] mix-blend-overlay pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <filter id="ds-cinematic-noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="3" />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 1
                      0 0 0 0 1
                      0 0 0 0 1
                      0 0 0 0.4 0"
            />
          </filter>
          <rect width="100%" height="100%" filter="url(#ds-cinematic-noise)" />
        </svg>

        {/* Subtle horizon hairline at mid-line — fades in/out via
            transparent → white/15 → transparent; works on dark stages
            and barely-visible on light ones (where the scrim layer
            handles contrast anyway). */}
        <div
          aria-hidden
          className="absolute left-0 right-0 top-1/2 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
        />

        {/* IDENTITY ROW — icon + title block side-by-side, centered in
            the dashboard's max-w-7xl column. The hero stage continues
            edge-to-edge behind it (full-bleed). */}
        <section
          aria-label="Page header"
          className="relative max-w-7xl mx-auto px-6 sm:px-10 lg:px-14 py-14 sm:py-16 lg:py-20"
        >
          <div className={`grid gap-6 sm:gap-10 items-center grid-cols-1 ${hasIcon ? "sm:grid-cols-[auto_1fr]" : ""}`}>
            {/* Icon disc — white tile with a conic glow ring. Conic
                stays cinematic-flavored (cyan/pink/yellow/green) on
                every theme so the icon plate reads as a brand object
                regardless of the stage colour behind it. */}
            {hasIcon && (
              <div className="relative shrink-0">
                <div
                  aria-hidden
                  className="absolute -inset-4 rounded-full opacity-60 blur-2xl"
                  style={{
                    background:
                      "conic-gradient(from 0deg, rgba(56,189,248,0.5), rgba(244,114,182,0.5), rgba(250,204,21,0.4), rgba(74,222,128,0.4), rgba(56,189,248,0.5))",
                  }}
                />
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white ring-4 ring-white shadow-[0_18px_40px_-10px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.6)] flex items-center justify-center text-brand-700">
                  {icon}
                </div>
              </div>
            )}

            {/* Title block — main column */}
            <div className="min-w-0">
              {eyebrow && (
                <DSEyebrow tone="onDark">
                  {eyebrow}
                </DSEyebrow>
              )}
              {/* Title — solid `--hero-fg` (white on dark stages, deep
                  berry on icecream's light stage via the per-theme
                  override). No bg-clip:text gradient here; we
                  intentionally trade the shimmer for bullet-proof
                  contrast on every theme, since the hero stage colour
                  varies wildly (deep navy on Dark, light pink on
                  Icecream, atomic blueprint on Atompunk, etc.). */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.05] mt-3 text-white">
                {title}
              </h1>
              {description && (
                <p className="mt-5 text-sm sm:text-base text-white/85 leading-relaxed max-w-3xl">
                  {description}
                </p>
              )}
              {actions && (
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  {actions}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ASIDE — separate row below the identity row, divided by a
            soft white-on-mesh hairline. Common payload is a stat grid
            (DSStatGrid); the divider keeps it visually grouped with
            the title above while giving it room to breathe. */}
        {hasAside && (
          <section
            aria-label="Page header aside"
            className="relative border-t border-white/10"
          >
            <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-14 py-8 sm:py-10">
              {aside}
            </div>
          </section>
        )}
      </header>
    );
  }

  // Classic — calm, structured, the original BHN look.
  return (
    <header>
      {eyebrow && <DSEyebrow>{eyebrow}</DSEyebrow>}
      <h1 className="text-2xl sm:text-3xl font-bold text-fg mt-1 tracking-tight inline-flex items-center gap-2">
        {icon}
        {title}
      </h1>
      {description && (
        <p className="text-sm text-muted mt-2 max-w-3xl leading-snug">{description}</p>
      )}
    </header>
  );
}
