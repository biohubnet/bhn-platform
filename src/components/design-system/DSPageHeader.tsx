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
    // Cinematic renders as a TWO-TIER editorial stage:
    //
    //   (1) Deep cover banner with dreamy blurred auroras, fine SVG
    //       noise, and a mid-line horizon hairline. The base colour +
    //       all four aurora tints are driven by each theme's
    //       `--hero-bg` + `--hero-mesh-{1..4}` tokens, so each theme
    //       paints its own stage — Atom Punk gets atomic teal +
    //       tangerine + canary on blueprint navy, Greenwood gets sage
    //       + canary on deep forest, Sakura gets blossom pink on deep
    //       wine, Light gets cyan + mint + blue on deep teal, etc.
    //
    //   (2) Paper body that overlaps the cover by `-mt-24`. Body top
    //       carries a soft wash of the theme's hero accent colours
    //       (mesh-1 + mesh-2 mixed into transparent) so the cover
    //       bleeds into the card rather than cutting hard. Inside the
    //       body sits the icon disc + eyebrow + giant gradient-text
    //       title + description — all in dark `--fg` text on the
    //       light `--card`, which is the highest-contrast surface in
    //       the system on every theme.
    //
    // The title gradient runs `--fg → --brand-600`, so it stays in
    // each theme's family (Rosalind sage, Atompunk navy, Hitech cyan,
    // etc) while always reading as dark editorial text on paper.
    const hasIcon = Boolean(icon);
    const hasAside = Boolean(aside);

    return (
      <header className="full-bleed relative overflow-hidden -mt-8 mb-10">
        {/* COVER — theme-driven deep stage. Base colour via inline
            backgroundColor (not `.hero-mesh-brand` so we don't pull
            in the universal-contrast scrim; the body sits on top so
            no text needs scrim protection here). */}
        <div
          className="relative h-56 sm:h-72 lg:h-[22rem] w-full overflow-hidden"
          style={{ backgroundColor: "var(--hero-bg, #0d3a51)" }}
        >
          {/* Four large dreamy auroras using the theme's mesh tokens.
              Blurred + positioned around the stage so visual weight
              rotates rather than clumps. Each theme's palette comes
              through here — Atompunk's atomic teal + tangerine +
              canary, Sakura's blossom + wine, etc. */}
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

          {/* SVG noise overlay — fine grain that breaks up the gradient
              banding and adds editorial texture. */}
          <svg
            aria-hidden
            className="absolute inset-0 w-full h-full opacity-[0.22] mix-blend-overlay pointer-events-none"
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

          {/* Horizon hairline — subtle scene boundary at the mid-line */}
          <div
            aria-hidden
            className="absolute left-0 right-0 top-1/2 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
          />
        </div>

        {/* PAPER BODY — overlaps the cover so the two read as one
            editorial composition. Top wash uses `color-mix` on the
            theme's mesh-1 + mesh-2 tokens so the body picks up the
            cover's palette before settling into `--card`. */}
        <div
          className="relative -mt-24 sm:-mt-28"
          style={{
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--hero-mesh-1, #3b82f6) 14%, transparent) 0%, color-mix(in srgb, var(--hero-mesh-2, #f472b6) 8%, transparent) 18%, transparent 36%), var(--card)",
          }}
        >
          {/* Decorative brand blob — soft accent in the upper-left */}
          <div
            aria-hidden
            className="absolute top-10 left-1/4 w-[40rem] h-[40rem] rounded-full opacity-25 blur-3xl pointer-events-none"
            style={{
              background:
                "radial-gradient(closest-side, var(--brand-300, #7398a4), transparent 70%)",
            }}
          />

          {/* IDENTITY ROW — icon + title block side-by-side */}
          <section
            aria-label="Page header"
            className="relative max-w-7xl mx-auto px-6 sm:px-10 lg:px-14 pt-8 sm:pt-10 pb-10"
          >
            <div className={`grid gap-6 sm:gap-10 items-start grid-cols-1 ${hasIcon ? "sm:grid-cols-[auto_1fr]" : ""}`}>
              {/* Icon disc — white tile with conic-gradient glow ring.
                  Conic colours stay cinematic-flavored (cyan/pink/
                  yellow/green) so the icon plate reads as a consistent
                  brand object regardless of the stage colour above. */}
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

              {/* Title block — main column. Dark editorial text on
                  the paper card → maximum contrast on every theme. */}
              <div className="min-w-0">
                {eyebrow && <DSEyebrow>{eyebrow}</DSEyebrow>}
                <h1
                  className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.05] mt-3"
                  style={{
                    // `--fg → --fg → --brand-600` so the title stays
                    // in each theme's family (Rosalind sage, Atompunk
                    // navy, Sakura wine, etc) while reading as dark
                    // editorial text on the light card.
                    backgroundImage:
                      "linear-gradient(135deg, var(--fg) 0%, var(--fg) 55%, var(--brand-600) 100%)",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                  }}
                >
                  {title}
                </h1>
                {description && (
                  <p className="mt-5 text-sm sm:text-base text-fg/85 leading-relaxed max-w-3xl">
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

          {/* ASIDE — separate row below the identity. Theme-tinted
              wash (mesh-1 → mesh-4 → mesh-2 at low alpha) gives stats
              + secondary content their own visual zone while staying
              in family with the cover above. */}
          {hasAside && (
            <section
              aria-label="Page header aside"
              className="relative border-t border-line"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, color-mix(in srgb, var(--hero-mesh-1, #56bdf8) 6%, transparent) 0%, color-mix(in srgb, var(--hero-mesh-4, #facc15) 4%, transparent) 50%, color-mix(in srgb, var(--hero-mesh-2, #f472b6) 5%, transparent) 100%)",
              }}
            >
              <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-14 py-8 sm:py-10">
                {aside}
              </div>
            </section>
          )}
        </div>
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
