"use client";
/**
 * Section primitive. Wraps a related cluster of content.
 *
 *   Classic     — rounded-2xl card, border, surface-shadow, padded
 *   Cinematic   — hairline-bordered, no card chrome, eyebrow as
 *                 the section anchor, tonal wash optional
 *
 * Title + icon get rendered consistently across both designs but
 * styled to fit. Eyebrow is the editorial section marker —
 * required in cinematic mode for visual rhythm.
 */
import type { ReactNode } from "react";
import { useDesignSystem } from "@/components/ui/DesignSystemProvider";
import { DSEyebrow } from "./DSEyebrow";

interface Props {
  /** Big section heading — h2 in both designs. */
  title?: string;
  /** Smaller uppercase label above the title. Optional in classic;
   *  recommended in cinematic for rhythm. */
  eyebrow?: string;
  /** Pass a React element, NOT a component reference. See the
   *  matching note in DSPageHeader.tsx for the Next.js / Turbopack
   *  function-as-prop boundary issue this avoids. */
  icon?: ReactNode;
  /** Cinematic-only: render a subtle wash behind the section. */
  tint?: boolean;
  children: ReactNode;
}

export function DSSection({ title, eyebrow, icon, tint = false, children }: Props) {
  const { designSystem } = useDesignSystem();

  if (designSystem === "studio") {
    // Studio sections mirror the HR-overview list cards: rounded-2xl
    // wrapper with a header strip (title + eyebrow + optional aside
    // action) divided from the body by a hairline border-line. No
    // surface-shadow — relies on the page bg contrast.
    return (
      <section className="bg-card border border-line rounded-2xl overflow-hidden">
        {(title || eyebrow) && (
          <header className="px-5 py-4 border-b border-line">
            {eyebrow && <div className="mb-1"><DSEyebrow>{eyebrow}</DSEyebrow></div>}
            {title && (
              <h2 className="font-semibold text-fg inline-flex items-center gap-2 text-base">
                {icon}
                {title}
              </h2>
            )}
          </header>
        )}
        <div className="p-5">{children}</div>
      </section>
    );
  }

  if (designSystem === "cinematic") {
    return (
      <section
        className={`relative pt-6 pb-2 border-t border-line ${tint ? "px-4 sm:px-5 rounded-2xl ring-1 ring-line/60" : ""}`}
        style={tint ? {
          backgroundImage:
            "linear-gradient(180deg, color-mix(in srgb, var(--brand-50) 35%, transparent) 0%, transparent 80%)",
        } : undefined}
      >
        {eyebrow && (
          <div className="mb-3">
            <DSEyebrow>{eyebrow}</DSEyebrow>
          </div>
        )}
        {title && (
          <h2 className="text-lg sm:text-xl font-bold text-fg tracking-tight inline-flex items-center gap-2 mb-4">
            {icon}
            {title}
          </h2>
        )}
        {children}
      </section>
    );
  }

  // Classic
  return (
    <section className="rounded-2xl border border-line bg-card surface-shadow p-5 space-y-4">
      {eyebrow && <DSEyebrow>{eyebrow}</DSEyebrow>}
      {title && (
        <h2 className="text-sm font-bold text-fg inline-flex items-center gap-2">
          {icon}
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}
