"use client";

/**
 * CourseCard — catalog tile, matched EXACTLY to the legacy BHN
 * course-card reference plus a cover-art banner on top.
 *
 *   ┌────────────────────────────────────────────────┐
 *   │  [   COVER ART — full-width thumbnail   ]      │  ← inherits
 *   ├────────────────────────────────┬───────────────┤   admin-stamped
 *   │ ACRTM101                ♡     │ ◆ Credit 1000 │   overlay
 *   │ Autologous CAR T               │ ◆ In-Person   │
 *   │ Manufacturing Part 1           │ ◆ Seneca      │
 *   │ (dark slate bg, white text)    │               │
 *   │                                │ ─────────     │   (white bg,
 *   │ This course introduces …       │ Enroll by:    │    slate text)
 *   │ […]                            │ June 30, 2025 │
 *   │                                │               │
 *   │                                │ Duration:     │
 *   │ [ Request to Enroll → ]        │ July 23, 2025 │
 *   │                                │ Aug. 15, 2025 │
 *   └────────────────────────────────┴───────────────┘
 *
 * Theme-independent — the card has its own dark+white identity
 * (collectible aesthetic, like trading cards) regardless of the
 * platform's active theme. Same look across Light / Dark /
 * Aurora / Sakura / etc.
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

function fmtLongDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "long",
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

  return (
    <Link
      href={`/courses/${course.id}`}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl transition-all h-full",
        // Theme-independent dark-slate identity — same look on every theme
        "bg-slate-900 text-white border border-slate-800",
        "shadow-[0_1px_2px_rgba(15,23,42,0.08),0_8px_30px_rgba(15,23,42,0.12)]",
        "hover:shadow-[0_4px_8px_rgba(15,23,42,0.12),0_20px_50px_rgba(15,23,42,0.2)]",
        "hover:-translate-y-0.5",
        isArchived && "opacity-75 hover:opacity-100",
      )}
    >
      {/* ── COVER ART — full-width banner at the top ──────────── */}
      <div
        className={cn(
          "relative h-24 sm:h-28 overflow-hidden shrink-0",
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
            <BookOpen size={32} strokeWidth={1.5} className="text-white/55" />
          </div>
        )}
        {overlay && (
          <div className="absolute inset-0" style={overlayStyle(overlay)} />
        )}
        {isArchived && (
          <span className="absolute top-2 right-2 inline-flex items-center text-[10px] uppercase tracking-[0.18em] font-bold px-2 py-0.5 rounded-full bg-slate-900/85 text-white ring-1 ring-inset ring-white/20">
            Not active
          </span>
        )}
      </div>

      {/* ── BODY — 2-column dark/white split ──────────────────── */}
      <div className="grid grid-cols-[1fr_150px] sm:grid-cols-[1fr_170px] flex-1">
        {/* LEFT — dark slate content area (inherits bg-slate-900) */}
        <div className="p-5 sm:p-6 flex flex-col min-w-0 relative">
          {/* Heart — top-right of left column, sized + positioned
              to match the reference exactly. */}
          <Heart
            size={18}
            strokeWidth={1.6}
            aria-hidden
            className="absolute top-4 right-4 text-rose-500 fill-rose-500 group-hover:scale-110 transition-transform"
          />

          {/* Code (e.g. ACRTM101) */}
          {course.code && (
            <p className="text-[15px] font-semibold leading-snug text-white pr-7">
              {course.code}
            </p>
          )}

          {/* Title */}
          <h3 className="text-[17px] sm:text-[18px] font-bold leading-tight text-white mt-1 line-clamp-3 pr-7">
            {course.title}
          </h3>

          {/* Description */}
          {course.description && (
            <p className="mt-4 text-[12.5px] leading-relaxed text-slate-300 line-clamp-5 flex-1">
              {course.description}
            </p>
          )}
        </div>

        {/* RIGHT — WHITE sidebar, slate text */}
        <aside className="p-3 sm:p-4 flex flex-col gap-2 bg-white text-slate-900">
          {/* Chip stack — capsule shape (rounded-full), solid fills,
              left-aligned white text. Matches the reference's pill
              palette exactly. */}
          <Chip tone="credit" label={isFree ? "Free" : `Credit ${course.creditCost.toLocaleString()}`} />
          {course.delivery && <Chip tone={deliveryTone(course.delivery)} label={course.delivery} />}
          {course.provider && <Chip tone="provider" label={course.provider} />}

          {/* Enroll-by — separated by a thin slate divider */}
          {course.enrollByDate && (
            <div className="mt-4 pt-3 border-t border-slate-200">
              <p className="text-[11.5px] font-semibold text-slate-700 leading-snug">
                Enroll by:
              </p>
              <p className="text-[12px] font-semibold text-slate-900 leading-snug mt-0.5">
                {fmtLongDate(course.enrollByDate)}
              </p>
            </div>
          )}

          {/* Duration — cohort dates stack on two lines (matches
              the reference image's "Jul 23, 2025 / Aug 15, 2025"),
              fall back to minutes for self-serve modes. */}
          {(hasCohort || course.cohortStartDate || course.duration) && (
            <div
              className={cn(
                "mt-auto pt-3",
                !course.enrollByDate && "border-t border-slate-200",
              )}
            >
              <p className="text-[11.5px] font-semibold text-slate-700 leading-snug">
                Duration:
              </p>
              {hasCohort ? (
                <>
                  <p className="text-[12px] font-semibold text-slate-900 leading-snug mt-0.5">
                    {fmtLongDate(course.cohortStartDate)}
                  </p>
                  <p className="text-[12px] font-semibold text-slate-900 leading-snug">
                    {fmtLongDate(course.cohortEndDate)}
                  </p>
                </>
              ) : course.cohortStartDate ? (
                <p className="text-[12px] font-semibold text-slate-900 leading-snug mt-0.5">
                  {fmtLongDate(course.cohortStartDate)}
                </p>
              ) : (
                <p className="text-[12px] font-semibold text-slate-900 leading-snug mt-0.5">
                  {fmtMinutes(course.duration)}
                </p>
              )}
            </div>
          )}
        </aside>
      </div>

      {/* ── CTA BAR — full-width bottom band, spans across both
            content + sidebar columns. Slate-800 surface so it
            visually separates from the body above without breaking
            the dark identity. */}
      <div className="bg-slate-800 border-t border-slate-700 p-3 sm:p-3.5">
        <span
          className={cn(
            "w-full inline-flex items-center justify-center gap-1.5",
            "text-[12px] font-semibold",
            "px-4 py-2.5 rounded-md transition-colors",
            "bg-orange-500 text-white group-hover:bg-orange-600",
          )}
        >
          {ctaLabel}
          <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
        </span>
      </div>
    </Link>
  );
}

/** One sidebar chip — capsule-shaped (rounded-full) solid pill
 *  with white text, left-aligned. Matches the reference card's
 *  pill vocabulary exactly: bright teal Credit / Free, vivid
 *  blues for delivery modes (mid-blue for In-Person, indigo for
 *  Hybrid, light cyan for On-Demand, sky for Online), dark
 *  maroon for Provider. */
function Chip({
  tone, label,
}: {
  tone: ChipTone;
  label: string;
}) {
  const cls = CHIP_CLASSES[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center justify-start text-[12.5px] font-semibold tracking-tight",
        "px-3.5 py-1.5 rounded-full w-full truncate leading-tight",
        cls,
      )}
    >
      {label}
    </span>
  );
}

type ChipTone = "credit" | "in-person" | "online" | "hybrid" | "on-demand" | "provider" | "default";

/** Reference image colour read (best-effort from compressed JPG):
 *    Credit/Free  — bright teal, ~teal-500
 *    In-Person    — vivid mid-blue, ~blue-700
 *    Online       — sky blue (medium light), ~sky-500
 *    Hybrid       — slightly purpler than In-Person, ~indigo-600
 *    On-Demand    — clearly LIGHTER + cooler than In-Person,
 *                   ~cyan-400
 *    Provider     — dark maroon, ~red-900
 *  White text on every chip. */
const CHIP_CLASSES: Record<ChipTone, string> = {
  credit:      "bg-teal-500 text-white",
  "in-person": "bg-blue-700 text-white",
  online:      "bg-sky-500 text-white",
  hybrid:      "bg-indigo-600 text-white",
  "on-demand": "bg-cyan-400 text-white",
  provider:    "bg-red-900 text-white",
  default:     "bg-slate-600 text-white",
};

/** Map delivery-mode text to a chip tone. */
function deliveryTone(delivery: string): ChipTone {
  const d = delivery.toLowerCase();
  if (d.includes("in-person") || d.includes("in person")) return "in-person";
  if (d.includes("hybrid") || d.includes("blended")) return "hybrid";
  if (d.includes("on-demand") || d.includes("on demand") || d.includes("asynchronous")) return "on-demand";
  if (d === "online") return "online";
  return "default";
}
