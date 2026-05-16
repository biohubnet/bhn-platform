"use client";
/**
 * Small uppercase label used above section titles. The shape is
 * shared across both design systems — what differs is the
 * tracking + accent hairline before the text.
 *
 * Classic     — text-only, normal tracking, subtle color
 * Cinematic   — wider tracking, brand-tinted text, leading
 *               gradient hairline accent
 */
import { useDesignSystem } from "@/components/ui/DesignSystemProvider";

export function DSEyebrow({ children }: { children: React.ReactNode }) {
  const { designSystem } = useDesignSystem();
  if (designSystem === "cinematic") {
    return (
      <p className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] font-bold text-brand-700">
        <span
          className="block h-px w-6"
          style={{
            backgroundImage:
              "linear-gradient(to right, var(--brand-500), transparent)",
          }}
        />
        {children}
      </p>
    );
  }
  return (
    <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
      {children}
    </p>
  );
}
