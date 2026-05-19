"use client";

/**
 * KaplanMeierReveal — four-stage looping animation of a Kaplan-
 * Meier survival curve being drawn from a blank plot to a finished
 * read-out, including event drops, censor ticks, and a median-OS
 * crosshair. The biostatistician's love language.
 *
 * Stages:
 *   1. PLOT       — empty axes + grid; survival at 1.0 line drawn
 *                   horizontally across to suggest "100% alive".
 *   2. EVENTS     — event circles appear at the timepoints where
 *                   the curve will later step down. Censor ticks
 *                   also appear (small vertical hash marks).
 *   3. STEPDOWN   — the survival curve drops in step-function
 *                   shape through the events. Drawn via stroke-
 *                   dashoffset so it animates left → right.
 *   4. MEDIAN     — a horizontal "50%" line drops in; a vertical
 *                   crosshair marks median OS; tiny annotation
 *                   labels mOS and the curve drop is preserved.
 *
 * All overlays are present at all times; opacity per stage gates
 * what's visible.
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["plot", "events", "stepdown", "median"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  plot:     { label: "KM PLOT",     sub: "S(t) = 1.0",        duration: 2400 },
  events:   { label: "EVENTS LOGGED", sub: "deaths + censors", duration: 2600 },
  stepdown: { label: "STEP FUNCTION", sub: "S(t) ↓ per event", duration: 3600 },
  median:   { label: "mOS REACHED",   sub: "S(t) = 0.50",      duration: 3000 },
};

// Plot box: x 22..132 (width 110), y 18..86 (height 68).
// Each event drops S(t) by ~10–15%; arbitrary but realistic-looking.
// Event timepoints (x) + post-drop survival (y).
const EVENTS: Array<{ x: number; y: number }> = [
  { x: 38,  y: 28 },  // first event — small drop
  { x: 56,  y: 38 },
  { x: 74,  y: 48 },
  { x: 92,  y: 58 },
  { x: 110, y: 68 },
];

// Censor ticks — small upward hash marks on the curve between events.
const CENSORS: number[] = [44, 60, 80, 100];

interface Props {
  size?: number;
  className?: string;
}

export function KaplanMeierReveal({ size = 160, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  // Visibility flags.
  const showEvents   = stage === "events" || stage === "stepdown" || stage === "median";
  const showStep     = stage === "stepdown" || stage === "median";
  const showMedian   = stage === "median";

  // For the curve animation we draw a continuous path and animate
  // strokeDashoffset from `len` → 0 so it draws left to right.
  // Approximate path length (chord sum) for the dasharray.
  const PATH_LEN = 240;

  // Step path — starts at (22, 18) (top-left of plot, S=1.0) and
  // walks rightward, dropping at each event.
  const stepPath = (() => {
    let d = `M 22 18 `;
    let prevX = 22;
    let curY = 18;
    for (const ev of EVENTS) {
      d += `L ${ev.x} ${curY} L ${ev.x} ${ev.y} `;
      prevX = ev.x;
      curY = ev.y;
    }
    d += `L 132 ${curY}`;
    return d;
  })();

  return (
    <div className={className}>
      <svg
        width={size}
        height={size * (170 / 160)}
        viewBox="0 0 160 170"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        role="img"
        aria-label={`Kaplan-Meier reveal — ${info.label}`}
      >
        {/* ── Axes */}
        <line x1="22" y1="86" x2="132" y2="86" />
        <line x1="22" y1="86" x2="22" y2="18" />
        {/* tick marks on x */}
        <g opacity="0.4">
          {[44, 66, 88, 110].map((x) => (
            <line key={x} x1={x} y1="86" x2={x} y2="89" strokeWidth="0.8" />
          ))}
        </g>
        {/* tick marks on y */}
        <g opacity="0.4">
          {[28, 48, 68].map((y) => (
            <line key={y} x1="22" y1={y} x2="19" y2={y} strokeWidth="0.8" />
          ))}
        </g>
        {/* axis labels */}
        <g
          fill="currentColor" stroke="none"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          opacity="0.6"
        >
          <text x="77" y="100" textAnchor="middle" fontSize="5.4">time</text>
          <text
            x="13" y="52"
            fontSize="5.4"
            transform="rotate(-90 13 52)"
            textAnchor="middle"
          >
            S(t)
          </text>
        </g>

        {/* ── Initial S(t)=1.0 line — visible during PLOT only */}
        <line
          x1="22" y1="18" x2="132" y2="18"
          stroke="currentColor" strokeWidth="1.4"
          opacity={stage === "plot" ? 0.85 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}
        />

        {/* ── Event circles + censor ticks */}
        <g
          opacity={showEvents ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 600ms ease" }}
        >
          {EVENTS.map((ev, i) => (
            <circle
              key={`ev-${i}`}
              cx={ev.x} cy={ev.y}
              r="2"
              fill="currentColor" stroke="none"
              opacity="0.85"
            />
          ))}
          {CENSORS.map((x, i) => (
            <line
              key={`c-${i}`}
              x1={x} y1={20 + i * 10}
              x2={x} y2={26 + i * 10}
              strokeWidth="1.1"
              opacity="0.65"
            />
          ))}
        </g>

        {/* ── Step-down survival curve — drawn left-to-right via
              dashoffset. */}
        <path
          d={stepPath}
          stroke="currentColor" strokeWidth="1.6"
          fill="none"
          strokeDasharray={PATH_LEN}
          strokeDashoffset={showStep ? 0 : PATH_LEN}
          style={{ transition: noTransition ?? "stroke-dashoffset 1100ms cubic-bezier(.5,.1,.4,1)" }}
        />

        {/* ── Median OS overlay — 50% horizontal line + crosshair
              + annotation. */}
        <g
          opacity={showMedian ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 600ms ease" }}
        >
          {/* 50% horizontal — corresponds to S(t)=0.50, plot y ≈ 52 */}
          <line
            x1="22" y1="52" x2="132" y2="52"
            stroke="currentColor" strokeWidth="0.9"
            strokeDasharray="2 2" opacity="0.55"
          />
          {/* Median OS crosshair — vertical at the x where the
                step crosses 52 (between event 2 and 3 → ~x=66). */}
          <line
            x1="66" y1="86" x2="66" y2="52"
            stroke="currentColor" strokeWidth="0.9"
            strokeDasharray="2 2" opacity="0.55"
          />
          <circle cx="66" cy="52" r="2" fill="#86efac" stroke="none" />
          <text
            x="70" y="50"
            fontSize="5.4"
            fill="currentColor" stroke="none"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            opacity="0.8"
          >
            mOS
          </text>
        </g>

        {/* ── Stage label */}
        <g
          fill="currentColor" stroke="none"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        >
          <text x="80" y="128" textAnchor="middle" fontSize="7" fontWeight="700" letterSpacing="1.3">
            {info.label}
          </text>
          <text x="80" y="140" textAnchor="middle" fontSize="5.8" opacity="0.55" letterSpacing="0.4">
            {info.sub}
          </text>
        </g>

        {/* ── Stage dots */}
        <g
          transform="translate(62 158)"
          role="progressbar"
          aria-label={`Cycle stage ${stageIdx + 1} of ${STAGES.length}: ${info.label}`}
          aria-valuenow={stageIdx + 1}
          aria-valuemin={1}
          aria-valuemax={STAGES.length}
        >
          {STAGES.map((_, i) => (
            <circle
              key={i}
              cx={i * 12}
              cy={0}
              r="1.6"
              fill={i === stageIdx ? "#86efac" : "currentColor"}
              opacity={i === stageIdx ? 1 : 0.3}
              stroke="none"
              style={{ transition: noTransition ?? "opacity 300ms ease, fill 300ms ease" }}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
