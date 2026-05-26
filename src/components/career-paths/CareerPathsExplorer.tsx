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

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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

// ──────────────────────────────────────────────────────────────────
// Top component
// ──────────────────────────────────────────────────────────────────

export function CareerPathsExplorer() {
  const [branch, setBranch] = useState<BranchOpen | null>(null);
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
              onBranchOpen={setBranch}
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
  return (
    <article
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

      {/* Branch-out icon — bottom-right. Subtle infinite pulse to
          advertise its interactive-ness. Click opens the branching
          modal. The pulse animation only changes transform/opacity
          (no layout), so click hit-detection on the button stays
          stable while the pulse plays. */}
      {hasCrossLinks && (
        <button
          type="button"
          onClick={(e) => {
            // Stop bubbling defensively in case any parent decides to
            // grow a click handler later.
            e.stopPropagation();
            onBranchOpen({ track, station });
          }}
          aria-label={`Show ${crossLinks.length} branch transition${crossLinks.length > 1 ? "s" : ""} from ${station.label}`}
          title={`Show ${crossLinks.length} branch transition${crossLinks.length > 1 ? "s" : ""}`}
          className="absolute bottom-2 right-2 z-20 inline-flex items-center justify-center w-7 h-7 rounded-full cursor-pointer transition-transform hover:scale-110 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
          style={{
            backgroundColor: `color-mix(in srgb, ${accent} 18%, var(--card))`,
            color: accent,
            border: `1px solid color-mix(in srgb, ${accent} 40%, transparent)`,
            animation: "careerBranchPulse 2.4s ease-in-out infinite",
            pointerEvents: "auto",
          }}
        >
          <GitFork size={13} />
          {/* Tiny count badge so users know how many branches exist */}
          {crossLinks.length > 1 && (
            <span
              aria-hidden
              className="absolute -top-1 -right-1 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[9px] font-bold leading-none"
              style={{
                backgroundColor: accent,
                color: "white",
              }}
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
// Branch modal — full-screen overlay shown on icon click
// ──────────────────────────────────────────────────────────────────

interface TargetData {
  cl: CrossLink;
  track: CareerTrack;
  station: CareerStation;
}

function BranchModal({
  source, onClose,
}: {
  source: BranchOpen;
  onClose: () => void;
}) {
  // Resolve target tracks + stations once per source. useMemo gives
  // the array a stable reference across re-renders — without it the
  // `useLayoutEffect([targets])` below ran on every render (new
  // array ref every time), `setLines` fired, the component re-
  // rendered, the effect re-ran… and the modal hung in an infinite
  // loop the moment it mounted. Which is what was making the icon
  // "not work" — the click set state correctly, but the modal that
  // mounted immediately locked up.
  const targets: TargetData[] = useMemo(() => {
    return (source.station.crossLinks ?? [])
      .map((cl) => {
        const track = TRACK_BY_ID.get(cl.trackId);
        const station = track?.stations.find((s) => s.level === cl.targetLevel);
        return track && station ? { cl, track, station } : null;
      })
      .filter((t): t is TargetData => t !== null);
  }, [source]);

  // Refs for measuring source + each target so we can draw the
  // connecting lines after layout.
  const containerRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef<HTMLDivElement>(null);
  const targetRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [lines, setLines] = useState<
    Array<{ from: { x: number; y: number }; to: { x: number; y: number }; length: number; color: string }>
  >([]);

  // Measure positions after layout. We use useLayoutEffect so the
  // line geometry is set before paint — no first-frame flicker where
  // lines render at wrong positions and then jump.
  useLayoutEffect(() => {
    if (!containerRef.current || !sourceRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const srcRect = sourceRef.current.getBoundingClientRect();
    const computed: typeof lines = [];
    for (const t of targets) {
      const key = `${t.track.id}-${t.station.level}`;
      const el = targetRefs.current.get(key);
      if (!el) continue;
      const tgtRect = el.getBoundingClientRect();
      const from = {
        x: srcRect.left + srcRect.width / 2 - containerRect.left,
        y: srcRect.bottom - containerRect.top,
      };
      const to = {
        x: tgtRect.left + tgtRect.width / 2 - containerRect.left,
        y: tgtRect.top - containerRect.top,
      };
      // Bezier-with-vertical-control-points path. Estimate length
      // generously (straight-line × 1.25) so the dasharray covers
      // the full curve length.
      const length = Math.hypot(to.x - from.x, to.y - from.y) * 1.25;
      computed.push({ from, to, length, color: t.track.accent });
    }
    setLines(computed);
  }, [targets]);

  // Esc-to-close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Lock body scroll while the modal is open so users can't lose
  // the overlay by scrolling the chart underneath.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const SrcIcon = ICONS[source.track.iconKey];

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop — fades in, click to dismiss */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
        aria-hidden
      />

      {/* Scrollable viewport so the modal contents can grow taller
          than the viewport without being clipped (3 large target
          cards stacked on narrow screens easily exceed 100 vh). */}
      <div className="absolute inset-0 overflow-y-auto p-4 sm:p-8 flex items-start justify-center">
        <div ref={containerRef} className="relative w-full max-w-5xl my-auto">
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 z-20 inline-flex items-center justify-center w-9 h-9 rounded-full bg-white text-fg hover:bg-elevated shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
          >
            <X size={18} />
          </button>

          {/* Header label above the source card */}
          <p
            className="text-[10.5px] uppercase tracking-[0.18em] font-bold text-white/85 text-center mb-3 animate-in fade-in duration-300"
            style={{ animationDelay: "100ms", animationFillMode: "backwards" }}
          >
            <span className="inline-flex items-center gap-2">
              <GitFork size={11} />
              Career branching from
            </span>
          </p>

          {/* Source card */}
          <div className="flex justify-center mb-20 sm:mb-24">
            <div
              ref={sourceRef}
              className="animate-in fade-in slide-in-from-top-3 duration-500 w-full max-w-md"
              style={{ animationDelay: "250ms", animationFillMode: "backwards" }}
            >
              <BigStationCard
                station={source.station}
                track={source.track}
                label="Where you are"
                Icon={SrcIcon}
              />
            </div>
          </div>

          {/* SVG overlay carrying the connecting lines. Lives BEHIND
              the target cards in z-order so the cards visually "sit
              on" the lines. */}
          <svg
            aria-hidden
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ zIndex: 0 }}
          >
            {lines.map((line, i) => {
              const { from, to, length, color } = line;
              const midY = (from.y + to.y) / 2;
              // Cubic bezier with vertical control points — the line
              // exits source straight down, swings, and approaches
              // each target straight down.
              const d = `M ${from.x} ${from.y} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y}`;
              const markerId = `cmodal-arrow-${i}`;
              return (
                <g key={i}>
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
                      <path d="M 1 1 L 9 5 L 1 9 z" fill={color} />
                    </marker>
                  </defs>
                  <path
                    d={d}
                    stroke={color}
                    strokeWidth="2.5"
                    fill="none"
                    strokeLinecap="round"
                    markerEnd={`url(#${markerId})`}
                    style={{
                      strokeDasharray: length,
                      strokeDashoffset: length,
                      animation: "careerLineGrow 700ms cubic-bezier(0.4, 0, 0.2, 1) forwards",
                      animationDelay: `${450 + i * 120}ms`,
                      // Soft glow on the line itself
                      filter: `drop-shadow(0 0 6px color-mix(in srgb, ${color} 50%, transparent))`,
                    }}
                  />
                  {/* Source dot */}
                  <circle
                    cx={from.x}
                    cy={from.y}
                    r="6"
                    fill={source.track.accent}
                    stroke="white"
                    strokeWidth="2"
                    style={{
                      animation: "careerLineGrow 200ms ease-out forwards",
                      animationDelay: `${400 + i * 120}ms`,
                    }}
                  />
                </g>
              );
            })}
          </svg>

          {/* Targets row — fades + slides in last */}
          <div
            className="relative grid gap-4 sm:gap-5"
            style={{
              gridTemplateColumns: `repeat(${Math.min(targets.length, 3)}, minmax(0, 1fr))`,
              zIndex: 1,
            }}
          >
            {targets.map((t, i) => {
              const key = `${t.track.id}-${t.station.level}`;
              const Icon = ICONS[t.track.iconKey];
              return (
                <div
                  key={key}
                  ref={(el) => {
                    if (el) targetRefs.current.set(key, el);
                    else targetRefs.current.delete(key);
                  }}
                  className="animate-in fade-in slide-in-from-bottom-3 duration-500"
                  style={{
                    animationDelay: `${750 + i * 130}ms`,
                    animationFillMode: "backwards",
                  }}
                >
                  <BigStationCard
                    station={t.station}
                    track={t.track}
                    Icon={Icon}
                    label="Where you'd land"
                    crossLink={t.cl}
                  />
                </div>
              );
            })}
          </div>

          {/* Footer hint */}
          <p
            className="mt-6 text-[11px] text-white/65 text-center animate-in fade-in duration-300"
            style={{ animationDelay: "1100ms", animationFillMode: "backwards" }}
          >
            Press <kbd className="px-1.5 py-0.5 rounded bg-white/15 text-white/85 text-[10px] font-mono">Esc</kbd> or click the backdrop to close.
          </p>
        </div>
      </div>
    </div>
  );
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
  return (
    <article
      className="rounded-2xl bg-card-solid overflow-hidden"
      style={{
        border: `2px solid ${track.accent}`,
        boxShadow: `
          0 0 0 6px color-mix(in srgb, ${track.accent} 16%, transparent),
          0 20px 50px color-mix(in srgb, ${track.accent} 25%, transparent),
          0 8px 24px rgba(0,0,0,0.25)
        `,
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
        {station.roles.length > 1 && (
          <p className="text-[11px] text-fg-subtle leading-snug mt-0.5">
            +{station.roles.length - 1} similar role{station.roles.length > 2 ? "s" : ""}
          </p>
        )}

        <p className="mt-2 text-[12px] text-fg-muted leading-relaxed">
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
    </article>
  );
}
