"use client";
/**
 * Page header primitive. Adapts to the active design system.
 *
 *   Classic     — title + eyebrow + description stacked, no chrome
 *   Cinematic   — full-bleed cover banner with auroras + noise,
 *                 eyebrow + gradient-text title rendered inside,
 *                 description sits on a brand-tinted wash below
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
import { DSCoverBanner } from "./DSCoverBanner";
import { DSEyebrow } from "./DSEyebrow";

interface Props {
  eyebrow?: string;
  title: string;
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
    // Cinematic renders as ONE rounded panel containing the deep
    // cover banner + a body that overlaps the cover by -mt-24. The
    // body holds the eyebrow + giant gradient title + description.
    // Lifted from the /employer HR-overview shape so cinematic
    // pages all share the same editorial vocabulary instead of the
    // older "banner with title inside + separate description card"
    // which read as two disconnected pieces.
    const hasIcon = Boolean(icon);
    const hasAside = Boolean(aside);

    return (
      <header className="rounded-3xl overflow-hidden shadow-[0_24px_60px_-20px_rgba(0,0,0,0.45)]">
        <DSCoverBanner />

        <div
          className="relative -mt-24 sm:-mt-28"
          style={{
            // Two stacked gradients: a brand-blue → pink wash fading
            // out by 35% from the top (so the cover's bottom edge
            // bleeds into a tinted body), and an opaque card base
            // underneath. Same recipe as HR overview.
            background:
              "linear-gradient(180deg, rgba(59,130,246,0.07) 0%, rgba(244,114,182,0.04) 18%, rgba(255,255,255,0) 35%), linear-gradient(180deg, var(--card) 0%, var(--card) 100%)",
          }}
        >
          {/* Decorative brand-wash blob — adds a soft accent in the
              upper-left of the body without competing with the cover */}
          <div
            aria-hidden
            className="absolute top-10 left-1/4 w-[40rem] h-[40rem] rounded-full opacity-30 blur-3xl pointer-events-none"
            style={{
              background:
                "radial-gradient(closest-side, rgba(59,130,246,0.5), rgba(59,130,246,0) 70%)",
            }}
          />

          {/* IDENTITY ROW — icon + title block side-by-side */}
          <section
            aria-label="Page header"
            className="relative px-6 sm:px-10 lg:px-14 pt-8 sm:pt-10 pb-10"
          >
            <div className={`grid gap-6 sm:gap-10 items-start grid-cols-1 ${hasIcon ? "sm:grid-cols-[auto_1fr]" : ""}`}>
              {/* Icon disc — left column. Smaller cousin of the HR-
                  overview logo disc: conic glow ring + white tile +
                  centred icon. Drops out cleanly when no icon. */}
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
                  <p className="text-[10px] uppercase tracking-[0.28em] font-bold text-brand-700 mb-3 inline-flex items-center gap-2">
                    <span
                      aria-hidden
                      className="block h-px w-6"
                      style={{
                        background:
                          "linear-gradient(90deg, var(--brand-500), transparent)",
                      }}
                    />
                    {eyebrow}
                  </p>
                )}
                <h1
                  className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.05]"
                  style={{
                    backgroundImage:
                      "linear-gradient(135deg, var(--fg) 0%, var(--fg) 60%, rgb(59,130,246) 100%)",
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

          {/* ASIDE — rendered as a separate row beneath the identity,
              divided by a hairline + its own subtle wash. Gives stats
              (the common aside payload) the full width to breathe and
              mirrors HR overview's separate STATS section. */}
          {hasAside && (
            <section
              aria-label="Page header aside"
              className="relative px-6 sm:px-10 lg:px-14 py-8 sm:py-10 border-t border-line"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, rgba(56,189,248,0.05) 0%, rgba(124,58,237,0.03) 50%, rgba(244,114,182,0.04) 100%)",
              }}
            >
              {aside}
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
