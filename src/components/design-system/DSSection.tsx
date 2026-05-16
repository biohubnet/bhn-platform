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
import type { ComponentType, ReactNode } from "react";
import { useDesignSystem } from "@/components/ui/DesignSystemProvider";
import { DSEyebrow } from "./DSEyebrow";

interface Props {
  /** Big section heading — h2 in both designs. */
  title?: string;
  /** Smaller uppercase label above the title. Optional in classic;
   *  recommended in cinematic for rhythm. */
  eyebrow?: string;
  icon?: ComponentType<{ size?: number; className?: string }>;
  /** Cinematic-only: render a subtle wash behind the section. */
  tint?: boolean;
  children: ReactNode;
}

export function DSSection({ title, eyebrow, icon: Icon, tint = false, children }: Props) {
  const { designSystem } = useDesignSystem();

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
            {Icon && <Icon size={16} className="text-brand-600" />}
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
          {Icon && <Icon size={14} className="text-brand-600" />}
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}
