import { ReactNode } from "react";

interface Props {
  /** Small label above the title (uppercase, eg "Training Programmes"). */
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** Mesh palette. Defaults to brand. */
  tone?: "brand" | "teal" | "aurora";
  /** Extra content rendered to the right of the headline (eg counters). */
  side?: ReactNode;
}

/**
 * Bold, full-bleed hero band for top-level pages. Breaks out of the
 * dashboard layout's centred column to span the viewport, paints a
 * mesh gradient, lays in three drifting blobs, and finishes with a
 * curved organic bottom edge. Use as the first element of a page;
 * regular content flows back inside the centred column below.
 */
export function PageHero({
  eyebrow,
  title,
  description,
  actions,
  tone = "brand",
  side,
}: Props) {
  return (
    <section
      className={`full-bleed relative overflow-hidden text-white -mt-8 mb-10 hero-mesh-${tone}`}
    >
      {/* Drifting organic blobs — purely decorative. */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="blob-shape blob-soft drift" style={{ width: 520, height: 520, top: -160, left: -120 }} />
        <div className="blob-shape blob-soft drift-slow" style={{ width: 640, height: 640, bottom: -260, right: -180, opacity: 0.55 }} />
        <div className="blob-shape drift" style={{ width: 300, height: 300, top: "30%", left: "55%", opacity: 0.35 }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-16">
        {eyebrow && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/80">
            {eyebrow}
          </span>
        )}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mt-3">
          <div className="min-w-0 max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.1]">
              {title}
            </h1>
            {description && (
              <p className="mt-4 text-white/85 leading-relaxed text-base md:text-lg">
                {description}
              </p>
            )}
          </div>
          {(side || actions) && (
            <div className="flex flex-col items-stretch md:items-end gap-4 shrink-0">
              {side}
              {actions && <div className="flex items-center gap-2">{actions}</div>}
            </div>
          )}
        </div>
      </div>
      <div className="curve-down" />
    </section>
  );
}
