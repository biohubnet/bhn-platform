"use client";

/**
 * CourseCard — the catalog tile, redesigned to mirror the BHN
 * legacy course-card layout the user shared as reference:
 *
 *   ┌──────────────────────────────────────────────────┐
 *   │ BMFG205                  ┆ ◆ Credit 500          │
 *   │ Probiotic Kombucha …     ┆ ◆ Hybrid              │
 *   │                          ┆ ◆ OBIO                │
 *   │ Engineer microbes to …   ┆ ─────────────────     │
 *   │                          ┆ Enroll by:            │
 *   │                          ┆ Jun 30, 2025          │
 *   │ [ Request to Enroll → ]  ┆ Duration:             │
 *   │                          ┆ Jul 23 – Aug 15, 2025 │
 *   └──────────────────────────────────────────────────┘
 *
 * Two-column split inside one card:
 *   • LEFT (content): code eyebrow → title → description → CTA
 *   • RIGHT (meta sidebar): credit + delivery + provider chips,
 *     hairline divider, "Enroll by:" + "Duration:" rows
 *
 * Theme-native styling — `bg-card` for the content side, a tinted
 * `bg-elevated` for the sidebar, all colours from theme tokens.
 * The reference image uses dark-card + white-sidebar; on Light
 * theme that maps to white-card + cream-sidebar, and every other
 * theme picks up its own palette through the same tokens.
 *
 * `requiresApproval` decides the CTA copy — "Request to Enroll"
 * (cohort-based) vs "Enroll" (self-serve / on-demand).
 */

import Link from "next/link";
import { ArrowRight, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface CourseCardProps {
  course: {
    id: string;
    code: string | null;
    title: string;
    description: string | null;
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

  // Duration text — date range for cohorts, minutes for on-demand,
  // falls back to a single cohort date if only one is set.
  const durationText = hasCohort
    ? `${fmtShortDate(course.cohortStartDate)} – ${fmtShortDate(course.cohortEndDate)}`
    : course.cohortStartDate
      ? fmtShortDate(course.cohortStartDate)
      : fmtMinutes(course.duration);

  return (
    <Link
      href={`/courses/${course.id}`}
      className={cn(
        "group relative grid grid-cols-[1fr_auto] overflow-hidden rounded-2xl bg-card border border-line transition-all h-full",
        "shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_30px_rgba(15,23,42,0.06)]",
        "hover:shadow-[0_2px_4px_rgba(15,23,42,0.06),0_16px_40px_rgba(15,23,42,0.10)]",
        "hover:-translate-y-0.5 hover:border-brand-300",
        isArchived && "opacity-75 hover:opacity-100",
      )}
    >
      {/* ── LEFT: content ───────────────────────────────────────── */}
      <div className="flex flex-col p-5 sm:p-6 min-w-0">
        {/* Top row: code eyebrow + heart placeholder. The heart sits
            in the corner as a favorite affordance; clicking it
            doesn't navigate (we stop propagation in the wrapper). */}
        <div className="flex items-start justify-between gap-3 mb-2">
          {course.code ? (
            <span className="text-[10px] uppercase tracking-[0.22em] font-bold text-fg-muted font-mono">
              {course.code}
            </span>
          ) : (
            <span aria-hidden />
          )}
          <Heart
            size={16}
            strokeWidth={1.5}
            aria-hidden
            className="text-fg-subtle group-hover:text-rose-400 transition-colors shrink-0"
          />
        </div>

        {/* Title */}
        <h3 className="text-base sm:text-lg font-bold leading-snug text-fg group-hover:text-brand-700 transition-colors line-clamp-3">
          {course.title}
        </h3>

        {/* Description */}
        {course.description && (
          <p className="mt-3 text-[12.5px] leading-relaxed text-fg-muted line-clamp-4 flex-1">
            {course.description}
          </p>
        )}

        {/* CTA pinned at the bottom — orange-amber for both states,
            slightly different fill so the cohort/request flow reads
            distinct from the immediate-enroll one. */}
        <div className="mt-4 sm:mt-5">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] px-3 py-2 rounded-md transition-colors",
              course.requiresApproval
                ? "bg-amber-600 text-white group-hover:bg-amber-700"
                : "bg-amber-500 text-white group-hover:bg-amber-600",
            )}
          >
            {ctaLabel}
            <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </div>

      {/* ── RIGHT: sidebar with chips + dates ───────────────────── */}
      <aside className="flex flex-col w-[140px] sm:w-[160px] bg-elevated/60 border-l border-line p-3 sm:p-3.5 gap-2">
        {/* Chips column */}
        <ChipRow
          tone="emerald"
          label={isFree ? "Free" : `Credit ${course.creditCost.toLocaleString()}`}
        />
        {course.delivery && (
          <ChipRow tone={deliveryTone(course.delivery)} label={course.delivery} />
        )}
        {course.provider && (
          <ChipRow tone="rose" label={course.provider} />
        )}

        {/* Hairline divider */}
        {(course.enrollByDate || durationText) && (
          <span aria-hidden className="block h-px bg-line my-1" />
        )}

        {/* Enroll-by date — only when set */}
        {course.enrollByDate && (
          <div>
            <p className="text-[9.5px] uppercase tracking-[0.18em] font-bold text-fg-muted">
              Enroll by:
            </p>
            <p className="text-[11px] font-semibold text-fg leading-snug mt-0.5">
              {fmtShortDate(course.enrollByDate)}
            </p>
          </div>
        )}

        {/* Duration */}
        {durationText && (
          <div className="mt-auto">
            <p className="text-[9.5px] uppercase tracking-[0.18em] font-bold text-fg-muted">
              Duration:
            </p>
            <p className="text-[11px] font-semibold text-fg leading-snug mt-0.5">
              {durationText}
            </p>
          </div>
        )}

        {/* Archived overlay tag — replaces the right rail content
            when the course is archived (still readable but signaled). */}
        {isArchived && (
          <span className="mt-auto inline-flex items-center text-[9px] uppercase tracking-[0.18em] font-bold px-2 py-0.5 rounded-full bg-slate-900/85 text-white">
            Not active
          </span>
        )}
      </aside>
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
        "inline-flex items-center justify-center text-[10.5px] font-bold uppercase tracking-[0.06em] px-2 py-1 rounded-md ring-1 ring-inset w-full truncate",
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
