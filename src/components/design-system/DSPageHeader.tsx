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
    return (
      <header className="space-y-4">
        <DSCoverBanner>
          {eyebrow && <DSEyebrow>{eyebrow}</DSEyebrow>}
          <h1
            className="mt-2 text-3xl sm:text-5xl font-bold tracking-tight inline-flex items-center gap-3"
            style={{
              backgroundImage:
                "linear-gradient(120deg, var(--fg) 0%, var(--brand-700) 55%, var(--fg) 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            {icon && (
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-white/40 backdrop-blur-sm ring-1 ring-white/40 text-brand-700 shrink-0">
                {icon}
              </span>
            )}
            {title}
          </h1>
        </DSCoverBanner>
        {description && (
          <div
            className="rounded-2xl px-5 py-4 ring-1 ring-line"
            style={{
              backgroundImage:
                "linear-gradient(180deg, color-mix(in srgb, var(--brand-50) 60%, transparent) 0%, transparent 100%)",
            }}
          >
            <p className="text-sm text-fg/85 leading-relaxed max-w-3xl">{description}</p>
          </div>
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
