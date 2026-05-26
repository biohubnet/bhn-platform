"use client";

/**
 * CareerPathsExplorer — tree-chart visualisation of one career track
 * at a time, with cross-tree branches you can click to jump.
 *
 * Tree layout (active-track view)
 * ──────────────────────────────────────────────────────────────────
 *   [ Junior box ]
 *        │
 *        │  ← transition microcopy ("Around year 2…")
 *        ▼
 *   [ Mid box ]
 *        │
 *        ▼
 *   [ Senior box ] ── branch ──► [ side card: Quality track ]
 *        │                       [ side card: Project Lead    ]
 *        ▼
 *   [ Lead box ]   ── branch ──► [ side card: Business       ]
 *        │
 *        ▼
 *   [ VP box ]
 *
 *  • Boxes — proper rounded cards with a left-accent border in the
 *    track's hue, a soft shadow, level eyebrow, role list, focus
 *    microcopy, and 3 curated course links.
 *  • Trunk — a CSS vertical line connecting consecutive boxes.
 *    Gradient deepens from light at Junior to full accent at VP so
 *    the eye reads "climbing the track" as it scans down.
 *  • Connectors — between every adjacent pair of stations, a short
 *    transition microcopy explains what changes at that career hinge
 *    (year-2 unit-op ownership, year-5 workstream leadership, etc.).
 *  • Cross-tree branches — at stations that have crossLinks, an SVG
 *    curve grows out of the box's right edge to a small destination
 *    card carrying the target track's icon + a one-line "when / why"
 *    microcopy. Clicking the destination card swaps the active track
 *    so the journey for THAT track is immediately on screen.
 *
 * Responsiveness — at lg+ the cross-tree side cards sit to the right
 * of the trunk in a dedicated column. Below lg they collapse to a
 * stacked list beneath the parent station so the tree still reads
 * top-to-bottom on phones.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  Dna,
  FlaskConical,
  Network,
  Shield,
  Stethoscope,
  type LucideIcon,
  ArrowRight,
  CornerDownRight,
  Sparkles,
  Trophy,
} from "lucide-react";
import {
  CAREER_TRACKS,
  TRACK_BY_ID,
  TRANSITION_MICROCOPY,
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

export function CareerPathsExplorer() {
  const [activeId, setActiveId] = useState<CareerTrack["id"]>(CAREER_TRACKS[0].id);
  const active = useMemo(() => TRACK_BY_ID.get(activeId)!, [activeId]);
  const ActiveIcon = ICONS[active.iconKey];

  return (
    <div className="space-y-10">
      {/* ── Track selector ── */}
      <section aria-label="Career tracks">
        <p className="text-[10.5px] uppercase tracking-[0.18em] font-bold text-fg-subtle mb-3">
          Pick a track
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {CAREER_TRACKS.map((t) => {
            const Icon = ICONS[t.iconKey];
            const isActive = t.id === activeId;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveId(t.id)}
                className={
                  "relative text-left pl-4 pr-3 py-3 transition-colors rounded-lg " +
                  (isActive ? "bg-elevated/70" : "hover:bg-elevated/40")
                }
                aria-pressed={isActive}
              >
                <span
                  aria-hidden
                  className={`absolute left-0 top-3 bottom-3 rounded-r ${isActive ? "w-1" : "w-[2px]"}`}
                  style={{ backgroundColor: t.accent }}
                />
                <div className="flex items-start gap-2.5">
                  <Icon className="h-4 w-4 shrink-0 mt-0.5" style={{ color: t.accent }} />
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-semibold text-fg leading-tight">{t.title}</p>
                    <p className="text-[11.5px] text-fg-muted leading-snug mt-0.5">{t.tagline}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Active track header ── */}
      <section>
        <div className="flex items-baseline gap-2.5 mb-2">
          <span
            aria-hidden
            className="inline-block w-2 h-2 rounded-sm"
            style={{ backgroundColor: active.accent }}
          />
          <p className="text-[10.5px] uppercase tracking-[0.18em] font-bold text-fg">
            Active track
          </p>
        </div>
        <div className="flex items-start gap-3">
          <ActiveIcon className="h-7 w-7 shrink-0 mt-1" style={{ color: active.accent }} />
          <div className="min-w-0">
            <h2
              className="text-[24px] sm:text-[28px] font-semibold text-fg leading-tight tracking-tight"
              style={{ fontFamily: "var(--font-display-theme, inherit)" }}
            >
              {active.title}
            </h2>
            <p className="mt-1 text-[14px] text-fg-muted leading-relaxed max-w-3xl">
              {active.description}
            </p>
          </div>
        </div>
        <div className="mt-4 h-px bg-gradient-to-r from-line/80 via-line/40 to-transparent" />
      </section>

      {/* ── Tree chart ── */}
      <section aria-label={`${active.title} career tree`}>
        {/* Tiny "you start here" flourish above the first box */}
        <div className="flex flex-col items-center mb-2">
          <p
            className="inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.18em] font-bold"
            style={{ color: active.accent }}
          >
            <Sparkles size={12} /> Start
          </p>
          <Trunk accent={active.accent} height={28} variant="start" />
        </div>

        <ol className="space-y-0">
          {active.stations.map((s, idx) => {
            const isLast = idx === active.stations.length - 1;
            const nextLevel = active.stations[idx + 1]?.level;
            const transitionKey = nextLevel ? `${s.level}→${nextLevel}` : null;
            return (
              <li key={s.level} className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(0,520px)_1fr] gap-x-6">
                {/* LEFT GUTTER — reserved for symmetry; intentionally empty */}
                <div className="hidden lg:block" />

                {/* CENTER COLUMN — station box */}
                <div className="relative">
                  <StationBox station={s} index={idx} accent={active.accent} />
                </div>

                {/* RIGHT GUTTER — cross-tree branches (lg+) */}
                <div className="hidden lg:flex flex-col justify-center gap-3 pt-2">
                  {s.crossLinks?.map((cl) => {
                    const target = TRACK_BY_ID.get(cl.trackId);
                    if (!target) return null;
                    return (
                      <BranchToTrack
                        key={cl.trackId + cl.when}
                        target={target}
                        when={cl.when}
                        reason={cl.reason}
                        accent={active.accent}
                        onClick={() => setActiveId(target.id)}
                      />
                    );
                  })}
                </div>

                {/* MOBILE: cross-tree branches stacked under the station */}
                {s.crossLinks && s.crossLinks.length > 0 && (
                  <div className="lg:hidden mt-4 space-y-2">
                    <p className="text-[10.5px] uppercase tracking-[0.18em] font-bold text-fg-subtle inline-flex items-center gap-1.5">
                      <CornerDownRight size={11} className="opacity-70" /> Cross-tree from here
                    </p>
                    {s.crossLinks.map((cl) => {
                      const target = TRACK_BY_ID.get(cl.trackId);
                      if (!target) return null;
                      return (
                        <BranchToTrack
                          key={cl.trackId + cl.when}
                          target={target}
                          when={cl.when}
                          reason={cl.reason}
                          accent={active.accent}
                          onClick={() => setActiveId(target.id)}
                        />
                      );
                    })}
                  </div>
                )}

                {/* TRANSITION CONNECTOR — between this station and the next */}
                {!isLast && transitionKey && (
                  <>
                    <div className="hidden lg:block" />
                    <div className="flex flex-col items-center py-3 lg:py-4">
                      <Trunk accent={active.accent} height={20} />
                      <p className="text-[11.5px] italic text-fg-muted leading-snug text-center max-w-sm px-3">
                        {TRANSITION_MICROCOPY[transitionKey]}
                      </p>
                      <Trunk accent={active.accent} height={20} variant="arrow" />
                    </div>
                    <div className="hidden lg:block" />
                  </>
                )}
              </li>
            );
          })}
        </ol>

        {/* "You've made it" flourish below the last box */}
        <div className="flex flex-col items-center mt-2">
          <Trunk accent={active.accent} height={24} variant="end" />
          <p
            className="inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.18em] font-bold"
            style={{ color: active.accent }}
          >
            <Trophy size={12} /> Top of the ladder
          </p>
        </div>
      </section>

      {/* ── Catalog link ── */}
      <section className="border-t border-line/60 pt-6">
        <p className="text-[12.5px] text-fg-muted leading-relaxed">
          Looking for the full catalog instead of guided journeys? See every
          course at{" "}
          <Link href="/courses" className="font-semibold text-brand-700 hover:underline">
            Courses →
          </Link>
        </p>
      </section>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Station box — one node on the tree
// ──────────────────────────────────────────────────────────────────

function StationBox({
  station, index, accent,
}: {
  station: CareerStation;
  index: number;
  accent: string;
}) {
  return (
    <article
      className="relative overflow-hidden rounded-2xl bg-card-solid border border-line shadow-card-rest"
      style={{
        // Subtle accent-tinted gradient backdrop — barely visible but
        // ties the box to the track's hue.
        backgroundImage: `linear-gradient(180deg, color-mix(in srgb, ${accent} 7%, transparent) 0%, transparent 60%)`,
      }}
    >
      {/* Left accent bar — the colour cue for the track */}
      <span
        aria-hidden
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ backgroundColor: accent }}
      />

      <div className="pl-5 pr-5 py-4">
        {/* Eyebrow + level chip */}
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <p className="text-[10.5px] uppercase tracking-[0.18em] font-bold text-fg">
            Level {index + 1} · {station.label}
          </p>
          <span
            className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: `color-mix(in srgb, ${accent} 12%, transparent)`,
              color: accent,
            }}
          >
            {station.yearsRange}
          </span>
        </div>

        {/* Roles — inline middot list, larger type so it's the
            primary read alongside the level label. */}
        <p className="mt-2 text-[14px] font-semibold text-fg leading-snug">
          {station.roles.map((r, i) => (
            <span key={r}>
              {i > 0 && <span aria-hidden className="text-line mx-1.5 font-normal">·</span>}
              {r}
            </span>
          ))}
        </p>

        {/* Focus microcopy */}
        <p className="mt-2 text-[12.5px] text-fg-muted leading-relaxed">
          {station.focus}
        </p>

        {/* Courses — capped at 4 so the box height stays consistent */}
        {station.courses.length > 0 && (
          <div className="mt-3.5 border-t border-line/60 pt-3">
            <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-fg-subtle mb-1.5">
              Suggested courses
            </p>
            <ul className="space-y-1">
              {station.courses.slice(0, 4).map((c) => (
                <li key={c.title}>
                  <Link
                    href={`/courses?q=${encodeURIComponent(c.title)}`}
                    className="group inline-flex items-baseline gap-1.5 text-[12px] text-fg-muted hover:text-brand-700"
                  >
                    <ArrowRight size={10} className="opacity-60 translate-y-[1px] shrink-0 group-hover:opacity-100" />
                    <span className="group-hover:underline leading-snug">{c.title}</span>
                  </Link>
                </li>
              ))}
              {station.courses.length > 4 && (
                <li className="text-[11px] italic text-fg-subtle pl-3.5">
                  +{station.courses.length - 4} more — see catalog
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </article>
  );
}

// ──────────────────────────────────────────────────────────────────
// Branch to another track — small destination card on the side
// ──────────────────────────────────────────────────────────────────

function BranchToTrack({
  target, when, reason, accent, onClick,
}: {
  target: CareerTrack;
  when: string;
  reason: string;
  accent: string;
  onClick: () => void;
}) {
  const Icon = ICONS[target.iconKey];
  return (
    <div className="relative">
      {/* Connecting line — a small SVG curve from the parent
          station's right edge to this card's left. Decorative
          only — pointer-events none so clicks fall through to the
          button. */}
      <svg
        aria-hidden
        className="absolute -left-6 top-1/2 -translate-y-1/2 pointer-events-none hidden lg:block"
        width="24"
        height="48"
        viewBox="0 0 24 48"
      >
        <path
          d="M 0 24 Q 12 24, 12 12 L 24 12"
          stroke={accent}
          strokeWidth="1.5"
          fill="none"
          strokeDasharray="3 2"
          opacity="0.6"
        />
      </svg>

      <button
        type="button"
        onClick={onClick}
        className="group relative w-full lg:w-[220px] text-left rounded-xl border border-line bg-card-solid px-3 py-2.5 hover:bg-elevated/60 transition-colors shadow-card-rest"
        style={{ borderLeftWidth: "3px", borderLeftColor: target.accent }}
      >
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 shrink-0" style={{ color: target.accent }} />
          <p className="text-[12.5px] font-semibold text-fg leading-tight group-hover:underline truncate">
            {target.title}
          </p>
        </div>
        <p className="mt-1 text-[10.5px] uppercase tracking-[0.16em] font-bold text-fg-subtle">
          {when}
        </p>
        <p className="mt-1 text-[11.5px] text-fg-muted leading-snug">
          {reason}
        </p>
      </button>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Trunk — vertical connecting line between station boxes
// ──────────────────────────────────────────────────────────────────

function Trunk({
  accent,
  height,
  variant,
}: {
  accent: string;
  height: number;
  variant?: "start" | "end" | "arrow";
}) {
  // The trunk is a 2-px vertical bar with subtle gradient. The
  // `variant` prop adds a cap (start tick / end tick / arrow head)
  // so the journey has a clear "begin" and "advance" feel.
  return (
    <div className="relative flex flex-col items-center" style={{ height }}>
      <span
        aria-hidden
        className="w-[2px] h-full"
        style={{
          background: `linear-gradient(180deg, ${accent} 0%, color-mix(in srgb, ${accent} 60%, transparent) 100%)`,
        }}
      />
      {variant === "arrow" && (
        <svg
          aria-hidden
          width="14"
          height="10"
          viewBox="0 0 14 10"
          className="absolute -bottom-1 left-1/2 -translate-x-1/2"
        >
          <path d="M 1 1 L 7 8 L 13 1" stroke={accent} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
}
