"use client";

/**
 * CareerPathsExplorer — flowchart × mind-map of every career track,
 * with a click-driven "branch out" modal for cross-tree transitions.
 *
 * Interaction
 * ───────────
 *   • Every station box that has cross-tree links shows a small
 *     branch-out icon (GitFork) in its top-right corner. The icon
 *     gently pulses (CSS `careerBranchPulse`) to advertise itself
 *     as interactive.
 *   • Click the icon → a full-screen modal opens with the source
 *     card centred at the top, the target cards arranged below,
 *     and SVG lines growing from source's bottom to each target's
 *     top. Total run-time ~1.1 s end-to-end:
 *
 *         0     ms   backdrop starts fading in
 *       250–550 ms   source card slides + fades in
 *       450 ms       lines start drawing (staggered + 120 ms per line)
 *       750–1100 ms  target cards slide + fade in
 *
 *   • Esc / click on backdrop / click close button → dismiss.
 *   • Other parts of the chart stay underneath the backdrop and
 *     darken as a side-effect (no per-box dimming logic — the
 *     backdrop covers them).
 */

import { useEffect, useMemo, useState } from "react";
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
  GitFork,
  X,
  ChevronDown,
  ChevronRight,
  ChevronsRight,
  ChevronLeft,
  Maximize2,
  Minimize2,
} from "lucide-react";
import {
  BHN_PATHWAYS,
  PATHWAY_BY_ID,
  type CareerStation,
  type CareerTrack,
  type CrossLink,
  type LevelId,
} from "@/lib/career-paths/pathway-data";

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

/** Argument carried up when the user clicks a station's branch-out
 *  icon. Identifies the source station + its parent track. */
interface BranchOpen {
  track: CareerTrack;
  station: CareerStation;
}

/** Carried into BranchModal — original positions of the source +
 *  every target box, captured at click time so the modal can
 *  animate FROM those positions TO the new focused layout. */
interface BranchOpenWithRects extends BranchOpen {
  sourceRect: DOMRect;
  targetRects: Map<string, DOMRect>;  // keyed by `${trackId}-${level}`
}

// ──────────────────────────────────────────────────────────────────
// Top component
// ──────────────────────────────────────────────────────────────────

/** Grid-template helper — produces a CSS gridTemplateColumns string
 *  with collapsed pathways shown as 44 px strips and expanded pathways
 *  flexing within minmax(150 px, 1 fr). Returning the value as a
 *  string lets us drop it straight into inline style on every grid in
 *  the chart (header row, level row, connector row) so they all
 *  stay perfectly aligned. */
function gridTemplateColumns(pathways: { id: string }[], collapsed: Set<string>): string {
  return pathways
    .map((p) => (collapsed.has(p.id) ? "44px" : "minmax(150px, 1fr)"))
    .join(" ");
}

export function PathwayPathsExplorer() {
  const [branch, setBranch] = useState<BranchOpenWithRects | null>(null);

  // Foldability — two independent axes.
  //
  // collapsedLevels — Levels whose station-card row is hidden. The
  //   level-banner strip stays visible (with a chevron) so the user
  //   can still see which level it is and re-expand it.
  // collapsedPathways — Pathways whose column collapses to a thin
  //   44-px vertical strip. The strip shows the pathway icon + a
  //   rotated title and an expand chevron; clicking re-expands the
  //   column to full width.
  const [collapsedLevels, setCollapsedLevels] = useState<Set<LevelId>>(new Set());
  const [collapsedPathways, setCollapsedPathways] = useState<Set<string>>(new Set());

  function toggleLevel(level: LevelId) {
    setCollapsedLevels((prev) => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level); else next.add(level);
      return next;
    });
  }
  function togglePathway(id: string) {
    setCollapsedPathways((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function collapseAllPathways() { setCollapsedPathways(new Set(BHN_PATHWAYS.map((p) => p.id))); }
  function collapseAllLevels()   { setCollapsedLevels(new Set(LEVEL_ORDER)); }
  function expandAll() {
    setCollapsedPathways(new Set());
    setCollapsedLevels(new Set());
  }

  const gridTemplate = gridTemplateColumns(BHN_PATHWAYS, collapsedPathways);

  // Click handler — captures the source station's bounding rect plus
  // every target station's bounding rect from the chart, then hands
  // the bundle off to the modal. The rects let the modal animate
  // from "in the chart" positions to "centered modal" positions
  // (the FLIP technique).
  function handleBranchOpen(o: BranchOpen) {
    const srcId = `${o.track.id}-${o.station.level}`;
    const srcEl = document.querySelector<HTMLElement>(`[data-station-id="${srcId}"]`);
    if (!srcEl) return;
    const sourceRect = srcEl.getBoundingClientRect();

    const targetRects = new Map<string, DOMRect>();
    for (const cl of o.station.crossLinks ?? []) {
      const tgtId = `${cl.trackId}-${cl.targetLevel}`;
      const tgtEl = document.querySelector<HTMLElement>(`[data-station-id="${tgtId}"]`);
      if (tgtEl) targetRects.set(tgtId, tgtEl.getBoundingClientRect());
    }

    setBranch({ ...o, sourceRect, targetRects });
  }

  const anyCollapsed = collapsedLevels.size > 0 || collapsedPathways.size > 0;

  return (
    <div className="space-y-6">
      <Legend />

      {/* Fold toolbar — sits above the chart. Per-level and per-
          pathway fold buttons; an Expand-all reset. */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line/70 bg-card-solid px-4 py-2.5 text-[11.5px]">
        <span className="inline-flex items-center gap-1.5 uppercase tracking-[0.16em] font-bold text-fg-subtle text-[10.5px]">
          <Minimize2 size={11} /> Fold
        </span>
        <button
          type="button"
          onClick={collapseAllPathways}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-fg-muted hover:text-fg hover:bg-elevated transition-colors"
          title="Collapse every pathway column to a thin strip"
        >
          <ChevronsRight size={11} /> Collapse pathways
        </button>
        <button
          type="button"
          onClick={collapseAllLevels}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-fg-muted hover:text-fg hover:bg-elevated transition-colors"
          title="Collapse every level row, keep only the level banners"
        >
          <ChevronDown size={11} /> Collapse levels
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={expandAll}
          disabled={!anyCollapsed}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-brand-700 font-semibold hover:bg-brand-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
        >
          <Maximize2 size={11} /> Expand all
        </button>
      </div>

      <div
        className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6"
        data-career-chart-scroll
      >
        {/* Chart-width policy: 1100 px is the minimum before pathway
            columns squeeze below useful. With 7 pathways at full
            expansion we'd want ~1350 px; once columns start
            collapsing, the inline grid template handles it. So:
            min-w stays modest, the horizontal scroll bar handles
            the overflow case, and collapsing one or two pathways
            brings the chart back into viewport-friendly width. */}
        <div className="relative min-w-[1100px] pb-4">
          <MindMapRoot />
          <TrackHeadersRow
            gridTemplate={gridTemplate}
            collapsedPathways={collapsedPathways}
            togglePathway={togglePathway}
          />
          {LEVEL_ORDER.map((level, rowIdx) => (
            <LevelRow
              key={level}
              level={level}
              rowIdx={rowIdx}
              isLast={rowIdx === LEVEL_ORDER.length - 1}
              onBranchOpen={handleBranchOpen}
              gridTemplate={gridTemplate}
              collapsedLevels={collapsedLevels}
              collapsedPathways={collapsedPathways}
              toggleLevel={toggleLevel}
            />
          ))}
        </div>
      </div>

      <section className="border-t border-line/60 pt-6">
        <p className="text-[12.5px] text-fg-muted leading-relaxed">
          The full course catalog lives on{" "}
          <a href="/courses" className="font-semibold text-brand-700 hover:underline">
            /courses
          </a>
          {" "}— once you&apos;ve spotted the gaps you want to close, head there to find the specific offerings.
        </p>
      </section>

      {/* Branch modal — only mounted when a branch action is active.
          Renders into a portal-like fixed overlay. */}
      {branch && <BranchModal source={branch} onClose={() => setBranch(null)} />}
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
          Each box shows typical roles, focus, and education gaps to close at that level.
        </li>
        <li className="inline-flex items-baseline gap-2">
          <GitFork size={11} className="opacity-70 translate-y-[1px]" />
          A pulsing fork icon on a box means there&apos;s a cross-tree branch — click to explore it.
        </li>
      </ul>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────
// Mind-map root
// ──────────────────────────────────────────────────────────────────

function MindMapRoot() {
  const totalCols = BHN_PATHWAYS.length;
  return (
    <div className="flex flex-col items-center pt-2">
      <div className="rounded-full px-5 py-2 bg-card-solid border border-line shadow-card-rest">
        <p className="text-[13px] font-semibold text-fg inline-flex items-center gap-2">
          <Sparkles size={14} className="text-brand-600" />
          Your career journey
        </p>
      </div>
      <svg
        aria-hidden
        className="w-full h-16 pointer-events-none"
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
      >
        {BHN_PATHWAYS.map((track, i) => {
          const cx = ((i + 0.5) / totalCols) * 100;
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
// Track headers + Level rows
// ──────────────────────────────────────────────────────────────────

function TrackHeadersRow({
  gridTemplate, collapsedPathways, togglePathway,
}: {
  gridTemplate: string;
  collapsedPathways: Set<string>;
  togglePathway: (id: string) => void;
}) {
  return (
    <ol className="grid gap-3" style={{ gridTemplateColumns: gridTemplate }}>
      {BHN_PATHWAYS.map((track) => {
        const Icon = ICONS[track.iconKey];
        const isCollapsed = collapsedPathways.has(track.id);
        return (
          <li
            key={track.id}
            className={
              "relative rounded-xl border bg-card-solid shadow-card-rest " +
              (isCollapsed ? "px-1 py-2 overflow-hidden" : "px-3 py-2.5")
            }
            style={{
              borderColor: `color-mix(in srgb, ${track.accent} 30%, var(--line))`,
              backgroundImage: `linear-gradient(180deg, color-mix(in srgb, ${track.accent} 10%, var(--card)) 0%, var(--card) 90%)`,
            }}
          >
            {isCollapsed ? (
              <button
                type="button"
                onClick={() => togglePathway(track.id)}
                title={`Expand ${track.title}`}
                className="w-full h-full flex flex-col items-center gap-1.5 text-fg hover:text-brand-700"
              >
                <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: track.accent }} />
                {/* Rotated title — written sideways in the thin
                    collapsed strip. writing-mode is the cleanest CSS
                    primitive for this; the Latin glyphs orient
                    sideways which reads top-to-bottom up the column. */}
                <span
                  className="text-[10px] font-semibold tracking-tight whitespace-nowrap leading-none"
                  style={{
                    writingMode: "vertical-rl",
                    transform: "rotate(180deg)",
                    color: track.accent,
                  }}
                >
                  {track.title}
                </span>
                <ChevronLeft size={10} className="opacity-60 mt-auto" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => togglePathway(track.id)}
                  title="Collapse this pathway column"
                  className="absolute top-1 right-1 inline-flex items-center justify-center w-5 h-5 rounded-md text-fg-subtle hover:text-fg hover:bg-elevated"
                  aria-label={`Collapse ${track.title}`}
                >
                  <ChevronsRight size={11} />
                </button>
                <div className="flex items-start gap-2 pr-5">
                  <Icon className="h-4 w-4 shrink-0 mt-0.5" style={{ color: track.accent }} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-[12.5px] font-semibold text-fg leading-tight">
                        {track.title}
                      </p>
                      {track.status === "in-development" && (
                        <span className="inline-flex items-center text-[9px] uppercase tracking-[0.14em] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-900 ring-1 ring-inset ring-amber-200">
                          In dev
                        </span>
                      )}
                    </div>
                    <p className="text-[10.5px] text-fg-muted leading-snug mt-0.5 line-clamp-2">
                      {track.tagline}
                    </p>
                    {/* Sub-programs (Biomanufacturing has 3, QA/QC has 2,
                        single-program streams skip this). Rendered as
                        small chips so users see which BHN training
                        programs feed the stream. */}
                    {track.subPrograms && track.subPrograms.length > 0 && (
                      <ul className="mt-1.5 flex flex-wrap gap-1">
                        {track.subPrograms.map((sp) => (
                          <li
                            key={sp}
                            className="text-[9.5px] leading-none px-1.5 py-0.5 rounded-md font-semibold"
                            style={{
                              color: track.accent,
                              backgroundColor: `color-mix(in srgb, ${track.accent} 12%, var(--card))`,
                            }}
                          >
                            {sp}
                          </li>
                        ))}
                      </ul>
                    )}
                    {/* Delivery-partner footnote. Mirrors what BHN's
                        learning-pathway-announcement page lists. */}
                    {track.deliveredBy && (
                      <p className="mt-1.5 text-[9.5px] italic text-fg-subtle leading-snug">
                        {track.deliveredBy}
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function LevelRow({
  level, rowIdx, isLast, onBranchOpen,
  gridTemplate, collapsedLevels, collapsedPathways, toggleLevel,
}: {
  level: LevelId;
  rowIdx: number;
  isLast: boolean;
  onBranchOpen: (b: BranchOpen) => void;
  gridTemplate: string;
  collapsedLevels: Set<LevelId>;
  collapsedPathways: Set<string>;
  toggleLevel: (level: LevelId) => void;
}) {
  const meta = LEVEL_META[level];
  const isCollapsed = collapsedLevels.has(level);
  return (
    <div className="mt-4">
      {/* Hide the connector arrows when the level is collapsed — the
          banner-with-chevron carries enough visual hint that the row
          is foldable without the arrows competing for attention. */}
      {!isCollapsed && (
        <ConnectorRow
          accents={BHN_PATHWAYS.map((t) => t.accent)}
          gridTemplate={gridTemplate}
          collapsedPathways={collapsedPathways}
        />
      )}

      {/* Clickable level-banner strip — chevron + label. Click anywhere
          on the strip to fold / unfold the row. */}
      <button
        type="button"
        onClick={() => toggleLevel(level)}
        className="my-3 w-full flex items-center gap-3 group"
        aria-expanded={!isCollapsed}
        aria-controls={`level-stations-${level}`}
      >
        <span
          aria-hidden
          className="flex-1 h-px"
          style={{ background: "linear-gradient(to right, transparent, var(--line) 30%, var(--line) 70%, transparent)" }}
        />
        <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] font-bold text-fg group-hover:text-brand-700 transition-colors">
          {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
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
      </button>

      {!isCollapsed && (
        <ol
          id={`level-stations-${level}`}
          className="grid gap-3"
          style={{ gridTemplateColumns: gridTemplate }}
        >
          {BHN_PATHWAYS.map((track) => {
            const station = track.stations.find((s) => s.level === level);
            // Collapsed pathway column: render a thin empty placeholder
            // so the grid stays aligned and the connector arrows above
            // line up with their (visible) columns. A dashed border
            // keeps the column readable as "still there, just folded".
            if (collapsedPathways.has(track.id)) {
              return (
                <li
                  key={track.id}
                  aria-hidden
                  className="border border-dashed rounded-lg"
                  style={{ borderColor: `color-mix(in srgb, ${track.accent} 25%, var(--line))` }}
                />
              );
            }
            if (!station) return <li key={track.id} />;
            return (
              <li key={track.id}>
                <StationBox
                  station={station}
                  accent={track.accent}
                  index={rowIdx}
                  track={track}
                  onBranchOpen={onBranchOpen}
                />
              </li>
            );
          })}
        </ol>
      )}

      {isLast && !isCollapsed && (
        <div className="mt-6 flex justify-center">
          <span className="inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.18em] font-bold text-brand-700">
            <Trophy size={12} /> Top of the ladder
          </span>
        </div>
      )}
    </div>
  );
}

function ConnectorRow({
  accents, gridTemplate, collapsedPathways,
}: {
  accents: string[];
  gridTemplate: string;
  collapsedPathways: Set<string>;
}) {
  return (
    <div className="grid gap-3 h-7" style={{ gridTemplateColumns: gridTemplate }}>
      {accents.map((accent, i) => {
        const pathwayId = BHN_PATHWAYS[i]?.id;
        // Skip drawing the swoopy connector inside collapsed columns —
        // the column itself is only 44 px wide so the arrow would look
        // out of place. Render an empty cell so the grid keeps its
        // column count.
        if (pathwayId && collapsedPathways.has(pathwayId)) {
          return <div key={i} aria-hidden />;
        }
        return (
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
        );
      })}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Station box — one node in the chart. Adds a branch-out icon
// button when the station has cross-tree links.
// ──────────────────────────────────────────────────────────────────

function StationBox({
  station, accent, index, track, onBranchOpen,
}: {
  station: CareerStation;
  accent: string;
  index: number;
  track: CareerTrack;
  onBranchOpen: (b: BranchOpen) => void;
}) {
  const intensity = 30 + index * 17;
  const crossLinks = station.crossLinks ?? [];
  const hasCrossLinks = crossLinks.length > 0;
  // The id is what BranchModal's rect-capture lookup keys off when
  // the branch icon is clicked. Without it, the modal can't find
  // the original chart positions of source + target to animate from.
  const stationId = `${track.id}-${station.level}`;
  return (
    <article
      data-station-id={stationId}
      className="relative h-full rounded-xl bg-card-solid border border-line overflow-hidden"
      style={{
        boxShadow: "var(--shadow-card-rest)",
        backgroundImage: `linear-gradient(180deg, color-mix(in srgb, ${accent} 5%, transparent) 0%, transparent 50%)`,
      }}
    >
      <span
        aria-hidden
        className="absolute top-0 left-0 right-0 h-[3px]"
        style={{ backgroundColor: `color-mix(in srgb, ${accent} ${intensity}%, transparent)` }}
      />

      {/* Branch-out pill — bottom-right. Compact pill (icon + tiny
          label + count) so the user knows what the button does
          without it eating the box. Subtle infinite pulse advertises
          interactivity. */}
      {hasCrossLinks && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onBranchOpen({ track, station });
          }}
          aria-label={`Show ${crossLinks.length} branch transition${crossLinks.length > 1 ? "s" : ""} from ${station.label}`}
          title={`Show ${crossLinks.length} branch transition${crossLinks.length > 1 ? "s" : ""}`}
          className="absolute bottom-2 right-2 z-20 inline-flex items-center gap-1 cursor-pointer rounded-full px-2 py-0.5 transition-transform hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
          style={{
            backgroundColor: `color-mix(in srgb, ${accent} 18%, var(--card))`,
            color: accent,
            border: `1px solid color-mix(in srgb, ${accent} 40%, transparent)`,
            animation: "careerBranchPulse 2.4s ease-in-out infinite",
            pointerEvents: "auto",
          }}
        >
          <GitFork size={10} />
          <span className="text-[10px] font-bold uppercase tracking-wider leading-none">
            Branch
          </span>
          {crossLinks.length > 1 && (
            <span
              aria-hidden
              className="inline-flex items-center justify-center min-w-[14px] h-[14px] px-1 rounded-full text-[9px] font-bold leading-none"
              style={{ backgroundColor: accent, color: "white" }}
            >
              {crossLinks.length}
            </span>
          )}
        </button>
      )}

      {/* Bottom padding clears the floating branch-out button so the
          last education-gap line doesn't slide under it. */}
      <div className={"p-3 " + (hasCrossLinks ? "pb-10" : "")}>
        <p className="text-[12.5px] font-semibold text-fg leading-snug">
          {station.roles[0]}
        </p>
        {station.roles.length > 1 && (
          <p className="text-[10.5px] text-fg-subtle leading-snug">
            +{station.roles.length - 1} similar role{station.roles.length > 2 ? "s" : ""}
          </p>
        )}

        <p className="mt-2 text-[11px] text-fg-muted leading-relaxed line-clamp-3">
          {station.focus}
        </p>

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
      </div>
    </article>
  );
}

// ──────────────────────────────────────────────────────────────────
// Branch modal — staged animation
// ──────────────────────────────────────────────────────────────────
//
// The user wanted a gracefully-sequenced reveal:
//   1. Darken the background.
//   2. Highlight the source + target cards (still at their original
//      chart positions).
//   3. Draw the connecting lines from source → each target.
//   4. Move the cards from their original positions to a centred
//      "focused layout".
//
// Implementation — a 5-stage state machine driven by setTimeout.
// Each stage drives different visual behaviours: backdrop opacity,
// per-card highlight, line draw, and finally the position + size
// FLIP into the focused layout. Card content stays at full detail
// throughout; `overflow: hidden` + an animated width/height means
// the small initial state reveals progressively more content as the
// card grows during the move.

// Staged FLIP animation with explicit hold-times between visual
// events so the user can SEE each stage. Sequence:
//
//   darken    →  highlight  →  lines     →  moving    →  settled
//   backdrop      glow ramps   SVG draws    cards FLIP   final UI
//   fades in      on source +  source→tgt   from chart   ready,
//   (300 ms)      target,      at CHART     pos+size to  Esc hint
//                 OTHER chart  positions    focused      visible
//                 cards stay   (700 ms)     positions
//                 dim under                 (800 ms),
//                 backdrop;                 content
//                 HOLD ~800ms              crossfades
//                 here                      compact →
//                                           expanded
type Stage = "darken" | "highlight" | "lines" | "moving" | "settled";

const STAGE_TIMINGS: Record<Stage, number> = {
  darken:    0,    // backdrop starts fading in
  highlight: 350,  // backdrop in, glow ramps up on source + targets
  lines:     1500, // ~800 ms hold so the user sees what's highlighted
  moving:    2300, // lines have ~800 ms to draw
  settled:   3100, // cards have ~800 ms to move + content crossfade
};

interface TargetData {
  cl: CrossLink;
  track: CareerTrack;
  station: CareerStation;
  /** Original chart rect, viewport-relative. The starting position
   *  of the FLIP animation. */
  fromRect: DOMRect;
}

function BranchModal({
  source, onClose,
}: {
  source: BranchOpenWithRects;
  onClose: () => void;
}) {
  // Resolve target tracks + stations once per source. useMemo gives
  // the array a stable reference across re-renders (without it the
  // modal previously hung in a render loop).
  const targets: TargetData[] = useMemo(() => {
    return (source.station.crossLinks ?? [])
      .map((cl) => {
        const track = PATHWAY_BY_ID.get(cl.trackId);
        const station = track?.stations.find((s) => s.level === cl.targetLevel);
        const fromRect = source.targetRects.get(`${cl.trackId}-${cl.targetLevel}`);
        return track && station && fromRect ? { cl, track, station, fromRect } : null;
      })
      .filter((t): t is TargetData => t !== null);
  }, [source]);

  // Stage progression. Each entry in STAGE_TIMINGS gets its own
  // setTimeout to flip the stage at the right moment.
  const [stage, setStage] = useState<Stage>("darken");
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const stages: Stage[] = ["highlight", "lines", "moving", "settled"];
    for (const s of stages) {
      timers.push(setTimeout(() => setStage(s), STAGE_TIMINGS[s]));
    }
    return () => { for (const t of timers) clearTimeout(t); };
  }, []);

  // Esc to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Lock body scroll while the modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Compute the "to" positions — where the cards will land in the
  // focused layout. Recompute on viewport resize.
  const [viewport, setViewport] = useState(() => ({
    w: typeof window !== "undefined" ? window.innerWidth : 1280,
    h: typeof window !== "undefined" ? window.innerHeight : 800,
  }));
  useEffect(() => {
    const update = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const layout = useMemo(() => computeFocusLayout(targets.length, viewport), [targets.length, viewport]);

  // Visibility flags driven by the stage state machine.
  const linesActive = stage === "lines" || stage === "moving" || stage === "settled";

  return (
    <div className="fixed inset-0 z-[100] pointer-events-auto">
      {/* Backdrop — fades in over 300 ms; click to dismiss */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300"
        style={{ opacity: stage === "darken" ? 0 : 1 }}
        onClick={onClose}
        aria-hidden
      />

      {/* Close button — fades in alongside the cards */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="fixed top-4 right-4 z-[110] inline-flex items-center justify-center w-10 h-10 rounded-full bg-white text-fg hover:bg-elevated shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 transition-opacity duration-300"
        style={{ opacity: stage === "darken" ? 0 : 1 }}
      >
        <X size={18} />
      </button>

      {/* SOURCE — starts at its chart-box position (cloned above the
          backdrop) with compact content, glow ramps in during
          highlight, then animates to focused layout + content
          crossfades to BigStationCard. */}
      <FlipCard
        fromRect={source.sourceRect}
        toRect={layout.source}
        stage={stage}
        accent={source.track.accent}
        zBoost={1}
        compact={
          <CompactCardContent
            station={source.station}
            accent={source.track.accent}
          />
        }
      >
        <BigStationCard
          station={source.station}
          track={source.track}
          label="Where you are"
          Icon={ICONS[source.track.iconKey]}
        />
      </FlipCard>

      {/* TARGETS — same FLIP path from their chart-box positions to
          the focused row below the source. */}
      {targets.map((t, i) => (
        <FlipCard
          key={`${t.track.id}-${t.station.level}`}
          fromRect={t.fromRect}
          toRect={layout.targets[i]}
          stage={stage}
          accent={t.track.accent}
          moveDelayMs={i * 80}
          zBoost={1}
          compact={
            <CompactCardContent
              station={t.station}
              accent={t.track.accent}
            />
          }
        >
          <BigStationCard
            station={t.station}
            track={t.track}
            label="Where you'd land"
            Icon={ICONS[t.track.iconKey]}
            crossLink={t.cl}
          />
        </FlipCard>
      ))}

      {/* SVG lines — anchored to whichever rect set is current.
          During the "lines" stage they draw between the CHART
          positions (source.sourceRect → each target.fromRect). When
          stage flips to "moving", they smoothly re-anchor to the
          focused-layout endpoints (the CSS path-data transition
          keeps the lines glued to the moving cards). */}
      <BranchLines
        sourceFrom={source.sourceRect}
        sourceTo={layout.source}
        targets={targets.map((t, i) => ({
          fromRect: t.fromRect,
          toRect: layout.targets[i],
          color: t.track.accent,
        }))}
        sourceAccent={source.track.accent}
        active={linesActive}
        cardsMoving={stage === "moving" || stage === "settled"}
      />

      {/* Footer hint — only once the cards have settled */}
      <p
        className="fixed bottom-6 left-1/2 -translate-x-1/2 text-[11.5px] text-white/75 z-[110] transition-opacity duration-300 pointer-events-none"
        style={{ opacity: stage === "settled" ? 1 : 0 }}
      >
        Press <kbd className="px-1.5 py-0.5 rounded bg-white/15 text-white/90 text-[10px] font-mono mx-0.5">Esc</kbd> or click the backdrop to close
      </p>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// FlipCard — fixed-positioned wrapper that animates a card from one
// viewport-relative rect to another using CSS transitions on
// left/top/width/height. The CARD CONTENT inside is rendered at
// full detail; overflow-hidden during the move means the small
// initial size reveals progressively more content as the card
// grows.
// ──────────────────────────────────────────────────────────────────

function FlipCard({
  fromRect, toRect, stage, accent, moveDelayMs = 0, zBoost = 0, compact, children,
}: {
  fromRect: DOMRect | { left: number; top: number; width: number; height: number };
  toRect:   { left: number; top: number; width: number; height: number };
  stage: Stage;
  accent: string;
  /** Targets stagger the move delay so multiple cards don't all
   *  slide in lock-step. Source uses 0. */
  moveDelayMs?: number;
  zBoost?: number;
  /** Chart-box-style content rendered while the card is at its
   *  fromRect dimensions. */
  compact: React.ReactNode;
  /** Full BigStationCard content rendered after the move. */
  children: React.ReactNode;
}) {
  const moving = stage === "moving" || stage === "settled";
  const highlighted = stage !== "darken";
  const rect = moving ? toRect : fromRect;
  return (
    <div
      className="fixed overflow-hidden rounded-xl bg-card-solid pointer-events-auto"
      style={{
        left:   rect.left,
        top:    rect.top,
        width:  rect.width,
        height: rect.height,
        zIndex: 100 + zBoost,
        // Position + size all interpolate together; the highlight
        // ring transitions on its own faster timing.
        transition: `left 800ms cubic-bezier(0.4, 0, 0.2, 1) ${moveDelayMs}ms,
                     top 800ms cubic-bezier(0.4, 0, 0.2, 1) ${moveDelayMs}ms,
                     width 800ms cubic-bezier(0.4, 0, 0.2, 1) ${moveDelayMs}ms,
                     height 800ms cubic-bezier(0.4, 0, 0.2, 1) ${moveDelayMs}ms,
                     box-shadow 350ms ease-out,
                     border-color 350ms ease-out`,
        border: `2px solid ${highlighted ? accent : "var(--line)"}`,
        boxShadow: highlighted
          ? `0 0 0 6px color-mix(in srgb, ${accent} 18%, transparent),
             0 18px 50px color-mix(in srgb, ${accent} 25%, transparent),
             0 8px 24px rgba(0,0,0,0.30)`
          : "var(--shadow-card-rest)",
      }}
    >
      {/* Compact layer — chart-box content, visible while the card
          is at its fromRect dimensions. Fades out as the move
          starts. */}
      <div
        className="absolute inset-0 transition-opacity"
        style={{
          opacity: moving ? 0 : 1,
          transitionDuration: "300ms",
          transitionDelay: moving ? "0ms" : "400ms",
        }}
      >
        {compact}
      </div>
      {/* Expanded layer — full BigStationCard. Fades in 400 ms into
          the move so the card has time to grow first; otherwise the
          big content would overflow the still-small card. */}
      <div
        className="absolute inset-0 transition-opacity"
        style={{
          opacity: moving ? 1 : 0,
          transitionDuration: "400ms",
          transitionDelay: moving ? "400ms" : "0ms",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Compact card content — chart-box-sized preview so the FlipCard
// looks visually identical to the chart's StationBox while it's
// still at its fromRect dimensions.
// ──────────────────────────────────────────────────────────────────

function CompactCardContent({
  station, accent,
}: {
  station: CareerStation;
  accent: string;
}) {
  return (
    <div className="h-full p-3 overflow-hidden">
      <p className="text-[12.5px] font-semibold text-fg leading-snug">
        {station.roles[0]}
      </p>
      {station.roles.length > 1 && (
        <p className="text-[10.5px] text-fg-subtle leading-snug">
          +{station.roles.length - 1} similar role{station.roles.length > 2 ? "s" : ""}
        </p>
      )}
      <p className="mt-2 text-[11px] text-fg-muted leading-relaxed line-clamp-3">
        {station.focus}
      </p>
      <div className="mt-2.5 border-t border-line/60 pt-2">
        <p className="text-[9.5px] uppercase tracking-[0.16em] font-bold text-fg-subtle mb-1">
          Education gaps
        </p>
        <ul className="space-y-0.5">
          {station.educationGaps.slice(0, 4).map((g) => (
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
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// BranchLines — SVG paths between source and each target. Tracks
// card positions through the move animation.
// ──────────────────────────────────────────────────────────────────

function BranchLines({
  sourceFrom, sourceTo, targets, sourceAccent, active, cardsMoving,
}: {
  sourceFrom: DOMRect;
  sourceTo: { left: number; top: number; width: number; height: number };
  targets: Array<{
    fromRect: DOMRect;
    toRect: { left: number; top: number; width: number; height: number };
    color: string;
  }>;
  sourceAccent: string;
  active: boolean;
  cardsMoving: boolean;
}) {
  // Endpoints follow whichever rect set is current — the chart
  // positions during the "lines" stage, then the focused positions
  // once "moving" kicks in. Each endpoint coordinate also has its
  // own CSS transition so the lines smoothly stretch with the
  // cards as they slide into the focused layout.
  const srcRect = cardsMoving ? sourceTo : sourceFrom;
  const srcCx = srcRect.left + srcRect.width / 2;
  const srcBy = srcRect.top + srcRect.height;
  return (
    <svg
      aria-hidden
      className="fixed inset-0 w-full h-full pointer-events-none z-[105]"
    >
      {targets.map((t, i) => {
        const tgt = cardsMoving ? t.toRect : t.fromRect;
        const tgtCx = tgt.left + tgt.width / 2;
        const tgtTy = tgt.top;
        const midY = (srcBy + tgtTy) / 2;
        const d = `M ${srcCx} ${srcBy} C ${srcCx} ${midY}, ${tgtCx} ${midY}, ${tgtCx} ${tgtTy}`;
        const length = Math.hypot(tgtCx - srcCx, tgtTy - srcBy) * 1.4;
        return (
          <g key={i}>
            <path
              d={d}
              stroke={t.color}
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
              style={{
                strokeDasharray: length,
                strokeDashoffset: active ? 0 : length,
                transition: `stroke-dashoffset 700ms cubic-bezier(0.4, 0, 0.2, 1) ${i * 120}ms,
                             d 800ms cubic-bezier(0.4, 0, 0.2, 1)`,
                filter: `drop-shadow(0 0 8px color-mix(in srgb, ${t.color} 55%, transparent))`,
              }}
            />
            <circle
              cx={tgtCx}
              cy={tgtTy}
              r="5"
              fill={t.color}
              stroke="white"
              strokeWidth="1.5"
              style={{
                opacity: active ? 1 : 0,
                transition: `opacity 250ms ease-out ${i * 120 + 600}ms,
                             cx 800ms cubic-bezier(0.4, 0, 0.2, 1),
                             cy 800ms cubic-bezier(0.4, 0, 0.2, 1)`,
              }}
            />
            <circle
              cx={srcCx}
              cy={srcBy}
              r="6"
              fill={sourceAccent}
              stroke="white"
              strokeWidth="2"
              style={{
                opacity: active ? 1 : 0,
                transition: `opacity 250ms ease-out ${i * 120 + 200}ms,
                             cx 800ms cubic-bezier(0.4, 0, 0.2, 1),
                             cy 800ms cubic-bezier(0.4, 0, 0.2, 1)`,
              }}
            />
          </g>
        );
      })}
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────────
// Focused layout — where the source + target cards land
// ──────────────────────────────────────────────────────────────────

interface FocusedRect { left: number; top: number; width: number; height: number }

function computeFocusLayout(
  numTargets: number,
  viewport: { w: number; h: number },
): { source: FocusedRect; targets: FocusedRect[] } {
  // Card dimensions — sized so the full BigStationCard content
  // (now including the "Also at this level" role list) fits without
  // internal scrolling. Source is shorter (no crossLink section);
  // target is taller because the cross-link reason + 4-item learn-
  // first list live in the bottom panel.
  const SRC_W = 380;
  const SRC_H = 460;
  const TGT_W = 340;
  const TGT_H = 660;
  const GAP   = 20;

  // Source — top centre, with a comfortable margin from the top
  // edge so the close button + breadcrumb don't crowd it.
  const sourceTop = Math.max(90, viewport.h / 2 - (SRC_H + GAP + TGT_H) / 2);
  const source: FocusedRect = {
    left: viewport.w / 2 - SRC_W / 2,
    top: sourceTop,
    width: SRC_W,
    height: SRC_H,
  };

  // Targets — row below source. Total row width capped to viewport
  // minus side padding; per-card width may shrink if there are many.
  const cols = Math.max(1, Math.min(numTargets, 3));
  const sidePad = 24;
  const maxRowW = Math.max(TGT_W, viewport.w - 2 * sidePad);
  const effTgtW = Math.min(TGT_W, (maxRowW - GAP * (cols - 1)) / cols);
  const rowW = cols * effTgtW + (cols - 1) * GAP;
  const rowLeft = viewport.w / 2 - rowW / 2;
  const targetsTop = source.top + source.height + GAP * 3;

  const targets: FocusedRect[] = Array.from({ length: numTargets }, (_, i) => ({
    left: rowLeft + i * (effTgtW + GAP),
    top: targetsTop,
    width: effTgtW,
    height: TGT_H,
  }));

  return { source, targets };
}

// ──────────────────────────────────────────────────────────────────
// Big station card — the full-detail version shown in the modal
// ──────────────────────────────────────────────────────────────────

function BigStationCard({
  station, track, label, Icon, crossLink,
}: {
  station: CareerStation;
  track: CareerTrack;
  label: string;
  Icon: LucideIcon;
  /** When present, the card is a "target" card and shows the
   *  transition's reason + learn-first gaps below the station's own
   *  content. */
  crossLink?: CrossLink;
}) {
  // Rendered INSIDE FlipCard's "expanded" layer, which is sized to
  // the FOCUSED dimensions (chosen large enough to fit this content
  // in full). Internal scrolling kept as a safety net for unusually
  // long content, but in normal use the card "expands to accommodate"
  // and no scrolling kicks in.
  return (
    <div
      className="h-full overflow-y-auto"
      style={{
        // Subtle accent-tinted background so the card reads as part
        // of the track even before the glow lights up.
        background: `linear-gradient(180deg, color-mix(in srgb, ${track.accent} 7%, var(--card)) 0%, var(--card) 60%)`,
      }}
    >
      <header
        className="px-4 py-3 border-b"
        style={{
          backgroundImage: `linear-gradient(180deg, color-mix(in srgb, ${track.accent} 14%, var(--card)) 0%, var(--card) 100%)`,
          borderColor: `color-mix(in srgb, ${track.accent} 25%, var(--line))`,
        }}
      >
        <p
          className="text-[10px] uppercase tracking-[0.18em] font-bold"
          style={{ color: track.accent }}
        >
          {label}
        </p>
        <div className="mt-1 inline-flex items-center gap-2">
          <Icon className="h-5 w-5 shrink-0" style={{ color: track.accent }} />
          <h3 className="text-[16px] font-semibold text-fg leading-tight">
            {track.title}
          </h3>
        </div>
        <p className="mt-0.5 text-[11.5px] text-fg-muted">
          {station.label} · {station.yearsRange}
        </p>
      </header>

      <div className="p-4">
        <p className="text-[13.5px] font-semibold text-fg leading-snug">
          {station.roles[0]}
        </p>
        {/* All other roles at this level, listed explicitly. Previous
            "+N similar roles" was ambiguous — now you can see the
            actual titles. */}
        {station.roles.length > 1 && (
          <div className="mt-1.5">
            <p className="text-[9.5px] uppercase tracking-[0.16em] font-bold text-fg-subtle mb-0.5">
              Also at this level
            </p>
            <ul className="space-y-0.5">
              {station.roles.slice(1).map((r) => (
                <li key={r} className="text-[11px] text-fg-muted leading-snug">
                  · {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-2.5 text-[12px] text-fg-muted leading-relaxed">
          {station.focus}
        </p>

        <div className="mt-3 border-t border-line/60 pt-3">
          <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-fg-subtle mb-1.5">
            Education gaps
          </p>
          <ul className="space-y-0.5">
            {station.educationGaps.map((g) => (
              <li key={g} className="flex items-start gap-1.5 text-[11.5px] leading-snug">
                <span
                  aria-hidden
                  className="inline-block w-1 h-1 rounded-full mt-[7px] shrink-0"
                  style={{ backgroundColor: track.accent }}
                />
                <span className="text-fg-muted">{g}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Transition details — only on target cards */}
        {crossLink && (
          <div
            className="mt-4 -mx-1 px-3 py-2.5 rounded-lg"
            style={{
              backgroundColor: `color-mix(in srgb, ${track.accent} 7%, transparent)`,
              border: `1px solid color-mix(in srgb, ${track.accent} 25%, transparent)`,
            }}
          >
            <p
              className="text-[10px] uppercase tracking-[0.18em] font-bold mb-1 inline-flex items-center gap-1"
              style={{ color: track.accent }}
            >
              <CornerDownRight size={10} />
              {crossLink.when}
            </p>
            <p className="text-[11.5px] text-fg-muted leading-relaxed">
              {crossLink.reason}
            </p>
            {crossLink.learningNeeded && crossLink.learningNeeded.length > 0 && (
              <>
                <p className="mt-2 text-[10px] uppercase tracking-[0.16em] font-bold text-fg-subtle mb-1">
                  Learn first
                </p>
                <ul className="space-y-0.5">
                  {crossLink.learningNeeded.map((g) => (
                    <li
                      key={g}
                      className="flex items-start gap-1.5 text-[11px] leading-snug"
                    >
                      <span
                        aria-hidden
                        className="inline-block w-1 h-1 rounded-full mt-[6.5px] shrink-0"
                        style={{ backgroundColor: track.accent }}
                      />
                      <span className="text-fg-muted">{g}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
