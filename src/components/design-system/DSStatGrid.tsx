"use client";
/**
 * Stat grid + individual Stat primitive. The whole point of having
 * an adaptive primitive here is the cinematic preset wants stats
 * laid out RADICALLY differently:
 *
 *   Classic     — 2x2 / 4x1 grid of bordered cards, each with
 *                 icon + label + value + help, tabular-nums
 *   Cinematic   — single row of inline stats divided by vertical
 *                 hairlines (`divide-x`), gradient-text values,
 *                 small uppercase label above
 *
 * Same JSX in the page either way.
 */
import type { ReactNode } from "react";
import { useDesignSystem } from "@/components/ui/DesignSystemProvider";

const GRADIENT_TONES = ["brand", "violet", "rose", "emerald", "amber"] as const;
export type StatTone = (typeof GRADIENT_TONES)[number];

/** Wraps a row of <DSStat> children. Use this so the layout switch
 *  happens in ONE place, not on every stat. */
export function DSStatGrid({ children }: { children: ReactNode }) {
  const { designSystem } = useDesignSystem();
  if (designSystem === "cinematic") {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-line ring-1 ring-line rounded-2xl bg-card/40 overflow-hidden">
        {children}
      </div>
    );
  }
  return <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{children}</div>;
}

interface StatProps {
  /** Pass a React element, NOT a component reference. See the
   *  matching note in DSPageHeader.tsx for the boundary issue. */
  icon?: ReactNode;
  label: string;
  value: number | string;
  help?: string;
  /** Cinematic-only colour ramp for the gradient-text number. Defaults
   *  to brand. Classic ignores this. */
  tone?: StatTone;
  /** Classic-only accent. */
  accent?: "brand";
}

function gradientForTone(tone: StatTone): string {
  switch (tone) {
    case "violet":
      return "linear-gradient(120deg, #8b5cf6 0%, #6366f1 100%)";
    case "rose":
      return "linear-gradient(120deg, #f43f5e 0%, #ec4899 100%)";
    case "emerald":
      return "linear-gradient(120deg, #10b981 0%, #14b8a6 100%)";
    case "amber":
      return "linear-gradient(120deg, #f59e0b 0%, #d97706 100%)";
    case "brand":
    default:
      return "linear-gradient(120deg, var(--brand-600) 0%, var(--brand-800) 100%)";
  }
}

export function DSStat({
  icon,
  label,
  value,
  help,
  tone = "brand",
  accent,
}: StatProps) {
  const { designSystem } = useDesignSystem();
  const formatted = typeof value === "number" ? value.toLocaleString() : value;

  if (designSystem === "cinematic") {
    return (
      <div className="px-4 py-5">
        <div className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle inline-flex items-center gap-1.5">
          {icon}
          {label}
        </div>
        <p
          className="text-3xl sm:text-4xl font-bold tabular-nums mt-2"
          style={{
            backgroundImage: gradientForTone(tone),
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          {formatted}
        </p>
        {help && <p className="text-[10px] text-subtle mt-1">{help}</p>}
      </div>
    );
  }

  // Classic
  return (
    <div
      className={`rounded-xl border ${accent === "brand" ? "border-brand-200 bg-brand-50/40" : "border-line bg-card"} p-3`}
    >
      <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-subtle inline-flex items-center gap-1.5">
        {icon}
        {label}
      </div>
      <p className="text-2xl font-bold text-fg tabular-nums mt-1">{formatted}</p>
      {help && <p className="text-[10px] text-subtle mt-0.5">{help}</p>}
    </div>
  );
}
