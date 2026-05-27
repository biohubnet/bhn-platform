"use client";

/**
 * QualityRiskManagement — four-stage looping animation of ICH Q9
 * quality risk management. Identify hazards → assess probability ×
 * severity on a 5×5 matrix → score and rank → control with mitigations
 * (engineering / procedural / documentation).
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["identify", "assess", "score", "control"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  identify: { label: "IDENTIFY", sub: "ICH Q9 · hazards",    duration: 2400 },
  assess:   { label: "ASSESS",   sub: "P × S · 5×5",         duration: 2600 },
  score:    { label: "SCORE",    sub: "rank · top 3 high",   duration: 2600 },
  control:  { label: "CONTROL",  sub: "CAPA · re-rank",      duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function QualityRiskManagement({ size = 180, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  // 5×5 risk-matrix cells
  const cells: { r: number; c: number; risk: number; colour: string }[] = [];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      const risk = r + c;
      // Risk gradient: green (low) → amber → red
      const colour =
        risk <= 2 ? "#86efac" :
        risk <= 4 ? "#fbbf24" :
        risk <= 6 ? "#fb923c" :
        "#fb7185";
      cells.push({ r, c, risk, colour });
    }
  }

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
        aria-label={`Quality risk management — ${info.label}`}
      >
        {/* Stage 1 — hazard list */}
        <g opacity={stage === "identify" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          {["temperature excursion", "operator error", "cross-contamination", "supply variability", "equipment fail"].map((h, i) => (
            <g key={i} transform={`translate(40 ${42 + i * 12})`}>
              <rect x="0" y="0" width="100" height="9" rx="1.5" stroke="#fbbf24" strokeWidth="0.5" fill="#fbbf24" fillOpacity="0.08" />
              <text x="6" y="6.5" fontSize="3.6" fill="#fbbf24" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">⚠ {h}</text>
            </g>
          ))}
        </g>

        {/* Stage 2-4 — matrix */}
        <g opacity={stage === "identify" ? 0 : 1} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          {cells.map((cell, i) => (
            <rect
              key={i}
              x={50 + cell.c * 16}
              y={40 + cell.r * 12}
              width="14"
              height="10"
              fill={cell.colour}
              fillOpacity="0.32"
              stroke={cell.colour}
              strokeWidth="0.4"
            />
          ))}
          {/* Axes labels */}
          <text x="44" y="36" fontSize="3.2" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.6">P/S</text>
          <text x="44" y="48" fontSize="3" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.55">low</text>
          <text x="44" y="96" fontSize="3" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.55">high</text>
        </g>

        {/* Stage 3 — top-3 markers */}
        <g opacity={stage === "score" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          {[[3, 3], [4, 2], [3, 4]].map(([r, c], i) => (
            <circle
              key={i}
              cx={50 + c * 16 + 7}
              cy={40 + r * 12 + 5}
              r="3.5"
              stroke="#fb7185"
              strokeWidth="1"
              fill="none"
            />
          ))}
        </g>

        {/* Stage 4 — top-3 markers downgraded after CAPA */}
        <g opacity={stage === "control" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          {[[1, 1], [2, 0], [1, 2]].map(([r, c], i) => (
            <circle
              key={i}
              cx={50 + c * 16 + 7}
              cy={40 + r * 12 + 5}
              r="3.5"
              stroke="#86efac"
              strokeWidth="1"
              fill="none"
            />
          ))}
          <text x="158" y="106" textAnchor="end" fontSize="3.4" fill="#86efac" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">CAPA · 3 of 3 downgraded</text>
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
