"use client";

/**
 * StemCellDifferentiation — four-stage looping animation of iPSC →
 * neural lineage differentiation. A small colony of round iPSCs
 * progresses through neural progenitor to a mature, neurite-bearing
 * neuron.
 *
 * Stages:
 *   1. IPSC        — tight round colony of cells
 *   2. ECTODERM    — cells lose tight packing; small protrusions begin
 *   3. PROGENITOR  — bipolar neural progenitor shape
 *   4. NEURON      — mature neuron with dendrites + axon
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["ipsc", "ectoderm", "progenitor", "neuron"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  ipsc:       { label: "iPSC",        sub: "OCT4+ · NANOG+",       duration: 2600 },
  ectoderm:   { label: "ECTODERM",    sub: "PAX6+",                duration: 2600 },
  progenitor: { label: "NEURAL PROG", sub: "NESTIN+ · SOX2+",      duration: 2800 },
  neuron:     { label: "NEURON",      sub: "MAP2+ · TUJ1+",        duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function StemCellDifferentiation({ size = 180, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  return (
    <div className={className}>
      <svg width={size} height={size * (170 / 180)} viewBox="0 0 180 170" fill="none" stroke="currentColor"
        strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round"
        role="img" aria-label={`Stem cell differentiation — ${info.label}`}>
        {/* iPSC colony */}
        <g opacity={stage === "ipsc" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}
          transform="translate(90 60)">
          {[
            { x: -10, y: -10 }, { x: 0, y: -12 }, { x: 10, y: -10 },
            { x: -14, y: 0 },   { x: -4, y: -2 }, { x: 6, y: -2 },   { x: 14, y: 0 },
            { x: -10, y: 10 },  { x: 0, y: 12 },  { x: 10, y: 10 },
          ].map((c, i) => (
            <circle key={i} cx={c.x} cy={c.y} r="4" stroke="currentColor" strokeWidth="0.65" fill="currentColor" fillOpacity="0.22" />
          ))}
        </g>

        {/* Ectoderm — same colony but more separated, small extensions */}
        <g opacity={stage === "ectoderm" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}
          transform="translate(90 60)">
          {[
            { x: -16, y: -12 }, { x: 0, y: -16 }, { x: 14, y: -10 },
            { x: -20, y: 0 },   { x: -4, y: -4 }, { x: 8, y: 0 },  { x: 18, y: 4 },
            { x: -12, y: 12 },  { x: 4, y: 14 },  { x: 16, y: 12 },
          ].map((c, i) => (
            <g key={i}>
              <circle cx={c.x} cy={c.y} r="3.6" stroke="currentColor" strokeWidth="0.65" fill="currentColor" fillOpacity="0.18" />
              <line x1={c.x} y1={c.y} x2={c.x + (i % 2 === 0 ? 4 : -4)} y2={c.y + (i % 3 === 0 ? -4 : 4)} strokeWidth="0.55" opacity="0.7" />
            </g>
          ))}
        </g>

        {/* Neural progenitor — bipolar cells */}
        <g opacity={stage === "progenitor" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}
          transform="translate(90 60)">
          {[-22, 0, 22].map((cx) => (
            <g key={cx}>
              <ellipse cx={cx} cy="0" rx="4" ry="6" stroke="currentColor" strokeWidth="0.7" fill="currentColor" fillOpacity="0.18" />
              {/* Two opposite processes */}
              <line x1={cx} y1="-6" x2={cx} y2="-18" strokeWidth="0.7" />
              <line x1={cx} y1="6" x2={cx} y2="20" strokeWidth="0.7" />
            </g>
          ))}
        </g>

        {/* Mature neuron */}
        <g opacity={stage === "neuron" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}
          transform="translate(90 60)">
          {/* Soma */}
          <ellipse cx="0" cy="0" rx="9" ry="7" stroke="currentColor" strokeWidth="0.9" fill="currentColor" fillOpacity="0.2" />
          {/* Nucleus */}
          <circle cx="0" cy="0" r="3.2" stroke="currentColor" strokeWidth="0.6" fill="currentColor" fillOpacity="0.35" />
          {/* Dendrites */}
          {[
            "M -8 -3 Q -22 -10, -34 -2",
            "M -6 -6 Q -16 -22, -28 -28",
            "M 8 -3 Q 22 -10, 34 -2",
            "M 6 -6 Q 16 -22, 28 -28",
            "M -6 5 Q -16 18, -30 22",
          ].map((d, i) => (
            <path key={i} d={d} strokeWidth="0.7" fill="none" />
          ))}
          {/* Axon — single long process down */}
          <path d="M 0 7 Q 4 26, -6 44" strokeWidth="0.95" />
          {/* Axon terminal dots */}
          <circle cx="-6" cy="44" r="1.4" fill="currentColor" stroke="none" opacity="0.85" />
        </g>

        <g fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
          <text x="90" y="134" textAnchor="middle" fontSize="6.8" fontWeight="700" letterSpacing="1.3">{info.label}</text>
          <text x="90" y="146" textAnchor="middle" fontSize="5.6" opacity="0.55" letterSpacing="0.4">{info.sub}</text>
        </g>
        <g transform="translate(72 158)" role="progressbar"
          aria-label={`Cycle stage ${stageIdx + 1} of ${STAGES.length}: ${info.label}`}
          aria-valuenow={stageIdx + 1} aria-valuemin={1} aria-valuemax={STAGES.length}>
          {STAGES.map((_, i) => (
            <circle key={i} cx={i * 12} cy={0} r="1.6" fill={i === stageIdx ? "#86efac" : "currentColor"}
              opacity={i === stageIdx ? 1 : 0.3} stroke="none"
              style={{ transition: noTransition ?? "opacity 300ms ease, fill 300ms ease" }} />
          ))}
        </g>
      </svg>
    </div>
  );
}
