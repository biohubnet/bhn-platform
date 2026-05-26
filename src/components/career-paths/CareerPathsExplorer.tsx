"use client";

/**
 * CareerPathsExplorer — flowchart + mind-map of every career track.
 *
 * Layout
 * ────────────────────────────────────────────────────────────────
 *                ╭─────────────────────────╮
 *                │   Your Career Journey   │  ← mind-map root
 *                ╰─────────────┬───────────╯
 *      ┌────┬────┬─────────────┼─────────────┬────┬────┐   ← SVG radiating curves
 *      │    │    │             │             │    │    │
 *   [Bioproc] [Quality] [CGT] [Clinical] [Biz] [Proj]      ← track headers
 *      │    │    │       │       │      │      │
 *      ▼    ▼    ▼       ▼       ▼      ▼      ▼            ← row arrows
 *   ╭─Junior row──────────────────────────────────────╮
 *   │ [box] [box] [box]   [box] [box] [box]            │
 *   ╰─────────────────────────────────────────────────╯
 *      │    │    │       │       │      │      │
 *      ▼    ▼    ▼       ▼       ▼      ▼      ▼
 *   ╭─Mid row─────────────────────────────────────────╮
 *      …                                                  ← repeats for Senior, Lead, VP
 *
 * Each cell carries: level eyebrow + years pill, primary role, 3-line
 * focus, an "Education gaps" bulleted list (5 topic phrases, no
 * specific course names), and an inline cross-tree footer at branch
 * points ("→ Quality at Lead — quality lateral is fast-track here").
 *
 * The connectors are curved SVG paths so the page reads as a mind-map
 * (organic) rather than a Gantt-style grid. The mind-map root at the
 * top reinforces "all roads start from the same place + diverge".
 *
 * Responsive: the chart needs ~1200 px horizontal to render the 6
 * columns legibly, so the whole thing sits inside an overflow-x-auto
 * wrapper. On phones the user pans horizontally to walk the map.
 */

import {
  Briefcase,
  Dna,
  FlaskConical,
  Network,
  Shield,
  Stethoscope,
  type LucideIcon,
  Sparkles,
  Trophy,
  CornerDownRight,
  ArrowDown,
} from "lucide-react";
import {
  CAREER_TRACKS,
  TRACK_BY_ID,
  type CareerStation,
  type CareerTrack,
  type LevelId,
} from "@/lib/career-paths/data";

const ICONS: Record<CareerTrack["iconKey"], LucideIcon> = {
  flask:       FlaskConical,
  shield:      Shield,
  dna:         Dna,
  stethoscope: Stethoscope,
  briefcase:   Briefcase,
  network:     Network,
};

const LEVEL_ORDER: LevelId[] = ["junior", "mid", "senior", "lead", "vp"];
const LEVEL_META: Record<LevelId, { label: string; years: string; icon: React.ReactNode }> = {
  junior: { label: "Junior",    years: "0–2 yrs",  icon: <Sparkles size={11} /> },
  mid:    { label: "Mid-level", years: "2–5 yrs",  icon: null },
  senior: { label: "Senior",    years: "5–10 yrs", icon: null },
  lead:   { label: "Lead",      years: "10–15 yrs", icon: null },
  vp:     { label: "VP / Exec", years: "15+ yrs",  icon: <Trophy size={11} /> },
};

// ──────────────────────────────────────────────────────────────────
// Top component
// ──────────────────────────────────────────────────────────────────

export function CareerPathsExplorer() {
  return (
    <div className="space-y-6">
      {/* Legend (always wraps) */}
      <Legend />

      {/* The chart — horizontal scroll on narrow viewports */}
      <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
        <div className="min-w-[1180px] pb-4">
          <MindMapRoot />
          <TrackHeadersRow />
          {LEVEL_ORDER.map((level, rowIdx) => (
            <LevelRow
              key={level}
              level={level}
              rowIdx={rowIdx}
              isLast={rowIdx === LEVEL_ORDER.length - 1}
            />
          ))}
        </div>
      </div>

      {/* Catalog hand-off */}
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
// Legend
// ──────────────────────────────────────────────────────────────────

function Legend() {
  return (
    <section className="rounded-xl border border-line/70 bg-card-solid px-5 py-4">
      <p className="text-[10.5px] uppercase tracking-[0.18em] font-bold text-fg mb-2">
        How to read this map
      </p>
      <ul className="grid sm:grid-cols-3 gap-y-1.5 gap-x-4 text-[12px] text-fg-muted leading-relaxed">
        <li className="inline-flex items-baseline gap-2">
          <Sparkles size={11} className="opacity-70 translate-y-[1px]" />
          Six career tracks, five career levels each. Read columns top-to-bottom.
        </li>
        <li className="inline-flex items-baseline gap-2">
          <ArrowDown size={11} className="opacity-70 translate-y-[1px]" />
          Arrows show the typical progression. Education gaps inside each box describe what to learn at that level.
        </li>
        <li className="inline-flex items-baseline gap-2">
          <CornerDownRight size={11} className="opacity-70 translate-y-[1px]" />
          Cross-tree footers mark common branch points where careers fork.
        </li>
      </ul>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────
// Mind-map root + radiating lines into the track headers
// ──────────────────────────────────────────────────────────────────

function MindMapRoot() {
  // The radiating lines are drawn in an absolutely-positioned SVG so
  // the visual is locked to the grid coordinates of the 6 track
  // headers below. We use 6 cubic-bezier paths from the centre of
  // the root box to each track header's horizontal centre.
  const totalCols = CAREER_TRACKS.length;
  return (
    <div className="relative pt-2 pb-6">
      {/* Root node */}
      <div className="flex justify-center">
        <div
          className="relative rounded-full px-5 py-2 bg-card-solid border border-line shadow-card-rest"
        >
          <p className="text-[13px] font-semibold text-fg inline-flex items-center gap-2">
            <Sparkles size={14} className="text-brand-600" />
            Your career journey
          </p>
        </div>
      </div>

      {/* Radiating SVG lines — covers the strip between root and the
          track-headers row. ViewBox stays at 100×40 and each path
          targets the column centre as a percentage. */}
      <svg
        aria-hidden
        className="absolute left-0 right-0 bottom-0 w-full h-12 pointer-events-none"
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
      >
        {CAREER_TRACKS.map((track, i) => {
          const cx = ((i + 0.5) / totalCols) * 100;
          // Cubic bezier: start at top-centre (50, 0), control points
          // pull the line toward the destination's x so the curve
          // bows outward like a mind-map ray.
          const d = `M 50 0 C ${50 + (cx - 50) * 0.35} 16, ${cx} 24, ${cx} 40`;
          return (
            <path
              key={track.id}
              d={d}
              stroke={track.accent}
              strokeWidth="0.6"
              fill="none"
              opacity="0.6"
            />
          );
        })}
      </svg>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Track headers row — one card per track
// ──────────────────────────────────────────────────────────────────

function TrackHeadersRow() {
  return (
    <ol className="grid grid-cols-6 gap-3">
      {CAREER_TRACKS.map((track) => {
        const Icon = ICONS[track.iconKey];
        return (
          <li
            key={track.id}
            className="relative rounded-xl border bg-card-solid px-3 py-2.5 shadow-card-rest"
            style={{
              borderColor: `color-mix(in srgb, ${track.accent} 30%, var(--line))`,
              backgroundImage: `linear-gradient(180deg, color-mix(in srgb, ${track.accent} 10%, var(--card)) 0%, var(--card) 90%)`,
            }}
          >
            <div className="flex items-start gap-2">
              <Icon className="h-4 w-4 shrink-0 mt-0.5" style={{ color: track.accent }} />
              <div className="min-w-0">
                <p className="text-[12.5px] font-semibold text-fg leading-tight">
                  {track.title}
                </p>
                <p className="text-[10.5px] text-fg-muted leading-snug mt-0.5 line-clamp-2">
                  {track.tagline}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// ──────────────────────────────────────────────────────────────────
// One level row — connector arrows + 6 station boxes
// ──────────────────────────────────────────────────────────────────

function LevelRow({
  level, rowIdx, isLast,
}: {
  level: LevelId;
  rowIdx: number;
  isLast: boolean;
}) {
  const meta = LEVEL_META[level];
  return (
    <div className="mt-4">
      {/* SVG arrow connectors from previous row (or from track
          headers, on the first row) — six independent curved arrows,
          one per track column. */}
      <ConnectorRow accents={CAREER_TRACKS.map((t) => t.accent)} />

      {/* Level label band */}
      <div className="flex items-center gap-3 my-3">
        <span
          aria-hidden
          className="flex-1 h-px"
          style={{ background: "linear-gradient(to right, transparent, var(--line) 30%, var(--line) 70%, transparent)" }}
        />
        <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] font-bold text-fg">
          {meta.icon}
          Level {rowIdx + 1} · {meta.label}
          <span className="text-fg-subtle font-normal normal-case tracking-normal ml-1">
            {meta.years}
          </span>
        </span>
        <span
          aria-hidden
          className="flex-1 h-px"
          style={{ background: "linear-gradient(to left, transparent, var(--line) 30%, var(--line) 70%, transparent)" }}
        />
      </div>

      {/* Station boxes — one per track, aligned to the same columns
          as the headers above. */}
      <ol className="grid grid-cols-6 gap-3">
        {CAREER_TRACKS.map((track) => {
          const station = track.stations.find((s) => s.level === level);
          if (!station) return <li key={track.id} />;
          return (
            <li key={track.id}>
              <StationBox station={station} accent={track.accent} index={rowIdx} />
            </li>
          );
        })}
      </ol>

      {/* "Top of the ladder" cap under the VP row */}
      {isLast && (
        <div className="mt-6 flex justify-center">
          <span className="inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.18em] font-bold text-brand-700">
            <Trophy size={12} /> Top of the ladder
          </span>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Connector row — 6 short curved SVG arrows between levels
// ──────────────────────────────────────────────────────────────────

function ConnectorRow({ accents }: { accents: string[] }) {
  // One SVG per column. Each is a small downward-bowed curve with an
  // arrowhead at the bottom, sized to slot between two level rows.
  // We use 6 separate SVGs (grid-aligned) instead of one wide SVG so
  // the layout breathes the same way the boxes do.
  return (
    <div className="grid grid-cols-6 gap-3 h-7">
      {accents.map((accent, i) => (
        <svg
          key={i}
          aria-hidden
          viewBox="0 0 24 28"
          className="mx-auto h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <marker
              id={`arrow-${i}`}
              viewBox="0 0 8 8"
              refX="4"
              refY="4"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M 1 1 L 7 4 L 1 7 z" fill={accent} />
            </marker>
          </defs>
          <path
            d="M 12 0 C 18 8, 6 18, 12 26"
            stroke={accent}
            strokeWidth="1.4"
            fill="none"
            markerEnd={`url(#arrow-${i})`}
            opacity="0.75"
          />
        </svg>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Station box — one cell in the chart
// ──────────────────────────────────────────────────────────────────

function StationBox({
  station, accent, index,
}: {
  station: CareerStation;
  accent: string;
  index: number;
}) {
  const intensity = 30 + index * 17;
  return (
    <article
      className="relative h-full rounded-xl bg-card-solid border border-line overflow-hidden"
      style={{
        boxShadow: "var(--shadow-card-rest)",
        backgroundImage: `linear-gradient(180deg, color-mix(in srgb, ${accent} 5%, transparent) 0%, transparent 50%)`,
      }}
    >
      {/* Accent top strip — opacity scales with seniority so a column
          reads as "growing" as you scan down. */}
      <span
        aria-hidden
        className="absolute top-0 left-0 right-0 h-[3px]"
        style={{ backgroundColor: `color-mix(in srgb, ${accent} ${intensity}%, transparent)` }}
      />
      <div className="p-3">
        {/* Role title — the primary identity of this cell */}
        <p className="text-[12.5px] font-semibold text-fg leading-snug">
          {station.roles[0]}
        </p>
        {station.roles.length > 1 && (
          <p className="text-[10.5px] text-fg-subtle leading-snug">
            +{station.roles.length - 1} similar role{station.roles.length > 2 ? "s" : ""}
          </p>
        )}

        {/* Focus microcopy */}
        <p className="mt-2 text-[11px] text-fg-muted leading-relaxed line-clamp-3">
          {station.focus}
        </p>

        {/* Education gaps */}
        <div className="mt-2.5 border-t border-line/60 pt-2">
          <p className="text-[9.5px] uppercase tracking-[0.16em] font-bold text-fg-subtle mb-1">
            Education gaps
          </p>
          <ul className="space-y-0.5">
            {station.educationGaps.map((g) => (
              <li key={g} className="flex items-start gap-1.5 text-[11px] leading-snug">
                <span
                  aria-hidden
                  className="inline-block w-1 h-1 rounded-full mt-[6.5px] shrink-0"
                  style={{ backgroundColor: accent }}
                />
                <span className="text-fg-muted">{g}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Cross-tree footer — inline annotation pointing at branch
            points. Kept as text rather than SVG cross-arrows so the
            chart's connector graph stays readable; the chip carries
            the "when / why" copy that an SVG curve couldn't. */}
        {station.crossLinks && station.crossLinks.length > 0 && (
          <div className="mt-2 border-t border-line/60 pt-2">
            <p className="text-[9.5px] uppercase tracking-[0.16em] font-bold text-fg-subtle inline-flex items-center gap-1 mb-1">
              <CornerDownRight size={9} className="opacity-70" />
              Cross-tree from here
            </p>
            <ul className="space-y-1">
              {station.crossLinks.map((cl) => {
                const target = TRACK_BY_ID.get(cl.trackId);
                if (!target) return null;
                const TargetIcon = ICONS[target.iconKey];
                return (
                  <li
                    key={cl.trackId + cl.when}
                    className="text-[10px] leading-snug flex items-start gap-1"
                  >
                    <TargetIcon className="h-3 w-3 shrink-0 mt-[1px]" style={{ color: target.accent }} />
                    <span>
                      <span className="font-semibold text-fg">{target.title}</span>
                      <span className="text-fg-subtle"> · {cl.when}</span>
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
