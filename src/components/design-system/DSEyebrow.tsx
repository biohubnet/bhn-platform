"use client";
/**
 * Small uppercase label used above section titles. The shape is
 * shared across design systems — what differs is the tracking +
 * accent treatment.
 *
 *   Classic   — text-only, normal tracking, subtle color
 *   Cinematic — wider tracking, brand-tinted text, leading
 *               gradient hairline accent
 *   Studio    — tracking [0.22em], brand-tinted text, sits inside
 *               a gradient hero so always reads as white-ish on
 *               dark mesh (we use text-white/80 when wrapped in
 *               the hero — but the primitive itself uses brand
 *               by default; pages can override via the `tone`
 *               prop where context warrants)
 */
import { useDesignSystem } from "@/components/ui/DesignSystemProvider";

export function DSEyebrow({ children, tone }: { children: React.ReactNode; tone?: "default" | "onDark" }) {
  const { designSystem } = useDesignSystem();
  const isDark = tone === "onDark";

  if (designSystem === "cinematic") {
    return (
      <p className={"inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] font-bold " + (isDark ? "text-white/85" : "text-brand-700")}>
        <span
          className="block h-px w-6"
          style={{
            backgroundImage: isDark
              ? "linear-gradient(to right, rgba(255,255,255,0.85), transparent)"
              : "linear-gradient(to right, var(--brand-500), transparent)",
          }}
        />
        {children}
      </p>
    );
  }

  if (designSystem === "studio") {
    return (
      <p className={"inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] font-semibold " + (isDark ? "text-white/85" : "text-brand-700")}>
        {children}
      </p>
    );
  }

  // Classic
  return (
    <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
      {children}
    </p>
  );
}
