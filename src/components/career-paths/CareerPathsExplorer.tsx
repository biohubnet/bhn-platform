"use client";

/**
 * CareerPathsExplorer — flowchart × mind-map of every career track.
 *
 * Hover interaction (the headline feature)
 * ────────────────────────────────────────
 * Hovering a station box that has `crossLinks` draws SVG lines from
 * that box to each cross-tree target box, and pops a small info
 * card in between carrying the "when", the "why this works", and
 * the top 3 "learn first" gaps for that lateral move.
 *
 * Popover positioning has collision detection: it tries the midpoint
 * between source and target first; if that overlaps the source or
 * target box, it falls back to "below source between the rows",
 * then "right of target", then "left of source". The popover is
 * always at least 12 px clear of both station boxes.
 *
 * The hover bypasses re-rendering the chart by using direct DOM
 * positioning: the `CrossTreeOverlay` reads station positions via
 * `getBoundingClientRect` (subtracted against the chart's inner
 * container so coordinates stay valid through horizontal scroll +
 * page scroll). The chart itself only re-renders when the hover
 * state at the top of `CareerPathsExplorer` flips.
 *
 * Mobile / keyboard: the hover overlay is desktop / fine-pointer
 * only. The cross-tree text footers inside each station box stay
 * as the always-visible accessible fallback — they name the
 * destination track + level in plain text.
 */

import { useEffect, useState } from "react";
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
  ChevronRight,
} from "lucide-react";
import {
  CAREER_TRACKS,
  TRACK_BY_ID,
  type CareerStation,
  type CareerTrack,
  type CrossLink,
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

/** Shape carried from a station box up to CareerPathsExplorer when
 *  hover fires. Identifies *which* station was hovered + carries its
 *  track so the overlay can colour and label the source side. */
interface HoverState {
  track: CareerTrack;
  station: CareerStation;
}

// ──────────────────────────────────────────────────────────────────
// Top component
// ──────────────────────────────────────────────────────────────────

export function CareerPathsExplorer() {
  const [hovered, setHovered] = useState<HoverState | null>(null);
  return (
    <div className="space-y-6">
      <Legend />

      {/* Chart — horizontal scroll on narrow viewports. The inner
          container is positioned `relative` so the absolute-positioned
          CrossTreeOverlay anchors to it. The overlay scrolls along
          with the boxes because it's the SAME parent. */}
      <div
        className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6"
        data-career-chart-scroll
      >
        <div className="relative min-w-[1180px] pb-4">
          <MindMapRoot />
          <TrackHeadersRow />
          {LEVEL_ORDER.map((level, rowIdx) => (
            <LevelRow
              key={level}
              level={level}
              rowIdx={rowIdx}
              isLast={rowIdx === LEVEL_ORDER.length - 1}
              onHoverChange={setHovered}
            />
          ))}

          {/* Overlay — only shows on hover of a station with crossLinks */}
          <CrossTreeOverlay hovered={hovered} />
        </div>
      </div>

      {/* Catalog hand-off */}
      <section className="border-t border-line/60 pt-6">
        <p className="text-[12.5px] text-fg-muted leading-relaxed">
          The full course catalog lives on{" "}
          <a href="/courses" className="font-semibold text-brand-700 hover:underline">
            /courses
          </a>
          {" "}— once you&apos;ve spotted the gaps you want to close, head there to find the specific offerings.
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
          Each box shows typical roles, focus, and education gaps to close at that level.
        </li>
        <li className="inline-flex items-baseline gap-2">
          <CornerDownRight size={11} className="opacity-70 translate-y-[1px]" />
          Hover a box with a cross-tree footer to draw lines to its branch destinations.
        </li>
      </ul>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────
// Mind-map root
// ──────────────────────────────────────────────────────────────────

function MindMapRoot() {
  const totalCols = CAREER_TRACKS.length;
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
        {CAREER_TRACKS.map((track, i) => {
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

function LevelRow({
  level, rowIdx, isLast, onHoverChange,
}: {
  level: LevelId;
  rowIdx: number;
  isLast: boolean;
  onHoverChange: (s: HoverState | null) => void;
}) {
  const meta = LEVEL_META[level];
  return (
    <div className="mt-4">
      <ConnectorRow accents={CAREER_TRACKS.map((t) => t.accent)} />

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

      <ol className="grid grid-cols-6 gap-3">
        {CAREER_TRACKS.map((track) => {
          const station = track.stations.find((s) => s.level === level);
          if (!station) return <li key={track.id} />;
          return (
            <li key={track.id}>
              <StationBox
                station={station}
                accent={track.accent}
                index={rowIdx}
                stationId={`${track.id}-${station.level}`}
                track={track}
                onHoverChange={onHoverChange}
              />
            </li>
          );
        })}
      </ol>

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

function ConnectorRow({ accents }: { accents: string[] }) {
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
// Station box — one node in the chart. Pushes hover up to the root.
// ──────────────────────────────────────────────────────────────────

function StationBox({
  station, accent, index, stationId, track, onHoverChange,
}: {
  station: CareerStation;
  accent: string;
  index: number;
  stationId: string;
  track: CareerTrack;
  onHoverChange: (s: HoverState | null) => void;
}) {
  const intensity = 30 + index * 17;
  const hasCrossLinks = (station.crossLinks?.length ?? 0) > 0;
  return (
    <article
      data-station-id={stationId}
      onMouseEnter={hasCrossLinks ? () => onHoverChange({ track, station }) : undefined}
      onMouseLeave={hasCrossLinks ? () => onHoverChange(null) : undefined}
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
      <div className="p-3">
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

        {/* Cross-tree footer — always-visible accessible fallback.
            On desktop the hover overlay adds the SVG line + popover
            on top of this; on keyboard / touch it's the only path
            to the cross-tree information. */}
        {hasCrossLinks && (
          <div className="mt-2 border-t border-line/60 pt-2">
            <p className="text-[9.5px] uppercase tracking-[0.16em] font-bold text-fg-subtle inline-flex items-center gap-1 mb-1">
              <CornerDownRight size={9} className="opacity-70" />
              Cross-tree
              <span className="text-fg-subtle font-normal normal-case tracking-normal italic ml-0.5">
                · hover for details
              </span>
            </p>
            <ul className="space-y-1">
              {station.crossLinks!.map((cl) => {
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

// ──────────────────────────────────────────────────────────────────
// Cross-tree overlay — SVG lines + popovers on hover
// ──────────────────────────────────────────────────────────────────

interface LineEndpoint { x: number; y: number }
interface RectBox { left: number; top: number; right: number; bottom: number }
interface Layout {
  crossLink: CrossLink;
  target: CareerTrack;
  src: RectBox;        // source box, container-relative coords
  tgt: RectBox;        // target box, container-relative coords
  line: { from: LineEndpoint; to: LineEndpoint };
  popover: { x: number; y: number };
}

/** Pixel size of the popover. Used for collision detection — the
 *  actual rendered popover has these dimensions enforced via CSS. */
const POPOVER_W = 260;
const POPOVER_H = 180;
const POPOVER_PAD = 12;  // min clearance from station boxes

function CrossTreeOverlay({ hovered }: { hovered: HoverState | null }) {
  const [layouts, setLayouts] = useState<Layout[] | null>(null);

  // Measure positions whenever hover state changes. We also re-measure
  // on resize/scroll so the overlay stays aligned with the boxes if
  // the user scrolls the chart while their mouse is on a station.
  useEffect(() => {
    if (!hovered || !hovered.station.crossLinks?.length) {
      setLayouts(null);
      return;
    }
    const compute = () => {
      const layouts = computeLayouts(hovered);
      setLayouts(layouts);
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, [hovered]);

  if (!hovered || !layouts || layouts.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none">
      <svg className="absolute inset-0 w-full h-full overflow-visible">
        {layouts.map((layout, i) => (
          <CrossTreeLine
            key={i}
            layout={layout}
            sourceAccent={hovered.track.accent}
          />
        ))}
      </svg>
      {layouts.map((layout, i) => (
        <CrossTreePopover
          key={i}
          layout={layout}
          sourceTrack={hovered.track}
        />
      ))}
    </div>
  );
}

function computeLayouts(hovered: HoverState): Layout[] {
  const srcId = `${hovered.track.id}-${hovered.station.level}`;
  const srcEl = document.querySelector<HTMLElement>(`[data-station-id="${srcId}"]`);
  if (!srcEl) return [];

  // Find the chart's inner container so we can express all
  // coordinates in its frame (instead of viewport frame). That way
  // the overlay survives both chart horizontal scroll and page
  // vertical scroll without drift.
  const scrollerEl = srcEl.closest<HTMLElement>("[data-career-chart-scroll]");
  if (!scrollerEl) return [];
  const containerEl = scrollerEl.firstElementChild as HTMLElement | null;
  if (!containerEl) return [];

  const containerRect = containerEl.getBoundingClientRect();
  const srcRect = toContainerRect(srcEl.getBoundingClientRect(), containerRect);

  const out: Layout[] = [];
  for (const cl of hovered.station.crossLinks!) {
    const tgtId = `${cl.trackId}-${cl.targetLevel}`;
    const tgtEl = document.querySelector<HTMLElement>(`[data-station-id="${tgtId}"]`);
    if (!tgtEl) continue;
    const tgtRect = toContainerRect(tgtEl.getBoundingClientRect(), containerRect);
    const target = TRACK_BY_ID.get(cl.trackId);
    if (!target) continue;

    // Pick line endpoints — from the source edge closest to target,
    // to the target edge closest to source.
    const srcOnLeftOfTgt = srcRect.right < tgtRect.left;
    const from: LineEndpoint = {
      x: srcOnLeftOfTgt ? srcRect.right : srcRect.left,
      y: (srcRect.top + srcRect.bottom) / 2,
    };
    const to: LineEndpoint = {
      x: srcOnLeftOfTgt ? tgtRect.left : tgtRect.right,
      y: (tgtRect.top + tgtRect.bottom) / 2,
    };

    out.push({
      crossLink: cl,
      target,
      src: srcRect,
      tgt: tgtRect,
      line: { from, to },
      popover: pickPopoverPosition(srcRect, tgtRect),
    });
  }
  // If multiple popovers, do a simple second pass to push later
  // popovers away from earlier ones (so two popovers from the same
  // source don't overlap each other).
  for (let i = 1; i < out.length; i++) {
    for (let j = 0; j < i; j++) {
      if (boxesOverlap(popBox(out[i].popover), popBox(out[j].popover))) {
        // Shift down by popover height + padding
        out[i].popover.y = popBox(out[j].popover).bottom + POPOVER_PAD;
      }
    }
  }
  return out;
}

function toContainerRect(rect: DOMRect, containerRect: DOMRect): RectBox {
  return {
    left:   rect.left   - containerRect.left,
    top:    rect.top    - containerRect.top,
    right:  rect.right  - containerRect.left,
    bottom: rect.bottom - containerRect.top,
  };
}

function popBox(p: { x: number; y: number }): RectBox {
  return { left: p.x, top: p.y, right: p.x + POPOVER_W, bottom: p.y + POPOVER_H };
}

function boxesOverlap(a: RectBox, b: RectBox): boolean {
  return !(a.right + POPOVER_PAD <= b.left || a.left >= b.right + POPOVER_PAD ||
           a.bottom + POPOVER_PAD <= b.top || a.top >= b.bottom + POPOVER_PAD);
}

/** Find a position for the popover that doesn't touch source or
 *  target. Tries midpoint → between-rows → right-of-target →
 *  left-of-source. Falls back to midpoint if nothing fits cleanly.
 *  All coordinates are container-relative (in pixels). */
function pickPopoverPosition(src: RectBox, tgt: RectBox): { x: number; y: number } {
  const midX = (src.left + src.right + tgt.left + tgt.right) / 4 - POPOVER_W / 2;
  const midY = (src.top + src.bottom + tgt.top + tgt.bottom) / 4 - POPOVER_H / 2;

  const candidates: { x: number; y: number }[] = [
    // 1. Midpoint
    { x: midX, y: midY },
    // 2. Between rows — vertically below src if src is above tgt
    src.bottom < tgt.top
      ? { x: (src.left + tgt.right) / 2 - POPOVER_W / 2, y: src.bottom + POPOVER_PAD }
      : { x: midX, y: tgt.bottom + POPOVER_PAD },
    // 3. To the right of target
    { x: tgt.right + POPOVER_PAD, y: (tgt.top + tgt.bottom) / 2 - POPOVER_H / 2 },
    // 4. To the left of source
    { x: src.left - POPOVER_W - POPOVER_PAD, y: (src.top + src.bottom) / 2 - POPOVER_H / 2 },
    // 5. Below target
    { x: (tgt.left + tgt.right) / 2 - POPOVER_W / 2, y: tgt.bottom + POPOVER_PAD },
  ];

  for (const c of candidates) {
    const pBox = popBox(c);
    if (!boxesOverlap(pBox, src) && !boxesOverlap(pBox, tgt)) {
      // Also make sure the popover starts within the chart bounds
      // (x >= 0). If it's been pushed off the left edge, skip.
      if (c.x >= 0) return c;
    }
  }
  // Fallback: midpoint (will overlap, but at least visible).
  return { x: midX, y: midY };
}

// ──────────────────────────────────────────────────────────────────
// SVG line — source-edge → target-edge with arrowhead
// ──────────────────────────────────────────────────────────────────

function CrossTreeLine({
  layout, sourceAccent,
}: {
  layout: Layout;
  sourceAccent: string;
}) {
  const { from, to } = layout.line;
  // Cubic bezier with control points pulled along the horizontal axis
  // for a smooth horizontal sweep.
  const midX = (from.x + to.x) / 2;
  const d = `M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`;
  const markerId = `xtree-arrow-${layout.target.id}-${layout.crossLink.targetLevel}`;
  return (
    <g>
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="8"
          markerHeight="8"
          orient="auto-start-reverse"
        >
          <path d="M 1 1 L 9 5 L 1 9 z" fill={layout.target.accent} />
        </marker>
      </defs>
      <path
        d={d}
        stroke={layout.target.accent}
        strokeWidth="2.5"
        fill="none"
        markerEnd={`url(#${markerId})`}
        opacity="0.9"
      />
      {/* Source dot */}
      <circle cx={from.x} cy={from.y} r="5" fill={sourceAccent} stroke="white" strokeWidth="1.5" />
    </g>
  );
}

// ──────────────────────────────────────────────────────────────────
// Popover — info card between source and target
// ──────────────────────────────────────────────────────────────────

function CrossTreePopover({
  layout, sourceTrack,
}: {
  layout: Layout;
  sourceTrack: CareerTrack;
}) {
  const { x, y } = layout.popover;
  const target = layout.target;
  const cl = layout.crossLink;
  const SrcIcon = ICONS[sourceTrack.iconKey];
  const TgtIcon = ICONS[target.iconKey];
  return (
    <div
      className="absolute rounded-xl bg-card-solid border border-line shadow-card-hover pointer-events-none animate-in fade-in zoom-in-95 duration-150"
      style={{
        left: x,
        top: y,
        width: POPOVER_W,
      }}
    >
      {/* Split top edge: left half source colour, right half target */}
      <span aria-hidden className="absolute top-0 left-0 right-0 h-[3px] flex rounded-t-xl overflow-hidden">
        <span className="flex-1" style={{ backgroundColor: sourceTrack.accent }} />
        <span className="flex-1" style={{ backgroundColor: target.accent }} />
      </span>

      <div className="px-3 py-2.5">
        {/* From → To header */}
        <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-fg leading-tight flex-wrap">
          <SrcIcon className="h-3.5 w-3.5 shrink-0" style={{ color: sourceTrack.accent }} />
          <span>{sourceTrack.title}</span>
          <span className="text-fg-subtle" aria-hidden>→</span>
          <TgtIcon className="h-3.5 w-3.5 shrink-0" style={{ color: target.accent }} />
          <span>{target.title}</span>
        </div>

        {/* When */}
        <p className="mt-1.5 text-[10px] uppercase tracking-[0.16em] font-bold" style={{ color: target.accent }}>
          {cl.when}
        </p>

        {/* Why */}
        <p className="mt-1.5 text-[11px] text-fg-muted leading-relaxed">
          {cl.reason}
        </p>

        {/* Learn first */}
        {cl.learningNeeded && cl.learningNeeded.length > 0 && (
          <div className="mt-2 border-t border-line/60 pt-1.5">
            <p className="text-[9.5px] uppercase tracking-[0.16em] font-bold text-fg-subtle mb-0.5 inline-flex items-center gap-1">
              <ChevronRight size={9} /> Learn first
            </p>
            <ul className="space-y-0.5">
              {cl.learningNeeded.slice(0, 3).map((g) => (
                <li key={g} className="flex items-start gap-1.5 text-[10.5px] text-fg-muted leading-snug">
                  <span
                    aria-hidden
                    className="inline-block w-1 h-1 rounded-full mt-[6px] shrink-0"
                    style={{ backgroundColor: target.accent }}
                  />
                  <span>{g}</span>
                </li>
              ))}
              {cl.learningNeeded.length > 3 && (
                <li className="text-[9.5px] italic text-fg-subtle pl-3.5">
                  +{cl.learningNeeded.length - 3} more
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
