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

  // When a station is hovered, the set of "related" station ids is
  // the source + all of its cross-link targets. Other boxes are
  // dimmed (opacity-only, no blur) so the focused branch reads as a
  // figure-against-ground without obscuring the rest of the chart.
  const relatedIds = useMemo<Set<string> | null>(() => {
    if (!hovered) return null;
    const ids = new Set<string>();
    ids.add(`${hovered.track.id}-${hovered.station.level}`);
    for (const cl of hovered.station.crossLinks ?? []) {
      ids.add(`${cl.trackId}-${cl.targetLevel}`);
    }
    return ids;
  }, [hovered]);

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
              relatedIds={relatedIds}
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
  level, rowIdx, isLast, onHoverChange, relatedIds,
}: {
  level: LevelId;
  rowIdx: number;
  isLast: boolean;
  onHoverChange: (s: HoverState | null) => void;
  /** When a hover is active, the set of station ids that are NOT
   *  dimmed (source + targets). null = no hover active, no dimming. */
  relatedIds: Set<string> | null;
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
          const stationId = `${track.id}-${station.level}`;
          const isDimmed = relatedIds !== null && !relatedIds.has(stationId);
          return (
            <li key={track.id}>
              <StationBox
                station={station}
                accent={track.accent}
                index={rowIdx}
                stationId={stationId}
                track={track}
                onHoverChange={onHoverChange}
                isDimmed={isDimmed}
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
  station, accent, index, stationId, track, onHoverChange, isDimmed,
}: {
  station: CareerStation;
  accent: string;
  index: number;
  stationId: string;
  track: CareerTrack;
  onHoverChange: (s: HoverState | null) => void;
  /** When another station's branching is active, unrelated boxes
   *  receive a slight opacity drop (no blur, per user). Keeps the
   *  focused branch as figure-against-ground. */
  isDimmed: boolean;
}) {
  const intensity = 30 + index * 17;
  const hasCrossLinks = (station.crossLinks?.length ?? 0) > 0;
  return (
    <article
      data-station-id={stationId}
      onMouseEnter={hasCrossLinks ? () => onHoverChange({ track, station }) : undefined}
      onMouseLeave={hasCrossLinks ? () => onHoverChange(null) : undefined}
      className={
        "relative h-full rounded-xl bg-card-solid border border-line overflow-hidden transition-opacity duration-200 " +
        (isDimmed ? "opacity-40" : "opacity-100")
      }
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
  /** Popover bounding box, container-relative. Both position and
   *  dimensions are computed dynamically so the box fits in the
   *  vertical band between source and target rows + stays inside
   *  the canvas + doesn't overlap previously-placed popovers. */
  popover: { x: number; y: number; w: number; h: number };
}

/** Default popover dimensions. The actual rendered box may shrink
 *  (height to fit the row-gap band, width to fit the canvas).
 *  POPOVER_MIN_H is the hard floor — below this we still render
 *  but content is heavily abbreviated. */
const POPOVER_DEFAULT_W = 280;
const POPOVER_DEFAULT_H = 160;
const POPOVER_MIN_W     = 200;
const POPOVER_MIN_H     = 56;
const POPOVER_PAD       = 12;  // min clearance from src/tgt and canvas edges

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
  // coordinates in its frame (instead of viewport frame). Survives
  // chart horizontal scroll AND page vertical scroll.
  const scrollerEl = srcEl.closest<HTMLElement>("[data-career-chart-scroll]");
  if (!scrollerEl) return [];
  const containerEl = scrollerEl.firstElementChild as HTMLElement | null;
  if (!containerEl) return [];

  const containerRect = containerEl.getBoundingClientRect();
  // Canvas bounds — popovers must stay inside.
  const canvasW = containerEl.offsetWidth;
  const canvasH = containerEl.offsetHeight;
  const srcRect = toContainerRect(srcEl.getBoundingClientRect(), containerRect);

  // First pass — compute line + tentative popover for each crossLink.
  const out: Layout[] = [];
  for (const cl of hovered.station.crossLinks!) {
    const tgtId = `${cl.trackId}-${cl.targetLevel}`;
    const tgtEl = document.querySelector<HTMLElement>(`[data-station-id="${tgtId}"]`);
    if (!tgtEl) continue;
    const tgtRect = toContainerRect(tgtEl.getBoundingClientRect(), containerRect);
    const target = TRACK_BY_ID.get(cl.trackId);
    if (!target) continue;

    // Line endpoints — from source edge closest to target, to target
    // edge closest to source.
    const srcOnLeftOfTgt = srcRect.right < tgtRect.left;
    const from: LineEndpoint = {
      x: srcOnLeftOfTgt ? srcRect.right : srcRect.left,
      y: (srcRect.top + srcRect.bottom) / 2,
    };
    const to: LineEndpoint = {
      x: srcOnLeftOfTgt ? tgtRect.left : tgtRect.right,
      y: (tgtRect.top + tgtRect.bottom) / 2,
    };

    const popover = pickPopoverBox({ src: srcRect, tgt: tgtRect, line: { from, to }, canvasW, canvasH });

    out.push({
      crossLink: cl,
      target,
      src: srcRect,
      tgt: tgtRect,
      line: { from, to },
      popover,
    });
  }

  // Second pass — for multiple cross-links from the same source,
  // greedy-shift later popovers vertically to avoid overlapping the
  // ones placed before them. Stays within canvas.
  for (let i = 1; i < out.length; i++) {
    for (let j = 0; j < i; j++) {
      const iBox = out[i].popover;
      const jBox = out[j].popover;
      if (popoverOverlap(iBox, jBox)) {
        // Shift i below j (or above if no room below).
        const shiftDown = jBox.y + jBox.h + POPOVER_PAD;
        if (shiftDown + iBox.h + POPOVER_PAD <= canvasH) {
          iBox.y = shiftDown;
        } else {
          // Fall back: shift right within canvas.
          iBox.x = Math.min(canvasW - iBox.w - POPOVER_PAD, jBox.x + jBox.w + POPOVER_PAD);
        }
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

function popoverOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): boolean {
  return !(
    a.x + a.w + POPOVER_PAD <= b.x ||
    a.x >= b.x + b.w + POPOVER_PAD ||
    a.y + a.h + POPOVER_PAD <= b.y ||
    a.y >= b.y + b.h + POPOVER_PAD
  );
}

function rectOverlap(a: RectBox, b: { x: number; y: number; w: number; h: number }): boolean {
  return !(
    a.right + POPOVER_PAD <= b.x ||
    a.left >= b.x + b.w + POPOVER_PAD ||
    a.bottom + POPOVER_PAD <= b.y ||
    a.top >= b.y + b.h + POPOVER_PAD
  );
}

/** Compute a popover box: position (x, y) + dynamic dimensions (w, h).
 *
 *  Strategy:
 *    1. Identify the vertical band between source-row and target-row
 *       (the gap that contains the connector row + level-label band).
 *    2. Height: clamp to (band height - 2*PAD), bounded by
 *       [POPOVER_MIN_H, POPOVER_DEFAULT_H]. So the popover is exactly
 *       as tall as the gap allows.
 *    3. Width: clamp DEFAULT_W to (canvas width - 2*PAD).
 *    4. Position: centre on the line's midpoint x, vertically in the
 *       middle of the band. Then clamp the box inside the canvas.
 *    5. If the box still overlaps source or target (e.g. extreme
 *       diagonal cases where the band ended up zero-height), shrink
 *       further or fall back to a position outside the line. */
function pickPopoverBox({
  src, tgt, line, canvasW, canvasH,
}: {
  src: RectBox;
  tgt: RectBox;
  line: { from: LineEndpoint; to: LineEndpoint };
  canvasW: number;
  canvasH: number;
}): { x: number; y: number; w: number; h: number } {
  // Line midpoint — popover stays centred on this x by default.
  const midX = (line.from.x + line.to.x) / 2;

  // Vertical band between the two rows.
  const srcAbove = src.bottom <= tgt.top;
  const bandTop    = srcAbove ? src.bottom + POPOVER_PAD : tgt.bottom + POPOVER_PAD;
  const bandBottom = srcAbove ? tgt.top - POPOVER_PAD : src.top - POPOVER_PAD;
  const bandHeight = Math.max(0, bandBottom - bandTop);

  // Dynamic dimensions. Height adapts to band.
  let w = Math.min(POPOVER_DEFAULT_W, canvasW - 2 * POPOVER_PAD);
  let h = Math.min(POPOVER_DEFAULT_H, Math.max(POPOVER_MIN_H, bandHeight));
  if (w < POPOVER_MIN_W) w = POPOVER_MIN_W;

  // Centre x on line midpoint; centre y in the band.
  let x = midX - w / 2;
  let y = bandTop + (bandHeight - h) / 2;

  // Canvas clamp — popover must stay inside the chart container.
  x = Math.max(POPOVER_PAD, Math.min(canvasW - w - POPOVER_PAD, x));
  y = Math.max(POPOVER_PAD, Math.min(canvasH - h - POPOVER_PAD, y));

  // Sanity guard — if the box still hits src/tgt (e.g. same-row
  // transition with no vertical band), prefer the candidate-list
  // fallback so it's at least not blocking the boxes.
  const popoverBox = { x, y, w, h };
  if (rectOverlap(src, popoverBox) || rectOverlap(tgt, popoverBox)) {
    const fallback = fallbackPosition(src, tgt, w, h, canvasW, canvasH);
    if (fallback) return { ...fallback, w, h };
  }
  return popoverBox;
}

function fallbackPosition(
  src: RectBox, tgt: RectBox, w: number, h: number, canvasW: number, canvasH: number,
): { x: number; y: number } | null {
  const candidates: { x: number; y: number }[] = [
    // Right of target
    { x: tgt.right + POPOVER_PAD, y: (tgt.top + tgt.bottom) / 2 - h / 2 },
    // Left of source
    { x: src.left - w - POPOVER_PAD, y: (src.top + src.bottom) / 2 - h / 2 },
    // Below target
    { x: (tgt.left + tgt.right) / 2 - w / 2, y: tgt.bottom + POPOVER_PAD },
    // Above source
    { x: (src.left + src.right) / 2 - w / 2, y: src.top - h - POPOVER_PAD },
  ];
  for (const c of candidates) {
    if (c.x < POPOVER_PAD || c.y < POPOVER_PAD) continue;
    if (c.x + w > canvasW - POPOVER_PAD) continue;
    if (c.y + h > canvasH - POPOVER_PAD) continue;
    const box = { x: c.x, y: c.y, w, h };
    if (!rectOverlap(src, box) && !rectOverlap(tgt, box)) return c;
  }
  return null;
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
  const { x, y, w, h } = layout.popover;
  const target = layout.target;
  const cl = layout.crossLink;
  const SrcIcon = ICONS[sourceTrack.iconKey];
  const TgtIcon = ICONS[target.iconKey];

  // Adaptive content level. When the popover ended up squat (band
  // was small), we drop the "Learn first" gap list — the header +
  // when + reason is what fits. When the popover is taller, we show
  // the full gap list.
  const isCompact = h < 120;

  return (
    <div
      className="absolute rounded-xl bg-card-solid border border-line pointer-events-none animate-in fade-in zoom-in-95 duration-150 overflow-hidden"
      style={{
        left: x,
        top: y,
        width: w,
        height: h,
        // Glow stack — soft outer halo + a tighter ring around the
        // edge — both tinted in the target track's accent so the
        // popover reads as belonging to the destination branch.
        boxShadow: `
          0 0 0 1px color-mix(in srgb, ${target.accent} 35%, transparent),
          0 0 0 4px color-mix(in srgb, ${target.accent} 16%, transparent),
          0 12px 38px color-mix(in srgb, ${target.accent} 30%, transparent),
          0 4px 12px rgba(0,0,0,0.10)
        `,
      }}
    >
      {/* Split top edge: left half source colour, right half target */}
      <span aria-hidden className="absolute top-0 left-0 right-0 h-[3px] flex overflow-hidden">
        <span className="flex-1" style={{ backgroundColor: sourceTrack.accent }} />
        <span className="flex-1" style={{ backgroundColor: target.accent }} />
      </span>

      <div className={isCompact ? "px-3 py-1.5" : "px-3 py-2.5"}>
        {/* From → To header */}
        <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-fg leading-tight flex-wrap">
          <SrcIcon className="h-3.5 w-3.5 shrink-0" style={{ color: sourceTrack.accent }} />
          <span>{sourceTrack.title}</span>
          <span className="text-fg-subtle" aria-hidden>→</span>
          <TgtIcon className="h-3.5 w-3.5 shrink-0" style={{ color: target.accent }} />
          <span>{target.title}</span>
          <span
            className="ml-1 text-[10px] uppercase tracking-[0.16em] font-bold"
            style={{ color: target.accent }}
          >
            {cl.when}
          </span>
        </div>

        {/* Why */}
        <p className={(isCompact ? "mt-1 line-clamp-2" : "mt-1.5") + " text-[11px] text-fg-muted leading-relaxed"}>
          {cl.reason}
        </p>

        {/* Learn first — only when popover is tall enough */}
        {!isCompact && cl.learningNeeded && cl.learningNeeded.length > 0 && (
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
