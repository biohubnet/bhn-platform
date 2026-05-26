"use client";

/**
 * CareerPathsExplorer — single-page big-picture career map.
 *
 * Six tracks rendered as parallel horizontal lanes (one section per
 * track). Each lane carries five station boxes left-to-right (Junior →
 * Mid → Senior → Lead → VP) connected by horizontal arrows, plus a
 * track header on the left side.
 *
 *   ┌── Bioprocess Manufacturing ──────────────────────────────────┐
 *   │  [Junior] → [Mid] → [Senior] → [Lead] → [VP]                  │
 *   └───────────────────────────────────────────────────────────────┘
 *   ┌── Quality & Regulatory ──────────────────────────────────────┐
 *   │  [Junior] → [Mid] → [Senior] → [Lead] → [VP]                  │
 *   └───────────────────────────────────────────────────────────────┘
 *   …
 *
 * Per station box, top-to-bottom:
 *   • Level eyebrow ("Level 3 · Senior") + years-range pill
 *   • Primary role title + "+N more" affordance for the others
 *   • Focus microcopy (3-line clamp)
 *   • Education-gaps list — short topic phrases, no course names,
 *     no links. This is the "what kind of training do I need at this
 *     level" lens, intentionally non-prescriptive.
 *   • Cross-tree footer (when this station has crossLinks): name of
 *     the destination track + the "when" hinge + a one-line reason.
 *
 * Suggested-course chips from the previous version are gone — the
 * page is now a map, not a curriculum recommender. Course data is
 * retained in lib/career-paths/data.ts for future use.
 *
 * Responsive: on lg+ each lane is a 5-column horizontal grid. Below
 * lg the lane collapses to a single column so each station stacks
 * vertically inside its track section.
 */

import {
  Briefcase,
  Dna,
  FlaskConical,
  Network,
  Shield,
  Stethoscope,
  type LucideIcon,
  ChevronRight,
  Sparkles,
  Trophy,
  CornerDownRight,
} from "lucide-react";
import {
  CAREER_TRACKS,
  TRACK_BY_ID,
  type CareerStation,
  type CareerTrack,
} from "@/lib/career-paths/data";

const ICONS: Record<CareerTrack["iconKey"], LucideIcon> = {
  flask:       FlaskConical,
  shield:      Shield,
  dna:         Dna,
  stethoscope: Stethoscope,
  briefcase:   Briefcase,
  network:     Network,
};

export function CareerPathsExplorer() {
  return (
    <div className="space-y-8">
      {/* ── Map legend ── */}
      <section className="rounded-xl border border-line/70 bg-card-solid px-5 py-4">
        <p className="text-[10.5px] uppercase tracking-[0.18em] font-bold text-fg mb-2">
          How to read this map
        </p>
        <ul className="space-y-1 text-[12.5px] text-fg-muted leading-relaxed">
          <li className="inline-flex items-baseline gap-2">
            <Sparkles size={11} className="opacity-70 translate-y-[1px]" />
            Six career tracks. Read each row left-to-right: Junior → Mid → Senior → Lead → VP.
          </li>
          <li className="inline-flex items-baseline gap-2">
            <ChevronRight size={11} className="opacity-70 translate-y-[1px]" />
            Each box shows the typical roles, the focus at that level, and the education / skill gaps to close before the next step.
          </li>
          <li className="inline-flex items-baseline gap-2">
            <CornerDownRight size={11} className="opacity-70 translate-y-[1px]" />
            Cross-tree footers mark common branch points — where careers credibly fork into another track.
          </li>
        </ul>
      </section>

      {/* ── Six lanes ── */}
      {CAREER_TRACKS.map((track) => (
        <TrackLane key={track.id} track={track} />
      ))}

      {/* ── Catalog hand-off ── */}
      <section className="border-t border-line/60 pt-6">
        <p className="text-[12.5px] text-fg-muted leading-relaxed">
          The full course catalog lives on{" "}
          <a href="/courses" className="font-semibold text-brand-700 hover:underline">
            /courses
          </a>
          {" "}— once you've spotted the gaps you want to close, head there to find the specific offerings.
        </p>
      </section>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// One track lane — header + horizontal row of 5 station boxes
// ──────────────────────────────────────────────────────────────────

function TrackLane({ track }: { track: CareerTrack }) {
  const Icon = ICONS[track.iconKey];
  return (
    <section
      aria-labelledby={`track-${track.id}`}
      className="rounded-2xl border border-line/70 overflow-hidden"
      style={{
        // A faint accent-tinted gradient backdrop unifies the lane.
        // Same recipe used on /admin/equip/deadlines + /admin/announcements.
        backgroundImage: `linear-gradient(180deg, color-mix(in srgb, ${track.accent} 6%, var(--card)) 0%, var(--card) 70%)`,
      }}
    >
      {/* Lane header */}
      <header
        className="px-5 sm:px-6 py-4 border-b"
        style={{ borderColor: `color-mix(in srgb, ${track.accent} 18%, var(--line))` }}
      >
        <div className="flex items-start gap-3">
          <Icon className="h-6 w-6 shrink-0 mt-0.5" style={{ color: track.accent }} />
          <div className="min-w-0">
            <h2
              id={`track-${track.id}`}
              className="text-[18px] sm:text-[20px] font-semibold text-fg leading-tight tracking-tight"
              style={{ fontFamily: "var(--font-display-theme, inherit)" }}
            >
              {track.title}
            </h2>
            <p className="mt-0.5 text-[12.5px] text-fg-muted leading-snug">
              {track.tagline}
            </p>
          </div>
        </div>
      </header>

      {/* Station row */}
      <div className="p-4 sm:p-5">
        <ol className="grid grid-cols-1 lg:grid-cols-5 gap-3 lg:gap-2">
          {track.stations.map((station, idx) => (
            <li key={station.level} className="relative">
              <StationBox station={station} index={idx} accent={track.accent} />

              {/* Horizontal connector arrow between this station
                  and the next. Desktop only — vertical stacking on
                  mobile makes the arrow redundant. */}
              {idx < track.stations.length - 1 && (
                <span
                  aria-hidden
                  className="hidden lg:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10 items-center justify-center w-5 h-5 rounded-full"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${track.accent} 14%, var(--card))`,
                    color: track.accent,
                  }}
                >
                  <ChevronRight size={12} strokeWidth={2.5} />
                </span>
              )}
            </li>
          ))}
        </ol>
      </div>

      {/* Start → End markers under the lane to anchor the journey */}
      <div className="px-5 sm:px-6 pb-4 -mt-1 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] font-bold" style={{ color: track.accent }}>
        <span className="inline-flex items-center gap-1.5">
          <Sparkles size={11} /> Start
        </span>
        <span className="inline-flex items-center gap-1.5">
          Top of the ladder <Trophy size={11} />
        </span>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────
// Station box — one node in the lane
// ──────────────────────────────────────────────────────────────────

function StationBox({
  station,
  index,
  accent,
}: {
  station: CareerStation;
  index: number;
  accent: string;
}) {
  // Accent intensity grows with seniority — light at Junior, full at
  // VP. The eye reads "climbing" as it scans left-to-right.
  const intensity = 30 + index * 17; // 30% → 98%
  return (
    <article className="relative h-full rounded-xl bg-card-solid border border-line shadow-card-rest overflow-hidden">
      {/* Top accent strip — width is full, opacity scales with seniority */}
      <span
        aria-hidden
        className="absolute top-0 left-0 right-0 h-1"
        style={{
          backgroundColor: `color-mix(in srgb, ${accent} ${intensity}%, transparent)`,
        }}
      />
      <div className="p-3.5">
        <div className="flex items-baseline justify-between gap-2 flex-wrap">
          <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-fg-subtle">
            Level {index + 1} · {station.label}
          </p>
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: `color-mix(in srgb, ${accent} 12%, transparent)`,
              color: accent,
            }}
          >
            {station.yearsRange}
          </span>
        </div>

        {/* Primary role + "+N more" */}
        <p className="mt-1.5 text-[13px] font-semibold text-fg leading-snug">
          {station.roles[0]}
          {station.roles.length > 1 && (
            <span className="text-fg-subtle font-normal text-[11.5px]">
              {" "}+{station.roles.length - 1} more
            </span>
          )}
        </p>

        {/* Focus microcopy */}
        <p className="mt-1.5 text-[11.5px] text-fg-muted leading-relaxed line-clamp-3">
          {station.focus}
        </p>

        {/* Education gaps */}
        <div className="mt-3 border-t border-line/60 pt-2.5">
          <p className="text-[9.5px] uppercase tracking-[0.16em] font-bold text-fg-subtle mb-1">
            Education gaps
          </p>
          <ul className="space-y-0.5">
            {station.educationGaps.map((g) => (
              <li key={g} className="flex items-start gap-1.5 text-[11.5px] text-fg leading-snug">
                <span
                  aria-hidden
                  className="inline-block w-1 h-1 rounded-full mt-[7px] shrink-0"
                  style={{ backgroundColor: accent }}
                />
                <span className="text-fg-muted">{g}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Cross-tree footer */}
        {station.crossLinks && station.crossLinks.length > 0 && (
          <div className="mt-2.5 border-t border-line/60 pt-2.5">
            <p className="text-[9.5px] uppercase tracking-[0.16em] font-bold text-fg-subtle inline-flex items-center gap-1 mb-1">
              <CornerDownRight size={10} className="opacity-70" />
              Cross-tree from here
            </p>
            <ul className="space-y-1.5">
              {station.crossLinks.map((cl) => {
                const target = TRACK_BY_ID.get(cl.trackId);
                if (!target) return null;
                const TargetIcon = ICONS[target.iconKey];
                return (
                  <li
                    key={cl.trackId + cl.when}
                    className="text-[10.5px] leading-snug"
                  >
                    <span className="inline-flex items-baseline gap-1.5">
                      <TargetIcon className="h-3 w-3 translate-y-[2px] shrink-0" style={{ color: target.accent }} />
                      <span>
                        <span className="font-semibold text-fg">{target.title}</span>
                        <span className="text-fg-subtle"> · {cl.when}</span>
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </article>
  );
}
