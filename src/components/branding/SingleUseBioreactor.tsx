"use client";

/**
 * SingleUseBioreactor — four-stage looping animation of a single-use
 * bioreactor (SUB) campaign. Pre-sterilised bag mounted in a steel
 * holder → cells seeded + process runs → product harvested → spent
 * bag swapped out for the next campaign (no CIP/SIP between runs).
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["mount", "seed", "harvest", "swap"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  mount:   { label: "MOUNT",    sub: "2000 L · pre-sterile",  duration: 2400 },
  seed:    { label: "SEED",     sub: "5 × 10⁵ cells/mL",      duration: 2600 },
  harvest: { label: "HARVEST",  sub: "TFF · clarify",         duration: 2800 },
  swap:    { label: "SWAP",     sub: "no CIP · next bag in",  duration: 2400 },
};

interface Props { size?: number; className?: string; }

export function SingleUseBioreactor({ size = 180, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  return (
    <div className={className}>
      <svg
        width={size}
        height={size * (170 / 180)}
        viewBox="0 0 180 170"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        role="img"
        aria-label={`Single-use bioreactor — ${info.label}`}
      >
        {/* Steel holder — vertical frame */}
        <path d="M 64 38 L 64 116 L 116 116 L 116 38" strokeWidth="0.9" />
        <path d="M 60 116 L 120 116" strokeWidth="0.7" />
        <path d="M 60 116 L 60 124 M 120 116 L 120 124" strokeWidth="0.7" />

        {/* The bag — empty / filled / harvested / swapped per stage */}
        <g style={{ transition: noTransition ?? "fill 500ms ease, fill-opacity 500ms ease" }}>
          <path
            d="M 68 44 Q 90 40 112 44 L 112 110 Q 90 114 68 110 Z"
            stroke="#7dd3fc"
            strokeWidth="0.8"
            fill={
              stage === "seed" ? "#86efac" :
              stage === "harvest" ? "#fbbf24" :
              "#7dd3fc"
            }
            fillOpacity={
              stage === "mount" ? 0.10 :
              stage === "swap" ? 0.05 :
              0.32
            }
          />
        </g>

        {/* Stage 2 — cell dots inside the bag */}
        <g opacity={stage === "seed" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          {[
            [78, 60], [88, 56], [98, 62], [108, 58],
            [74, 72], [86, 76], [98, 70], [108, 76],
            [82, 88], [94, 92], [106, 86],
            [80, 100], [96, 104], [108, 98],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="1.3" fill="#359f7a" stroke="none" opacity="0.9" />
          ))}
        </g>

        {/* Stage 3 — harvest tap + flow arrow */}
        <g opacity={stage === "harvest" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <line x1="116" y1="98" x2="138" y2="98" stroke="#fbbf24" strokeWidth="0.7" />
          <path d="M 134 95 L 138 98 L 134 101" stroke="#fbbf24" strokeWidth="0.7" fill="none" />
          <rect x="138" y="92" width="14" height="14" rx="1.5" stroke="#fbbf24" strokeWidth="0.55" fill="#fbbf24" fillOpacity="0.2" />
          <text x="145" y="100" textAnchor="middle" fontSize="3.4" fill="#fbbf24" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">TFF</text>
        </g>

        {/* Stage 4 — swap: old bag fading, new bag coming */}
        <g opacity={stage === "swap" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <text x="90" y="78" textAnchor="middle" fontSize="9" fill="#86efac" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontWeight="700">⟲</text>
          <text x="90" y="90" textAnchor="middle" fontSize="3.4" fill="#86efac" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">swap-in next campaign</text>
        </g>

        <g fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
          <text x="90" y="134" textAnchor="middle" fontSize="6.8" fontWeight="700" letterSpacing="1.3">{info.label}</text>
          <text x="90" y="146" textAnchor="middle" fontSize="5.6" opacity="0.55" letterSpacing="0.4">{info.sub}</text>
        </g>

        <g
          transform="translate(72 158)"
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
              opacity={i === stageIdx ? 1 : 0.3} stroke="none"
              style={{ transition: noTransition ?? "opacity 300ms ease, fill 300ms ease" }}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
