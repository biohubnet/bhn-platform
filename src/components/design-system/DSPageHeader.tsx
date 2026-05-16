"use client";
/**
 * Page header primitive. Adapts to the active design system.
 *
 *   Classic     — title + eyebrow + description stacked, no chrome
 *   Cinematic   — full-bleed cover banner with auroras + noise,
 *                 eyebrow + gradient-text title rendered inside,
 *                 description sits on a brand-tinted wash below
 *
 * Page code stays a single declarative call:
 *
 *   <DSPageHeader
 *     eyebrow="Admin · platform"
 *     title="AutoPipette"
 *     icon={Pipette}
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
}

export function DSPageHeader({ eyebrow, title, description, icon }: Props) {
  const { designSystem } = useDesignSystem();

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
