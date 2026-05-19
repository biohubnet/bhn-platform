"use client";

/**
 * CarTKill — five-stage looping animation of a CAR-T cell
 * recognising, engaging, and lysing a tumor cell. The cancer-
 * immunotherapy workflow told as a process.
 *
 * Stages:
 *   1. PATROL   — CAR-T cell alone, no target in sight; CARs
 *                 idle on the membrane
 *   2. APPROACH — tumor cell drifts in from the right; T cell
 *                 starts to move toward it
 *   3. DOCK     — CAR/antigen synapse forming (dashed lines
 *                 highlight as the receptors engage)
 *   4. LYSE     — granzyme + perforin delivery; tumor cell
 *                 begins to disintegrate (dashed cell outline,
 *                 debris dots radiating outward)
 *   5. CLEAR    — tumor cell gone; debris drifts off; T cell
 *                 returns to PATROL; cycle loops
 *
 * Built on the same geometry as the static `CarT` glyph: T cell
 * at (40, 55) with six CAR receptors at 60° intervals; tumor cell
 * on the right with three CD19-style antigen markers. The
 * animation layers per-stage transforms + opacities on top.
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["patrol", "approach", "dock", "lyse", "clear"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  patrol:   { label: "CAR-T · PATROL",   sub: "scanning tissue",         duration: 3000 },
  approach: { label: "TARGET ENGAGED",   sub: "scFv recognises CD19",    duration: 2600 },
  dock:     { label: "IMMUNE SYNAPSE",   sub: "TCR-like signalling",     duration: 2800 },
  lyse:     { label: "LYSIS",            sub: "perforin + granzyme",     duration: 3200 },
  clear:    { label: "CLEAR",            sub: "target eliminated",       duration: 2400 },
};

/** CAR receptor positions on the T-cell membrane — 6 receptors
 *  evenly spaced at 60° intervals around the cell at (40, 55)
 *  with radius 34. Pre-computed (instead of trig in render) so
 *  the JSX stays declarative. */
const CARS: Array<{ baseX: number; baseY: number; rot: number }> = [
  { baseX: 74,           baseY: 55,             rot: 0   }, // right (engaging)
  { baseX: 57,           baseY: 84.44552314226, rot: 60  },
  { baseX: 23,           baseY: 84.44552314226, rot: 120 },
  { baseX:  6,           baseY: 55,             rot: 180 },
  { baseX: 23,           baseY: 25.55447685774, rot: 240 },
  { baseX: 57,           baseY: 25.55447685774, rot: 300 },
];

/** Debris dot endpoints — six positions around the tumor cell
 *  at (110, 55) that the debris drifts to during LYSE/CLEAR. */
const DEBRIS_DRIFT: Array<{ x: number; y: number }> = [
  { x: 124, y: 32 },
  { x: 132, y: 56 },
  { x: 124, y: 80 },
  { x:  96, y: 30 },
  { x:  90, y: 56 },
  { x:  96, y: 80 },
];

interface Props {
  size?: number;
  className?: string;
}

export function CarTKill({ size = 148, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  // ── Per-stage tween values ───────────────────────────────────
  // Tumor cell — only visible from APPROACH through LYSE. Drifts
  // in from far right during APPROACH, settles at (110, 55) for
  // DOCK, then breaks apart during LYSE.
  const tumorOpacity =
    stage === "patrol" ? 0 :
    stage === "clear"  ? 0 :
    stage === "lyse"   ? 0.35 :
    0.5;
  const tumorDx =
    stage === "patrol" ? 30 :       // off to the right
    stage === "approach" ? 6 :
    0;
  const tumorDashed = stage === "lyse" || stage === "clear";

  // Synapse arc — visible during DOCK + LYSE
  const synapseOpacity =
    stage === "dock" ? 0.85 :
    stage === "lyse" ? 0.5 :
    0;

  // Debris dots — visible during LYSE + CLEAR, drifting outward
  const debrisOpacity =
    stage === "lyse" ? 0.85 :
    stage === "clear" ? 0.35 :
    0;
  const debrisDriftT =
    stage === "lyse" ? 0.4 :
    stage === "clear" ? 1.0 :
    0;

  // Antigen markers on the tumor surface — visible while the
  // tumor is intact (APPROACH + DOCK).
  const antigensOpacity =
    stage === "approach" || stage === "dock" ? 1 :
    stage === "lyse" ? 0.35 : 0;

  return (
    <div className={className}>
      <svg
        width={size}
        height={size * (140 / 130)}
        viewBox="0 0 130 140"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
        role="img"
        aria-label={`CAR-T kill cycle — ${info.label}`}
      >
        {/* ── T cell — main body */}
        <circle cx="40" cy="55" r="34" />
        <circle cx="40" cy="55" r="11" strokeWidth="1.1" fill="currentColor" fillOpacity="0.18" />
        <circle cx="40" cy="55" r="3.2" fill="currentColor" fillOpacity="0.5" stroke="none" />

        {/* ── CAR receptors */}
        {CARS.map((car, i) => (
          <g key={`car-${i}`} transform={`translate(${car.baseX} ${car.baseY}) rotate(${car.rot})`}>
            <line x1="0" y1="0" x2="6.5" y2="0" strokeWidth="1.24" />
            <line x1="6.5" y1="0" x2="11.5" y2="-3.6" strokeWidth="1.1" />
            <line x1="6.5" y1="0" x2="11.5" y2="3.6" strokeWidth="1.1" />
            <circle cx="11.5" cy="-3.6" r="1.5" fill="currentColor" fillOpacity="0.6" stroke="none" />
            <circle cx="11.5" cy="3.6"  r="1.5" fill="currentColor" fillOpacity="0.6" stroke="none" />
          </g>
        ))}

        {/* ── Tumor cell — translates in / out per stage */}
        <g
          style={{
            transition: noTransition ?? "transform 900ms ease, opacity 700ms ease",
            transform: `translate3d(${tumorDx}px, 0, 0)`,
            opacity: tumorOpacity,
          }}
        >
          <circle
            cx="110" cy="55" r="22"
            strokeDasharray={tumorDashed ? "2 3" : undefined}
            style={{ transition: noTransition ?? "stroke-dasharray 400ms ease" }}
          />
          <circle cx="110" cy="55" r="6" strokeWidth="0.9" fill="currentColor" fillOpacity="0.18" />

          {/* Antigen markers — three CD19-style projections back
                toward the T cell. Fade with stage. */}
          <g
            style={{
              transition: noTransition ?? "opacity 500ms ease",
              opacity: antigensOpacity,
            }}
          >
            <line x1="89" y1="48" x2="80" y2="42" strokeWidth="0.98" opacity="0.7" />
            <circle cx="80" cy="42" r="2.4" fill="currentColor" fillOpacity="0.65" stroke="none" />
            <line x1="88" y1="55" x2="78" y2="55" strokeWidth="0.98" opacity="0.7" />
            <circle cx="78" cy="55" r="2.6" fill="currentColor" fillOpacity="0.7"  stroke="none" />
            <line x1="89" y1="62" x2="80" y2="68" strokeWidth="0.98" opacity="0.7" />
            <circle cx="80" cy="68" r="2.4" fill="currentColor" fillOpacity="0.65" stroke="none" />
          </g>
        </g>

        {/* ── Synapse arc — joins the engaging CAR's binding head
              to the central antigen at (78, 55) during DOCK + LYSE. */}
        <path
          d="M 74 55 Q 76 55, 78 55"
          strokeWidth="0.72"
          strokeDasharray="1.4 1.4"
          opacity={synapseOpacity}
          fill="none"
          style={{ transition: noTransition ?? "opacity 500ms ease" }}
        />

        {/* ── Debris dots — anchored at the tumor centre (110, 55)
              and drift toward DEBRIS_DRIFT[i] during LYSE/CLEAR. */}
        {DEBRIS_DRIFT.map((d, i) => {
          const x = 110 + (d.x - 110) * debrisDriftT;
          const y = 55 + (d.y - 55) * debrisDriftT;
          return (
            <circle
              key={`debris-${i}`}
              cx={x}
              cy={y}
              r={2.4 - 0.6 * debrisDriftT}
              fill="currentColor"
              fillOpacity={debrisOpacity}
              stroke="none"
              style={{
                transition: noTransition ?? "cx 900ms ease, cy 900ms ease, r 700ms ease, fill-opacity 700ms ease",
              }}
            />
          );
        })}

        {/* ── Stage label + sub-label */}
        <g fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
          <text x="65" y="108" textAnchor="middle" fontSize="7" fontWeight="700" letterSpacing="1.3">
            {info.label}
          </text>
          <text x="65" y="119" textAnchor="middle" fontSize="5.6" opacity="0.55" letterSpacing="0.4">
            {info.sub}
          </text>
        </g>

        {/* ── Stage dots */}
        <g
          transform="translate(47 132)"
          role="progressbar"
          aria-label={`Cycle stage ${stageIdx + 1} of ${STAGES.length}: ${info.label}`}
          aria-valuenow={stageIdx + 1}
          aria-valuemin={1}
          aria-valuemax={STAGES.length}
        >
          {STAGES.map((_, i) => (
            <circle
              key={i}
              cx={i * 9}
              cy={0}
              r="1.5"
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
