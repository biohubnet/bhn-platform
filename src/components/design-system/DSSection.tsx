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
import { inheritsFrom } from "@/lib/design-system/registry";
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
  const designSystem = inheritsFrom(useDesignSystem().designSystem);

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
              <h2 className="font-semibold text-fg flex items-center gap-2 text-base">
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
    // Cinematic sections are their own rounded-3xl panel so they
    // visually rhyme with the cinematic DSPageHeader (which is also
    // a rounded panel).
    //
    // The eyebrow used to be a local copy carrying a sky→violet
    // gradient hairline before the label. That hairline is gone —
    // at eyebrow size it read as a stray dash, and it pushed the
    // label off the left edge the title aligns to. The subordinate
    // look it existed for is now `DSEyebrow tone="subtle"`, so there
    // is one eyebrow implementation and the style cannot regrow here.
    return (
      <section
        className="rounded-3xl bg-card border border-line overflow-hidden"
        style={tint ? {
          backgroundImage:
            "linear-gradient(135deg, rgba(56,189,248,0.05) 0%, rgba(124,58,237,0.03) 50%, rgba(244,114,182,0.04) 100%)",
        } : undefined}
      >
        <div className="px-6 sm:px-10 lg:px-14 py-8 sm:py-10">
          {eyebrow && <div className="mb-4"><DSEyebrow tone="subtle">{eyebrow}</DSEyebrow></div>}
          {title && (
            <h2 className="text-xl sm:text-2xl font-bold text-fg tracking-tight flex items-center gap-2 mb-5">
              {icon}
              {title}
            </h2>
          )}
          {children}
        </div>
      </section>
    );
  }

  // Classic
  return (
    <section className="rounded-2xl border border-line bg-card surface-shadow p-5 space-y-4">
      {eyebrow && <DSEyebrow>{eyebrow}</DSEyebrow>}
      {title && (
        <h2 className="text-sm font-bold text-fg flex items-center gap-2">
          {icon}
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}
