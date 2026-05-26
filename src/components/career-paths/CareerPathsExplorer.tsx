"use client";

/**
 * CareerPathsExplorer — the interactive surface on /career-paths.
 *
 * Layout (top → bottom):
 *   1. Track selector row — six pills, click to switch the active
 *      track. Active track shows its accent colour on the pill's
 *      left border + a brand-tinted backdrop. No fill chips elsewhere
 *      on the row.
 *   2. Active track header — title + tagline + description.
 *   3. Journey timeline — 5 vertical stations (Junior → VP) connected
 *      by a thin dashed line. Each station has:
 *        • Level eyebrow + years range
 *        • 2–4 typical roles, listed inline with middots
 *        • 1-sentence focus paragraph
 *        • Course chips (flat text + chevron, no pill fills)
 *        • Optional cross-link chips at branch-point stations
 *
 * Aesthetic — matches the magazine-row redesign the job-folders page
 * landed on: no rounded card-in-card, one accent colour per row, lines
 * + gradients instead of fills. Course chips are plain text with a
 * hover-only underline so the eye reads the journey first and the
 * courses as supporting detail.
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
} from "lucide-react";
import {
  CAREER_TRACKS,
  TRACK_BY_ID,
  type CareerTrack,
  type LevelId,
} from "@/lib/career-paths/data";

const ICONS: Record<CareerTrack["iconKey"], LucideIcon> = {
  flask:      FlaskConical,
  shield:     Shield,
  dna:        Dna,
  stethoscope: Stethoscope,
  briefcase:  Briefcase,
  network:    Network,
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
                  "relative text-left pl-4 pr-3 py-3 transition-colors " +
                  (isActive ? "bg-elevated/70" : "hover:bg-elevated/40")
                }
                aria-pressed={isActive}
              >
                {/* Accent bar — always rendered but width shifts on
                    active so the selected track reads first. */}
                <span
                  aria-hidden
                  className={`absolute left-0 top-3 bottom-3 rounded-r ${isActive ? "w-1" : "w-[2px]"}`}
                  style={{ backgroundColor: t.accent }}
                />
                <div className="flex items-start gap-2.5">
                  <Icon className="h-4 w-4 shrink-0 mt-0.5" style={{ color: t.accent }} />
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-semibold text-fg leading-tight">
                      {t.title}
                    </p>
                    <p className="text-[11.5px] text-fg-muted leading-snug mt-0.5">
                      {t.tagline}
                    </p>
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

      {/* ── Journey timeline ── */}
      <section aria-label={`${active.title} career journey`}>
        <p className="text-[10.5px] uppercase tracking-[0.18em] font-bold text-fg-subtle mb-4">
          Journey — Junior to VP
        </p>
        <ol className="relative space-y-10">
          {/* Vertical dashed connector line. Position pinned to the
              first station's bar so it visually connects through. */}
          <span
            aria-hidden
            className="absolute left-[7px] top-3 bottom-3 border-l border-dashed"
            style={{ borderColor: `color-mix(in srgb, ${active.accent} 35%, transparent)` }}
          />
          {active.stations.map((s, idx) => {
            const order = LEVEL_ORDER.indexOf(s.level);
            // Bar width grows with seniority — a small visual cue
            // that the rungs get heavier as you climb.
            const barWidth = 3 + order; // 3..7 px
            return (
              <li key={s.level} className="relative pl-7">
                {/* Station bar — thin coloured dash at the row's
                    left edge. Replaces the per-station rounded box. */}
                <span
                  aria-hidden
                  className="absolute left-0 top-2 h-4 rounded-r"
                  style={{
                    backgroundColor: active.accent,
                    width: `${barWidth}px`,
                  }}
                />
                {/* Eyebrow + years */}
                <div className="flex items-baseline gap-2.5 flex-wrap">
                  <p className="text-[10.5px] uppercase tracking-[0.18em] font-bold text-fg">
                    Level {idx + 1} · {s.label}
                  </p>
                  <span className="text-[11.5px] text-fg-subtle">{s.yearsRange}</span>
                </div>

                {/* Roles — inline middot-separated text */}
                <p className="mt-2 text-[13.5px] text-fg leading-snug">
                  {s.roles.map((r, i) => (
                    <span key={r}>
                      {i > 0 && <span aria-hidden className="text-line mx-1.5">·</span>}
                      {r}
                    </span>
                  ))}
                </p>

                {/* Focus — what you're building at this rung */}
                <p className="mt-2 text-[12.5px] text-fg-muted leading-relaxed max-w-2xl">
                  {s.focus}
                </p>

                {/* Course chips — flat ghost text with a subtle
                    chevron. Hover underline only. The whole list reads
                    as a sentence-y "suggested next courses". */}
                {s.courses.length > 0 && (
                  <div className="mt-3.5">
                    <p className="text-[10.5px] uppercase tracking-[0.18em] font-bold text-fg-subtle mb-1.5">
                      Suggested courses
                    </p>
                    <ul className="flex flex-wrap gap-x-3.5 gap-y-1.5">
                      {s.courses.map((c) => (
                        <li key={c.title}>
                          <Link
                            href={`/courses?q=${encodeURIComponent(c.title)}`}
                            className="inline-flex items-center gap-1 text-[12.5px] text-fg-muted hover:text-brand-700 hover:underline"
                          >
                            <ArrowRight size={11} className="opacity-60" />
                            {c.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Cross-links — branch points to other tracks */}
                {s.crossLinks && s.crossLinks.length > 0 && (
                  <div className="mt-4 border-l-2 pl-3.5" style={{ borderColor: `color-mix(in srgb, ${active.accent} 35%, transparent)` }}>
                    <p className="text-[10.5px] uppercase tracking-[0.18em] font-bold text-fg-subtle inline-flex items-center gap-1.5 mb-1.5">
                      <CornerDownRight size={11} className="opacity-70" /> Cross-tree from here
                    </p>
                    <ul className="space-y-2">
                      {s.crossLinks.map((cl) => {
                        const target = TRACK_BY_ID.get(cl.trackId);
                        if (!target) return null;
                        const TargetIcon = ICONS[target.iconKey];
                        return (
                          <li key={cl.trackId + cl.when} className="text-[12px] text-fg-muted leading-relaxed">
                            <button
                              type="button"
                              onClick={() => setActiveId(target.id)}
                              className="group inline-flex items-baseline gap-1.5 text-left"
                            >
                              <TargetIcon className="h-3.5 w-3.5 translate-y-[2px] shrink-0" style={{ color: target.accent }} />
                              <span>
                                <span className="font-semibold text-fg group-hover:underline">
                                  {target.title}
                                </span>
                                <span className="text-fg-subtle"> · {cl.when}</span>
                                <span className="block text-fg-muted">{cl.reason}</span>
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
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
