"use client";

/**
 * CourseCard — the catalog tile. Three-zone layout:
 *
 *   ┌────────────────────────────────────────────────┐
 *   │  [ COVER ART — full-width thumbnail + overlay ]│
 *   ├────────────────────────────────┬───────────────┤
 *   │ BIOP210                ♡       │ ◆ Credit 500  │  bg-card-solid
 *   │ Title here…                    │ ◆ Hybrid      │  vs
 *   │ Description copy …             │ ◆ OBIO        │  bg-elevated
 *   │ (1fr, lighter bg)              │ ──────────    │  (darker,
 *   │                                │ Enroll by:    │  tinted)
 *   │                                │ Jun 30, 2025  │
 *   │                                │ Duration:     │
 *   │                                │ Jul 23–Aug 15 │
 *   ├────────────────────────────────┴───────────────┤
 *   │      [ Request to Enroll → ] full-width        │  CTA bar
 *   └────────────────────────────────────────────────┘
 *
 * Three zones top-to-bottom:
 *   • COVER  — full-width thumbnail (or fallback gradient + BookOpen
 *              icon when no thumbnail). Inherits the admin-stamped
 *              `thumbnailOverlay` colour/gradient wash.
 *   • BODY   — 2-column grid with HIGH CONTRAST between halves:
 *              LEFT  = `bg-card-solid` (the lighter, "paper" surface
 *                      where content reads)
 *              RIGHT = `bg-elevated` with a left border-line (the
 *                      darker, "raised" metadata panel)
 *              Both surfaces are theme tokens so the contrast works
 *              on every theme.
 *   • CTA    — full-width amber button bar at the bottom. Copy is
 *              "Request to Enroll" when `requiresApproval`, else
 *              just "Enroll".
 */

import Link from "next/link";
import { ArrowRight, BookOpen, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseOverlay, overlayStyle } from "@/lib/courses/thumbnail-overlay";

interface CourseCardProps {
  course: {
    id: string;
    code: string | null;
    title: string;
    description: string | null;
    thumbnail: string | null;
    thumbnailOverlay?: unknown;
    status: string;
    courseType: string;
    duration: number | null;
    creditCost: number;
    delivery: string | null;
    provider: string | null;
    requiresApproval: boolean;
    enrollByDate: string | null;
    cohortStartDate: string | null;
    cohortEndDate: string | null;
    _count: { enrollments: number; modules: number };
  };
  role: string;
}

function fmtShortDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtMinutes(min: number | null | undefined): string {
  if (!min) return "";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function CourseCard({ course }: CourseCardProps) {
  const isArchived = course.status === "archived";
  const isFree = course.creditCost === 0;
  const hasCohort = !!(course.cohortStartDate && course.cohortEndDate);
  const ctaLabel = course.requiresApproval ? "Request to Enroll" : "Enroll";

  // Live thumbnails get the optional admin-stamped overlay. Archived
  // cards skip it — the grayscale treatment already does the visual
  // "not active" work and we don't want two filters competing.
  const overlay = isArchived ? null : parseOverlay(course.thumbnailOverlay);

  // Duration text — date range for cohorts, minutes for self-serve,
  // single date when only a cohort start is set.
  const durationText = hasCohort
    ? `${fmtShortDate(course.cohortStartDate)} – ${fmtShortDate(course.cohortEndDate)}`
    : course.cohortStartDate
      ? fmtShortDate(course.cohortStartDate)
      : fmtMinutes(course.duration);

  return (
    <Link
      href={`/courses/${course.id}`}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-card-solid transition-all h-full",
        "shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_30px_rgba(15,23,42,0.06)]",
        "hover:shadow-[0_2px_4px_rgba(15,23,42,0.06),0_16px_40px_rgba(15,23,42,0.10)]",
        "hover:-translate-y-0.5 hover:border-brand-300",
        isArchived && "opacity-75 hover:opacity-100",
      )}
    >
      {/* ── COVER ART — full-width thumbnail at the top ───────── */}
      <div
        className={cn(
          "relative h-32 sm:h-36 overflow-hidden shrink-0",
          isArchived
            ? "bg-gradient-to-br from-slate-400 to-slate-600"
            : "bg-gradient-to-br from-brand-500 to-indigo-600",
        )}
      >
        {course.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={course.thumbnail}
            alt=""
            className={cn(
              "absolute inset-0 w-full h-full object-cover",
              isArchived && "grayscale",
            )}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <BookOpen size={38} strokeWidth={1.5} className="text-white/55" />
          </div>
        )}
        {overlay && (
          <div className="absolute inset-0" style={overlayStyle(overlay)} />
        )}
        {isArchived && (
          <span className="absolute top-3 right-3 inline-flex items-center text-[10px] uppercase tracking-[0.18em] font-bold px-2 py-0.5 rounded-full bg-slate-900/80 text-white ring-1 ring-inset ring-white/20">
            Not active
          </span>
        )}
      </div>

      {/* ── BODY — 2-column, strong LEFT/RIGHT contrast ───────── */}
      <div className="grid grid-cols-[1fr_148px] sm:grid-cols-[1fr_168px] flex-1">
        {/* LEFT: content area, lighter "paper" surface */}
        <div className="p-4 sm:p-5 bg-card-solid flex flex-col min-w-0">
          {/* Code + heart row */}
          <div className="flex items-start justify-between gap-3 mb-2">
            {course.code ? (
              <span className="text-[10px] uppercase tracking-[0.22em] font-bold text-fg-muted font-mono">
                {course.code}
              </span>
            ) : (
              <span aria-hidden />
            )}
            <Heart
              size={15}
              strokeWidth={1.5}
              aria-hidden
              className="text-fg-subtle group-hover:text-rose-400 transition-colors shrink-0"
            />
          </div>

          {/* Title */}
          <h3 className="text-base sm:text-[17px] font-bold leading-snug text-fg group-hover:text-brand-700 transition-colors line-clamp-2">
            {course.title}
          </h3>

          {/* Description */}
          {course.description && (
            <p className="mt-2 text-[12px] leading-relaxed text-fg-muted line-clamp-4 flex-1">
              {course.description}
            </p>
          )}
        </div>

        {/* RIGHT: sidebar — darker tinted surface for contrast */}
        <aside className="p-3 sm:p-3.5 flex flex-col gap-1.5 bg-elevated border-l border-line">
          <ChipRow
            tone="emerald"
            label={isFree ? "Free" : `Credit ${course.creditCost.toLocaleString()}`}
          />
          {course.delivery && (
            <ChipRow tone={deliveryTone(course.delivery)} label={course.delivery} />
          )}
          {course.provider && <ChipRow tone="rose" label={course.provider} />}

          {(course.enrollByDate || durationText) && (
            <span aria-hidden className="block h-px bg-line my-1.5" />
          )}

          {course.enrollByDate && (
            <div>
              <p className="text-[9px] uppercase tracking-[0.18em] font-bold text-fg-muted">
                Enroll by:
              </p>
              <p className="text-[10.5px] font-semibold text-fg leading-snug mt-0.5">
                {fmtShortDate(course.enrollByDate)}
              </p>
            </div>
          )}

          {durationText && (
            <div className="mt-auto">
              <p className="text-[9px] uppercase tracking-[0.18em] font-bold text-fg-muted">
                Duration:
              </p>
              <p className="text-[10.5px] font-semibold text-fg leading-snug mt-0.5">
                {durationText}
              </p>
            </div>
          )}
        </aside>
      </div>

      {/* ── CTA BAR — full-width amber action button at the bottom ─ */}
      <div className="border-t border-line bg-card-solid p-3 sm:p-3.5">
        <span
          className={cn(
            "w-full inline-flex items-center justify-center gap-1.5",
            "text-[11px] font-bold uppercase tracking-[0.14em]",
            "px-4 py-2.5 rounded-md transition-colors",
            course.requiresApproval
              ? "bg-amber-600 text-white group-hover:bg-amber-700"
              : "bg-amber-500 text-white group-hover:bg-amber-600",
          )}
        >
          {ctaLabel}
          <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
        </span>
      </div>
    </Link>
  );
}

/** One chip row in the right sidebar. Theme-aware colours through
 *  the standard light + ring status-pill family. */
function ChipRow({
  tone, label,
}: {
  tone: "emerald" | "sky" | "indigo" | "rose" | "amber";
  label: string;
}) {
  const cls =
    tone === "emerald" ? "bg-emerald-50 text-emerald-800 ring-emerald-200" :
    tone === "sky"     ? "bg-sky-50 text-sky-800 ring-sky-200" :
    tone === "indigo"  ? "bg-indigo-50 text-indigo-800 ring-indigo-200" :
    tone === "amber"   ? "bg-amber-50 text-amber-800 ring-amber-200" :
                          "bg-rose-50 text-rose-800 ring-rose-200";
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center text-[10px] font-bold uppercase tracking-[0.06em] px-2 py-1 rounded-md ring-1 ring-inset w-full truncate",
        cls,
      )}
    >
      {label}
    </span>
  );
}

/** Map delivery-mode text to a chip tone. */
function deliveryTone(delivery: string): "sky" | "indigo" | "amber" | "emerald" {
  const d = delivery.toLowerCase();
  if (d.includes("in-person") || d.includes("in person")) return "sky";
  if (d.includes("hybrid") || d.includes("blended")) return "indigo";
  if (d.includes("on-demand") || d.includes("on demand") || d.includes("asynchronous")) return "amber";
  return "emerald";
}
