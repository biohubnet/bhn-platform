"use client";

/**
 * MscCultureCycle — a six-stage looping animation that tells the
 * full MSC passaging story in one corner of the login backdrop:
 *
 *   1. SEED       — a few cells in fresh media (P0 · seeded)
 *   2. GROW       — proliferating, with little "+1" dividing
 *                   indicators
 *   3. CONFLUENT  — 80 % confluent monolayer, ready to passage
 *   4. TRYPSIN    — a green wash flows in, cells round up (they
 *                   detach from the substrate as the protease cuts
 *                   adhesion proteins)
 *   5. ASPIRATE   — the pipette descends and a stream of cells is
 *                   drawn up into it
 *   6. RE-SEED    — pipette pulls back, only a few cells remain
 *                   in the new dish (P1)
 *
 * Then the cycle loops back to SEED.
 *
 * No external lib — pure React `useState` + `setTimeout`, with CSS
 * transitions on the SVG attributes so each stage hand-off looks
 * smooth instead of cut. Stage timing is stored in `STAGE_INFO`
 * so it's easy to retune.
 */

import { useEffect, useState } from "react";

const STAGES = [
  "seed",
  "grow",
  "confluent",
  "trypsin",
  "aspirate",
  "reseed",
] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  seed:      { label: "P0 · SEEDED",     sub: "5×10³ cells/cm²",     duration: 3400 },
  grow:      { label: "PROLIFERATING",   sub: "doubling…",            duration: 3600 },
  confluent: { label: "80% CONFLUENT",   sub: "ready to passage",     duration: 4200 },
  trypsin:   { label: "TRYPSIN · 0.25%", sub: "5 min @ 37°C",         duration: 3600 },
  aspirate:  { label: "ASPIRATE",        sub: "pipette out cells",    duration: 4200 },
  reseed:    { label: "RE-SEED · P1",    sub: "fresh flask",          duration: 3000 },
};

/** Pseudo-randomised cell positions inside the dish ellipse. They
 *  cluster naturally without overlapping much. Listed in the order
 *  they appear as cells divide. */
const CELL_POSITIONS: Array<{ x: number; y: number }> = [
  { x: 50,  y: 110 }, { x: 86,  y: 102 }, { x: 116, y: 116 }, { x: 68,  y: 132 },
  { x: 100, y: 138 }, { x: 44,  y: 138 }, { x: 78,  y: 148 }, { x: 116, y: 150 },
  { x: 58,  y: 96  }, { x: 92,  y: 122 }, { x: 70,  y: 162 }, { x: 108, y: 162 },
  { x: 38,  y: 122 }, { x: 124, y: 130 }, { x: 50,  y: 154 }, { x: 124, y: 100 },
];

interface Props {
  size?: number;
  className?: string;
}

export function MscCultureCycle({ size = 200, className }: Props) {
  const [stageIdx, setStageIdx] = useState(0);

  useEffect(() => {
    const stage = STAGES[stageIdx];
    const t = window.setTimeout(() => {
      setStageIdx((i) => (i + 1) % STAGES.length);
    }, STAGE_INFO[stage].duration);
    return () => window.clearTimeout(t);
  }, [stageIdx]);

  const stage = STAGES[stageIdx];
  const info = STAGE_INFO[stage];

  // How many cells to render this stage. Fades nicely thanks to
  // the per-cell opacity transition below.
  const visibleCount =
    stage === "seed" ? 4 :
    stage === "grow" ? 9 :
    stage === "reseed" ? 3 :
    16;

  // Cells go from flat/spread (blue tint) to rounded (green tint)
  // during trypsin/aspirate stages.
  const isDetaching = stage === "trypsin" || stage === "aspirate";
  const cellR = isDetaching ? 3.4 : 2.4;
  const cellFill = isDetaching ? "#86efac" : "#7dd3fc";
  const cellFillOpacity = isDetaching ? 0.7 : 0.5;
  const cellStrokeOpacity = isDetaching ? 0.85 : 0.75;

  // Trypsin pool — green wash inside the dish.
  const trypsinOpacity = isDetaching ? 0.16 : 0;

  // Pipette descends from above. Off-screen when not in use, lower
  // and inside the dish when aspirating/reseeding.
  const pipetteVisible = stage === "aspirate" || stage === "reseed";
  const pipetteY =
    stage === "aspirate" ? 8 :
    stage === "reseed" ? -8 :
    -90;

  // Cell stream being drawn up into the pipette.
  const streamOpacity = stage === "aspirate" ? 0.85 : 0;
  // Fresh-cell droplet falling out of the pipette during reseed.
  const dropletOpacity = stage === "reseed" ? 0.85 : 0;

  return (
    <div className={className}>
      <svg
        width={size}
        height={size * (260 / 180)}
        viewBox="0 0 180 260"
        fill="none"
        role="img"
        aria-label={`MSC passaging cycle — ${info.label}`}
      >
        {/* ── Dish outline ──────────────────────────────────────── */}
        <ellipse
          cx="90" cy="140" rx="78" ry="62"
          stroke="currentColor" strokeWidth="1.2"
          opacity="0.7"
        />
        {/* Inner media line — dashed */}
        <ellipse
          cx="90" cy="140" rx="72" ry="56"
          stroke="currentColor" strokeWidth="0.7"
          strokeDasharray="2 3" opacity="0.35"
        />

        {/* ── Trypsin green wash ────────────────────────────────── */}
        <ellipse
          cx="90" cy="140" rx="74" ry="58"
          fill="#86efac" fillOpacity={trypsinOpacity}
          style={{ transition: "fill-opacity 700ms ease" }}
        />

        {/* ── Cells ─────────────────────────────────────────────── */}
        <g style={{ transition: "opacity 500ms ease" }}>
          {CELL_POSITIONS.map((c, i) => {
            const visible = i < visibleCount;
            return (
              <circle
                key={i}
                cx={c.x} cy={c.y}
                r={cellR}
                fill={cellFill}
                fillOpacity={visible ? cellFillOpacity : 0}
                stroke={cellFill}
                strokeWidth="0.8"
                strokeOpacity={visible ? cellStrokeOpacity : 0}
                style={{
                  transition:
                    "r 500ms ease, fill 500ms ease, stroke 500ms ease, fill-opacity 500ms ease, stroke-opacity 500ms ease",
                }}
              />
            );
          })}
        </g>

        {/* ── "+1" dividing indicators (seed + grow only) ───────── */}
        {(stage === "seed" || stage === "grow") &&
          CELL_POSITIONS.slice(0, 2).map((c, i) => (
            <text
              key={`div-${i}`}
              x={c.x + 5}
              y={c.y - 4}
              fontSize="6"
              fill="#7dd3fc"
              stroke="none"
              opacity="0.75"
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            >
              +1
            </text>
          ))}

        {/* ── Pipette ───────────────────────────────────────────── */}
        <g
          style={{
            transform: `translateY(${pipetteY}px)`,
            transition: "transform 1100ms cubic-bezier(.5,.1,.4,1), opacity 300ms ease",
            opacity: pipetteVisible ? 1 : 0,
          }}
        >
          {/* Body */}
          <rect
            x="78" y="0" width="24" height="62"
            rx="2"
            stroke="currentColor" strokeWidth="1.2"
          />
          {/* Tapered tip pointing down to the dish */}
          <path
            d="M 78 62 L 90 118 L 102 62 Z"
            stroke="currentColor" strokeWidth="1.2"
          />
          {/* Volume marks */}
          <g stroke="currentColor" strokeWidth="0.7" opacity="0.55">
            <line x1="78" y1="14" x2="84" y2="14" />
            <line x1="78" y1="24" x2="84" y2="24" />
            <line x1="78" y1="34" x2="84" y2="34" />
            <line x1="78" y1="44" x2="84" y2="44" />
            <line x1="78" y1="54" x2="84" y2="54" />
          </g>
          {/* Liquid column inside the pipette body when aspirating */}
          {stage === "aspirate" && (
            <rect
              x="80" y="40" width="20" height="22"
              fill="#86efac" fillOpacity="0.35"
            />
          )}
        </g>

        {/* ── Aspirate stream — column of cells being drawn up ──── */}
        <g
          opacity={streamOpacity}
          style={{ transition: "opacity 500ms ease" }}
        >
          <path
            d="M 90 118 Q 88 130, 90 140"
            stroke="#86efac" strokeWidth="1.4"
            strokeLinecap="round" fill="none" opacity="0.6"
          />
          <circle cx="90" cy="122" r="1.3" fill="#86efac" opacity="0.8" />
          <circle cx="89" cy="128" r="1.2" fill="#86efac" opacity="0.7" />
          <circle cx="91" cy="134" r="1.1" fill="#86efac" opacity="0.6" />
        </g>

        {/* ── Re-seed droplet — fresh cells falling out the tip ─── */}
        <g
          opacity={dropletOpacity}
          style={{ transition: "opacity 500ms ease" }}
        >
          <path
            d="M 90 110 L 90 132"
            stroke="#7dd3fc" strokeWidth="1.4"
            strokeLinecap="round" opacity="0.55"
          />
          <circle cx="90" cy="124" r="1.4" fill="#7dd3fc" opacity="0.85" />
          <circle cx="91" cy="130" r="1.1" fill="#7dd3fc" opacity="0.7" />
        </g>

        {/* ── Stage label ───────────────────────────────────────── */}
        <g
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          fill="currentColor" stroke="none"
        >
          <text
            x="90" y="232"
            textAnchor="middle"
            fontSize="7.5" fontWeight="700"
            letterSpacing="1.3"
          >
            {info.label}
          </text>
          <text
            x="90" y="246"
            textAnchor="middle"
            fontSize="6"
            opacity="0.55"
            letterSpacing="0.4"
          >
            {info.sub}
          </text>
        </g>

        {/* ── Stage dots — progress along the cycle ─────────────── */}
        <g transform="translate(60 256)">
          {STAGES.map((_, i) => (
            <circle
              key={i}
              cx={i * 12}
              cy={0}
              r="1.6"
              fill={i === stageIdx ? "#86efac" : "currentColor"}
              opacity={i === stageIdx ? 1 : 0.3}
              style={{ transition: "opacity 300ms ease, fill 300ms ease" }}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
