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

export function CareerPathsExplorer() {
  const [branch, setBranch] = useState<BranchOpenWithRects | null>(null);

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

  return (
    <div className="space-y-6">
      <Legend />

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
              onBranchOpen={handleBranchOpen}
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
  level, rowIdx, isLast, onBranchOpen,
}: {
  level: LevelId;
  rowIdx: number;
  isLast: boolean;
  onBranchOpen: (b: BranchOpen) => void;
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
                track={track}
                onBranchOpen={onBranchOpen}
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

// Animation stages. Cards now POP in at their focused positions
// directly (no chart-to-focused slide, no compact-to-expanded
// crossfade), so the timing is simpler: backdrop, then cards, then
// lines, then settled.
type Stage = "darken" | "cards" | "lines" | "settled";

const STAGE_TIMINGS: Record<Stage, number> = {
  darken:   0,    // backdrop starts fading in
  cards:    300,  // cards pop in (staggered via their own popDelayMs)
  lines:    1100, // source + all targets visible, lines start drawing
  settled:  1900, // lines done, full UI ready
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
        const track = TRACK_BY_ID.get(cl.trackId);
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
    const stages: Stage[] = ["cards", "lines", "settled"];
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
  const cardsVisible = stage === "cards" || stage === "lines" || stage === "settled";
  const linesActive = stage === "lines" || stage === "settled";

  return (
    <div className="fixed inset-0 z-[100] pointer-events-auto">
      {/* Backdrop — fades in over 300 ms; click to dismiss */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300"
        style={{ opacity: stage === "darken" ? 0 : 1 }}
        onClick={onClose}
        aria-hidden
      />

      {/* Close button — appears once cards do */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="fixed top-4 right-4 z-[110] inline-flex items-center justify-center w-10 h-10 rounded-full bg-white text-fg hover:bg-elevated shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 transition-opacity duration-300"
        style={{ opacity: cardsVisible ? 1 : 0 }}
      >
        <X size={18} />
      </button>

      {/* SOURCE — pops in at the focused position, full content */}
      {cardsVisible && (
        <FlipCard
          toRect={layout.source}
          highlighted
          accent={source.track.accent}
          zBoost={1}
        >
          <BigStationCard
            station={source.station}
            track={source.track}
            label="Where you are"
            Icon={ICONS[source.track.iconKey]}
          />
        </FlipCard>
      )}

      {/* TARGETS — pop in at their focused positions, staggered */}
      {cardsVisible && targets.map((t, i) => (
        <FlipCard
          key={`${t.track.id}-${t.station.level}`}
          toRect={layout.targets[i]}
          highlighted
          accent={t.track.accent}
          popDelayMs={120 + i * 110}
          zBoost={1}
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

      {/* SVG lines between the source card's bottom and each target
          card's top. Drawn only at the focused positions — no
          source-chart-position-to-target-focused-position trickery,
          since the cards now appear directly at focused positions. */}
      <BranchLines
        sourceTo={layout.source}
        targets={targets.map((t, i) => ({
          toRect: layout.targets[i],
          color: t.track.accent,
        }))}
        sourceAccent={source.track.accent}
        active={linesActive}
      />

      {/* Footer hint — after lines */}
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
  toRect, highlighted, accent, popDelayMs = 0, zBoost = 0, children,
}: {
  toRect: { left: number; top: number; width: number; height: number };
  highlighted: boolean;
  accent: string;
  /** Delay before the card pops in. Targets stagger so multiple
   *  cards don't all appear in lock-step. */
  popDelayMs?: number;
  zBoost?: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed overflow-hidden rounded-xl bg-card-solid pointer-events-auto"
      style={{
        left:   toRect.left,
        top:    toRect.top,
        width:  toRect.width,
        height: toRect.height,
        zIndex: 100 + zBoost,
        // Only the box-shadow + border transition. No size / position
        // animation — cards land at their focused position directly
        // and the content inside is shown in full from the start
        // (no compact preview, no truncation).
        transition: `box-shadow 350ms ease-out, border-color 350ms ease-out`,
        border: `2px solid ${highlighted ? accent : "var(--line)"}`,
        boxShadow: highlighted
          ? `0 0 0 6px color-mix(in srgb, ${accent} 18%, transparent),
             0 18px 50px color-mix(in srgb, ${accent} 25%, transparent),
             0 8px 24px rgba(0,0,0,0.30)`
          : "var(--shadow-card-rest)",
        // Pop-in animation — fade + slight zoom from 92 % so the card
        // visibly "lands" rather than instantly appearing.
        animation: `careerCardPopIn 380ms cubic-bezier(0.34, 1.56, 0.64, 1) ${popDelayMs}ms backwards`,
      }}
    >
      {children}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// BranchLines — SVG paths between source and each target. Tracks
// card positions through the move animation.
// ──────────────────────────────────────────────────────────────────

function BranchLines({
  sourceTo, targets, sourceAccent, active,
}: {
  sourceTo: { left: number; top: number; width: number; height: number };
  targets: Array<{
    toRect: { left: number; top: number; width: number; height: number };
    color: string;
  }>;
  sourceAccent: string;
  active: boolean;
}) {
  const srcCx = sourceTo.left + sourceTo.width / 2;
  const srcBy = sourceTo.top + sourceTo.height;
  return (
    <svg
      aria-hidden
      className="fixed inset-0 w-full h-full pointer-events-none z-[105]"
    >
      {targets.map((t, i) => {
        const tgtCx = t.toRect.left + t.toRect.width / 2;
        const tgtTy = t.toRect.top;
        const midY = (srcBy + tgtTy) / 2;
        const d = `M ${srcCx} ${srcBy} C ${srcCx} ${midY}, ${tgtCx} ${midY}, ${tgtCx} ${tgtTy}`;
        const length = Math.hypot(tgtCx - srcCx, tgtTy - srcBy) * 1.3;
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
                transition: `stroke-dashoffset 700ms cubic-bezier(0.4, 0, 0.2, 1) ${i * 120}ms`,
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
                transition: `opacity 250ms ease-out ${i * 120 + 600}ms`,
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
                transition: `opacity 250ms ease-out ${i * 120 + 200}ms`,
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
