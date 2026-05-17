import { ReactNode } from "react";
import { DSCoverBanner } from "@/components/design-system/DSCoverBanner";

interface Props {
  /** Small label above the title (uppercase, e.g. "Training Programmes"). */
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** Legacy: mesh palette name ("brand" / "teal" / "aurora"). Ignored
   *  by the Cinematic implementation — the deep editorial gradient is
   *  fixed. Kept on the signature for source-compatibility with the
   *  ~13 call sites that pass it. */
  tone?: "brand" | "teal" | "aurora";
  /** Extra content rendered to the right of the headline (e.g. stat
   *  counters). Renders below the title block at the bottom of the
   *  hero body so the counters never crowd the headline. */
  side?: ReactNode;
}

/**
 * Page hero band. Rebuilt 2026-05-17 to use the Cinematic design-system
 * vocabulary (rounded-3xl panel with a deep editorial cover banner +
 * body that overlaps the cover) instead of the previous full-bleed
 * mesh-brand band.
 *
 * Why
 *   The platform had two parallel hero patterns — the Cinematic DS
 *   rendering used by EQUIP-side pages, and this PageHero used by
 *   /pathways / /experience / /dashboard / etc. They looked similar
 *   but not identical, and the platform-DS toggle didn't affect
 *   PageHero pages. After the cinematic rebuild + the user's
 *   Option-B decision, every surface that isn't the HR Overview
 *   (Studio) should read as Cinematic — so PageHero now renders the
 *   exact same shape DSPageHeader's cinematic branch produces.
 *
 * The `tone` and `side` props stay on the signature so existing
 * callers don't need code changes; the new implementation maps `side`
 * → actions row and ignores `tone` (the deep editorial gradient is
 * fixed by design).
 */
export function PageHero({
  eyebrow,
  title,
  description,
  actions,
  side,
}: Props) {
  // Side content (legacy "side" slot from /experience-style pages)
  // collapses into the actions row at the bottom of the hero body so
  // it doesn't crowd the title. Pages that want richer aside content
  // (stat tiles, etc.) should use DSPageHeader directly.
  const composedActions = side ? (
    <>
      {actions}
      <div className="ml-auto">{side}</div>
    </>
  ) : (
    actions
  );

  return (
    // `full-bleed` + `-mt-8` escape the dashboard's max-w-7xl
    // centered column so the hero spans the viewport edge to edge
    // (matches the Studio hero). No rounded corners and no shadow
    // at this scale; body content below resumes the centered
    // column.
    <header className="full-bleed relative overflow-hidden -mt-8 mb-10">
      <DSCoverBanner />

      <div
        className="relative -mt-24 sm:-mt-28"
        style={{
          // Body wash bleeding out of the cover seam. Same recipe the
          // Cinematic DSPageHeader uses so the two paths visually
          // converge.
          background:
            "linear-gradient(180deg, rgba(59,130,246,0.07) 0%, rgba(244,114,182,0.04) 18%, rgba(255,255,255,0) 35%), linear-gradient(180deg, var(--card) 0%, var(--card) 100%)",
        }}
      >
        {/* Decorative brand-wash blob — keeps the body from feeling
            naked once the cover's gradient stops bleeding. */}
        <div
          aria-hidden
          className="absolute top-10 left-1/4 w-[40rem] h-[40rem] rounded-full opacity-30 blur-3xl pointer-events-none"
          style={{
            background:
              "radial-gradient(closest-side, rgba(59,130,246,0.5), rgba(59,130,246,0) 70%)",
          }}
        />

        {/* max-w-7xl + mx-auto re-centers the title column now
            that the outer header is full-bleed; the wash + blob
            behind it still span edge-to-edge. The inner max-w-3xl
            keeps the prose to comfortable reading width. */}
        <section
          aria-label="Page header"
          className="relative max-w-7xl mx-auto px-6 sm:px-10 lg:px-14 pt-8 sm:pt-10 pb-10"
        >
          <div className="max-w-3xl">
            {eyebrow && (
              <p className="text-[10px] uppercase tracking-[0.28em] font-bold text-brand-700 mb-3 inline-flex items-center gap-2">
                <span
                  aria-hidden
                  className="block h-px w-6"
                  style={{
                    background:
                      "linear-gradient(90deg, var(--brand-500), transparent)",
                  }}
                />
                {eyebrow}
              </p>
            )}
            <h1
              className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.05]"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, var(--fg) 0%, var(--fg) 60%, rgb(59,130,246) 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              {title}
            </h1>
            {description && (
              <p className="mt-5 text-sm sm:text-base text-fg/85 leading-relaxed max-w-3xl">
                {description}
              </p>
            )}
            {composedActions && (
              <div className="mt-6 flex flex-wrap items-center gap-3">
                {composedActions}
              </div>
            )}
          </div>
        </section>
      </div>
    </header>
  );
}
