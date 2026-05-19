"use client";

/**
 * CrisprEditCycle — four-stage looping animation of CRISPR-Cas9
 * gene editing. A guide RNA + Cas9 lobe finds the target on a DNA
 * helix, cuts both strands, repair happens, and an edit appears.
 *
 * Stages:
 *   1. DELIVER   — Cas9-sgRNA complex drifts above the DNA, no contact yet
 *   2. BIND      — complex docks on the target locus; PAM site marked
 *   3. CUT       — both strands sever (DSB shown as a small gap)
 *   4. EDIT      — the gap closes with a green-tinted insertion (HDR
 *                  outcome) — the locus reads as edited.
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["deliver", "bind", "cut", "edit"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  deliver: { label: "Cas9 + sgRNA",   sub: "RNP delivered",     duration: 2400 },
  bind:    { label: "TARGET BOUND",   sub: "PAM · NGG",         duration: 2600 },
  cut:     { label: "DSB",            sub: "double-strand cut", duration: 2400 },
  edit:    { label: "EDIT · HDR",     sub: "donor incorporated", duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function CrisprEditCycle({ size = 160, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  const complexY = stage === "deliver" ? -10 : 0;
  const showGap = stage === "cut";
  const showEdit = stage === "edit";

  return (
    <div className={className}>
      <svg
        width={size}
        height={size * (170 / 160)}
        viewBox="0 0 160 170"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        role="img"
        aria-label={`CRISPR edit cycle — ${info.label}`}
      >
        {/* ── DNA double helix — two sinusoidal backbones with rungs */}
        <g>
          {/* Top strand */}
          <path d="M 14 60 Q 30 50, 46 60 T 78 60 T 110 60 T 142 60" />
          {/* Bottom strand */}
          <path d="M 14 78 Q 30 88, 46 78 T 78 78 T 110 78 T 142 78" />
          {/* Rungs */}
          {[22, 38, 54, 70, 86, 102, 118, 134].map((x, i) => (
            <line
              key={i}
              x1={x} y1={60 + (i % 2 === 0 ? 0 : 0)}
              x2={x} y2={78}
              strokeWidth="0.5" opacity="0.55"
            />
          ))}
        </g>

        {/* PAM marker — small NGG label at the target locus (x ≈ 88) */}
        <g
          opacity={stage === "bind" || stage === "cut" || stage === "edit" ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}
        >
          <line x1="88" y1="56" x2="88" y2="50" strokeWidth="0.5" opacity="0.55" />
          <text
            x="88" y="46"
            fontSize="4.6" textAnchor="middle"
            fill="currentColor" stroke="none"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            opacity="0.7"
          >
            PAM
          </text>
        </g>

        {/* Cas9 + sgRNA complex — a soft lobed shape that descends onto DNA */}
        <g
          style={{
            transition: noTransition ?? "transform 700ms cubic-bezier(.4,.1,.4,1)",
            transform: `translateY(${complexY}px)`,
          }}
        >
          {/* Cas9 lobes */}
          <path
            d="M 70 40 Q 88 20, 106 40 Q 110 56, 88 56 Q 66 56, 70 40 Z"
            stroke="currentColor" strokeWidth="0.9"
            fill="currentColor" fillOpacity="0.10"
          />
          {/* sgRNA — small hairpin descending from the complex into the locus */}
          <path
            d="M 88 56 L 88 60"
            strokeWidth="0.6" opacity="0.7"
          />
          <circle cx="80" cy="34" r="1.4" fill="currentColor" stroke="none" opacity="0.65" />
          <circle cx="96" cy="34" r="1.4" fill="currentColor" stroke="none" opacity="0.65" />
        </g>

        {/* DSB gap — a small light wedge erasing the rungs at the locus */}
        <g
          opacity={showGap ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 400ms ease" }}
        >
          <rect x="83" y="56" width="10" height="24" fill="#fb7185" fillOpacity="0.18" stroke="none" />
          {/* Scissor cut accent lines */}
          <line x1="83" y1="62" x2="93" y2="76" stroke="#fb7185" strokeWidth="0.6" opacity="0.7" />
          <line x1="83" y1="76" x2="93" y2="62" stroke="#fb7185" strokeWidth="0.6" opacity="0.7" />
        </g>

        {/* Edited locus — green insertion accent */}
        <g
          opacity={showEdit ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}
        >
          <rect x="84" y="58" width="8" height="22" fill="#86efac" fillOpacity="0.32" stroke="none" />
          <line x1="84" y1="58" x2="84" y2="80" stroke="#86efac" strokeWidth="0.7" />
          <line x1="92" y1="58" x2="92" y2="80" stroke="#86efac" strokeWidth="0.7" />
          <text
            x="88" y="100"
            fontSize="5"
            textAnchor="middle"
            fill="#86efac" stroke="none"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            letterSpacing="0.5"
          >
            +KI
          </text>
        </g>

        {/* Stage label */}
        <g fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
          <text x="80" y="130" textAnchor="middle" fontSize="7" fontWeight="700" letterSpacing="1.3">{info.label}</text>
          <text x="80" y="142" textAnchor="middle" fontSize="5.8" opacity="0.55" letterSpacing="0.4">{info.sub}</text>
        </g>

        {/* Dots */}
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
              key={i} cx={i * 12} cy={0} r="1.6"
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
