"use client";

/**
 * AntibodyBinding — four-stage looping animation of an IgG
 * antibody recognising and binding its cognate antigen, then
 * releasing and resetting. The classic "Fab arm engages epitope"
 * moment, told as a process.
 *
 * Stages:
 *   1. CIRCULATING — antibody floating; the antigen is far off
 *      to the lower-right (or invisible)
 *   2. APPROACHING — antigen drifts in toward the right Fab tip
 *   3. BOUND       — antigen is engaged at the Fab paratope;
 *                    paratope dot brightens / scales up to
 *                    suggest the conformational lock
 *   4. RELEASE     — antigen detaches and drifts off to the
 *                    upper-right; cycle loops
 *
 * The antibody geometry mirrors the static `Antibody` glyph
 * (two heavy chains, two light chains, hinge, disulfide bonds,
 * paratope dots, Fc base). The animation layers the antigen on
 * top with transitioned position + opacity.
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["circulating", "approaching", "bound", "release"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  circulating: { label: "IgG · CIRCULATING", sub: "scanning for antigen", duration: 3000 },
  approaching: { label: "ANTIGEN APPROACH",  sub: "diffusion",            duration: 2400 },
  bound:       { label: "ANTIGEN BOUND",     sub: "Kd ≈ 10⁻⁹ M",          duration: 3400 },
  release:     { label: "RELEASED",          sub: "off-rate koff",        duration: 2400 },
};

interface Props {
  size?: number;
  className?: string;
}

export function AntibodyBinding({ size = 130, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  // Antigen target — engages the RIGHT Fab tip, which on the
  // antibody silhouette sits roughly at (76, 11) in the viewBox.
  // Per-stage position (translate3d) + opacity.
  const target = stageTarget(stage);

  // Paratope brightness — the right Fab tip dot brightens when
  // engaged (bound) to suggest the conformational lock.
  const rightParatopeBright = stage === "bound";

  return (
    <div className={className}>
      <svg
        width={size}
        height={size * (170 / 130)}
        viewBox="0 0 130 170"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        role="img"
        aria-label={`Antibody binding cycle — ${info.label}`}
      >
        {/* ── Antibody geometry — same vocabulary as the static
              `Antibody` glyph, shifted right by 20px in the
              viewBox to leave room for the antigen-approach trail
              on the right side. */}
        <g transform="translate(20 0)">
          {/* Heavy chains */}
          <path d="M 14 12 L 41 50 L 41 96 Q 41 104, 45 106" />
          <path d="M 76 12 L 49 50 L 49 96 Q 49 104, 45 106" />
          {/* Light chains */}
          <path d="M 22 14 L 43 46" strokeWidth="1.3" opacity="0.78" />
          <path d="M 68 14 L 47 46" strokeWidth="1.3" opacity="0.78" />
          {/* Binding-site hooks at Fab tips */}
          <path d="M 9 12 Q 11 6, 17 7" strokeWidth="1.3" fill="none" />
          <path d="M 81 12 Q 79 6, 73 7" strokeWidth="1.3" fill="none" />
          {/* Left paratope */}
          <circle
            cx="14" cy="11" r="2.5"
            fill="currentColor" fillOpacity="0.55" stroke="none"
          />
          {/* Right paratope — brightens when engaged */}
          <circle
            cx="76" cy="11"
            r={rightParatopeBright ? 3.4 : 2.5}
            fill="currentColor"
            fillOpacity={rightParatopeBright ? 1 : 0.55}
            stroke="none"
            style={{ transition: noTransition ?? "r 500ms ease, fill-opacity 500ms ease" }}
          />
          {/* Hinge */}
          <circle cx="45" cy="50" r="2.6" fill="currentColor" fillOpacity="0.55" stroke="none" />
          {/* Disulfide bonds */}
          <line x1="41" y1="60" x2="49" y2="60" strokeWidth="1.05" strokeDasharray="1.6 1.4" opacity="0.65" />
          <line x1="41" y1="66" x2="49" y2="66" strokeWidth="1.05" strokeDasharray="1.6 1.4" opacity="0.65" />
          <line x1="41" y1="84" x2="49" y2="84" strokeWidth="0.9"  strokeDasharray="1.4 1.4" opacity="0.45" />
          {/* Heavy-light disulfide ticks */}
          <line x1="31" y1="36" x2="37" y2="40" strokeWidth="0.83" opacity="0.45" />
          <line x1="59" y1="36" x2="53" y2="40" strokeWidth="0.83" opacity="0.45" />
          {/* Fc base */}
          <ellipse cx="45" cy="106" rx="8" ry="3.2" fill="currentColor" fillOpacity="0.32" stroke="none" />
        </g>

        {/* ── Antigen — small irregular polygon. Per-stage
              translate + opacity tween in over the trail
              between far-position and the right Fab paratope. */}
        <g
          style={{
            transition: noTransition ?? "transform 900ms ease, opacity 700ms ease",
            transform: `translate3d(${target.tx}px, ${target.ty}px, 0)`,
            opacity: target.op,
          }}
        >
          {/* Antigen base position is right at the paratope —
                (96, 11) in the viewBox. Per-stage translate
                moves it AWAY from that engaged position. */}
          <g transform="translate(96 11)">
            <path
              d="M -3 -4 L 3 -4 L 5 0 L 3 4 L -3 4 L -5 0 Z"
              fill="currentColor"
              fillOpacity="0.65"
              stroke="currentColor"
              strokeWidth="0.9"
            />
            {/* A small handle / epitope marker on top */}
            <circle cx="0" cy="-6" r="1.4" fill="currentColor" fillOpacity="0.85" stroke="none" />
          </g>
        </g>

        {/* ── Stage label + sub-label */}
        <g fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
          <text x="65" y="138" textAnchor="middle" fontSize="7" fontWeight="700" letterSpacing="1.3">
            {info.label}
          </text>
          <text x="65" y="150" textAnchor="middle" fontSize="5.8" opacity="0.55" letterSpacing="0.4">
            {info.sub}
          </text>
        </g>

        {/* ── Stage dots */}
        <g
          transform="translate(47 162)"
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

/** Per-stage antigen position + opacity. Base position is
 *  already at the paratope (96, 11); tx/ty shift it from there. */
function stageTarget(stage: Stage): { tx: number; ty: number; op: number } {
  switch (stage) {
    case "circulating":
      return { tx: 28, ty: 86, op: 0 };
    case "approaching":
      return { tx: 18, ty: 32, op: 0.85 };
    case "bound":
      return { tx: 0, ty: 0, op: 1 };
    case "release":
      return { tx: 18, ty: -22, op: 0.4 };
  }
}
