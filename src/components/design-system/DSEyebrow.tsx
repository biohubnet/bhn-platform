"use client";
/**
 * Small uppercase label used above section titles. The shape is
 * shared across design systems — what differs is the tracking +
 * accent treatment.
 *
 *   Classic   — text-only, normal tracking, subtle color
 *   Cinematic — wider tracking, brand-tinted text
 *
 * The cinematic variant used to lead with a short gradient hairline. It
 * was dropped: at eyebrow size the rule read as a stray dash before the
 * word rather than as an accent, and it pushed the label off the left
 * edge the title aligns to. All three variants are now 12px, up from
 * 10-11px — an eyebrow that cannot be read at a glance is not doing the
 * orienting job it exists for.
 *   Studio    — tracking [0.22em], brand-tinted text, sits inside
 *               a gradient hero so always reads as white-ish on
 *               dark mesh (we use text-white/80 when wrapped in
 *               the hero — but the primitive itself uses brand
 *               by default; pages can override via the `tone`
 *               prop where context warrants)
 */
import { useDesignSystem } from "@/components/ui/DesignSystemProvider";
import { inheritsFrom } from "@/lib/design-system/registry";

export function DSEyebrow({ children, tone }: { children: React.ReactNode; tone?: "default" | "onDark" }) {
  const designSystem = inheritsFrom(useDesignSystem().designSystem);
  const isDark = tone === "onDark";

  if (designSystem === "cinematic") {
    return (
      <p className={"inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.24em] font-bold " + (isDark ? "text-white/90" : "text-brand-700")}>
        {children}
      </p>
    );
  }

  if (designSystem === "studio") {
    return (
      <p className={"inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.2em] font-semibold " + (isDark ? "text-white/85" : "text-brand-700")}>
        {children}
      </p>
    );
  }

  // Classic
  return (
    <p className="text-[12px] uppercase tracking-[0.2em] font-bold text-subtle">
      {children}
    </p>
  );
}
