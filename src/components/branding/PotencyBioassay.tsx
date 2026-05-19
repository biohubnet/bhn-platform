"use client";

/**
 * PotencyBioassay — four-stage looping animation of a cell-based
 * potency assay. Cells are seeded, dosed with a serial dilution
 * of test article + reference standard, response is measured, and
 * a relative potency is calculated against the reference curve.
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["seed", "dose", "respond", "potency"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  seed:    { label: "SEED",       sub: "reporter cells",          duration: 2400 },
  dose:    { label: "DOSE",       sub: "8-point · ½ log",         duration: 2400 },
  respond: { label: "RESPONSE",   sub: "luciferase · 6 h",        duration: 2800 },
  potency: { label: "% POTENCY",  sub: "rel ref · 102 %",         duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function PotencyBioassay({ size = 180, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  const showDose = stage === "dose" || stage === "respond" || stage === "potency";
  const showCurve = stage === "respond" || stage === "potency";
  const showPotency = stage === "potency";

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
        aria-label={`Potency bioassay — ${info.label}`}
      >
        {/* Microplate strip — 8 wells */}
        <g>
          {[28, 40, 52, 64, 76, 88, 100, 112].map((x, i) => (
            <circle
              key={x}
              cx={x}
              cy="40"
              r="4.4"
              strokeWidth="0.6"
              opacity="0.65"
              fill={showDose ? `rgba(125, 211, 252, ${0.5 - i * 0.05})` : "transparent"}
              style={{ transition: noTransition ?? "fill 500ms ease" }}
            />
          ))}
          <text x="20" y="42" textAnchor="end" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.65">test</text>
          {[28, 40, 52, 64, 76, 88, 100, 112].map((x, i) => (
            <circle
              key={`r-${x}`}
              cx={x}
              cy="56"
              r="4.4"
              strokeWidth="0.6"
              opacity="0.65"
              fill={showDose ? `rgba(134, 239, 172, ${0.5 - i * 0.05})` : "transparent"}
              style={{ transition: noTransition ?? "fill 500ms ease" }}
            />
          ))}
          <text x="20" y="58" textAnchor="end" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.65">ref</text>
        </g>

        {/* Response curve plot */}
        <g opacity="0.6">
          <line x1="22" y1="118" x2="158" y2="118" strokeWidth="0.55" />
          <line x1="22" y1="118" x2="22" y2="74" strokeWidth="0.55" />
          <text x="158" y="128" textAnchor="end" fontSize="4.2" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">log [conc]</text>
          <text x="14" y="78" fontSize="4.2" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">RLU</text>
        </g>

        {/* Curves */}
        <g opacity={showCurve ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <path d="M 22 116 Q 50 116, 70 112 Q 86 100, 96 88 Q 110 78, 138 76 Q 156 76, 158 76" stroke="#86efac" strokeWidth="0.85" fill="none" />
          <path d="M 22 116 Q 56 116, 76 112 Q 90 100, 102 88 Q 116 78, 144 76 Q 156 76, 158 76" stroke="#7dd3fc" strokeWidth="0.85" fill="none" strokeDasharray="2 1.5" />
          <text x="160" y="78" textAnchor="end" fontSize="4.2" fill="#86efac" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">ref</text>
          <text x="160" y="88" textAnchor="end" fontSize="4.2" fill="#7dd3fc" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">test</text>
        </g>

        {/* % Potency badge */}
        <g opacity={showPotency ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <rect x="124" y="84" width="40" height="20" rx="3" stroke="#86efac" strokeWidth="0.95" fill="#86efac" fillOpacity="0.16" />
          <text x="144" y="92" textAnchor="middle" fontSize="4.6" fill="#86efac" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" letterSpacing="0.5">% POTENCY</text>
          <text x="144" y="102" textAnchor="middle" fontSize="6.4" fill="#86efac" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontWeight="700">102 %</text>
        </g>

        {/* Stage label */}
        <g fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
          <text x="90" y="138" textAnchor="middle" fontSize="6.8" fontWeight="700" letterSpacing="1.3">{info.label}</text>
          <text x="90" y="150" textAnchor="middle" fontSize="5.6" opacity="0.55" letterSpacing="0.4">{info.sub}</text>
        </g>

        <g
          transform="translate(72 162)"
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
