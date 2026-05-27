"use client";

/**
 * PatientReportedOutcomes — four-stage looping animation of an
 * ePRO (electronic patient-reported outcomes) collection cycle.
 * Patient answers daily questionnaire on a phone → data submits to
 * the trial server → scores aggregate over time → endpoint analysis
 * compares to baseline.
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["daily", "submit", "aggregate", "endpoint"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  daily:     { label: "DAILY",     sub: "ePRO · 5 items",       duration: 2400 },
  submit:    { label: "SUBMIT",    sub: "encrypted upload",     duration: 2400 },
  aggregate: { label: "AGGREGATE", sub: "trajectory plot",      duration: 2600 },
  endpoint:  { label: "ENDPOINT",  sub: "Δ vs. baseline",       duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function PatientReportedOutcomes({ size = 180, className }: Props) {
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
        aria-label={`Patient-reported outcomes — ${info.label}`}
      >
        {/* Phone outline — always visible */}
        <rect x="32" y="36" width="40" height="68" rx="4" strokeWidth="0.85" />
        <line x1="42" y1="98" x2="62" y2="98" strokeWidth="0.6" opacity="0.55" />
        <rect x="46" y="40" width="12" height="2" rx="1" stroke="currentColor" strokeWidth="0.4" fill="currentColor" fillOpacity="0.3" />

        {/* Stage 1 — questionnaire on phone */}
        <g opacity={stage === "daily" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i}>
              <text x="38" y={52 + i * 9} fontSize="3" fill="#7dd3fc" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">Q{i + 1}</text>
              {[0, 1, 2, 3, 4].map((j) => (
                <circle
                  key={j}
                  cx={48 + j * 5}
                  cy={50 + i * 9}
                  r="1"
                  fill={j === (i + 2) % 5 ? "#7dd3fc" : "none"}
                  stroke="#7dd3fc"
                  strokeWidth="0.35"
                  opacity="0.85"
                />
              ))}
            </g>
          ))}
        </g>

        {/* Stage 2 — upload arrow */}
        <g opacity={stage === "submit" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <path d="M 76 70 L 120 70" stroke="#86efac" strokeWidth="0.7" strokeDasharray="3 2" />
          <path d="M 116 67 L 120 70 L 116 73" stroke="#86efac" strokeWidth="0.7" fill="none" />
          <rect x="120" y="58" width="34" height="24" rx="2" stroke="#86efac" strokeWidth="0.7" fill="#86efac" fillOpacity="0.12" />
          <text x="137" y="70" textAnchor="middle" fontSize="3.6" fill="#86efac" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">trial server</text>
          <text x="137" y="76" textAnchor="middle" fontSize="3" fill="#86efac" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.75">21 CFR Part 11</text>
        </g>

        {/* Stage 3 — aggregate trajectory plot */}
        <g opacity={stage === "aggregate" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <g transform="translate(86 38)">
            <line x1="0" y1="0" x2="0" y2="56" strokeWidth="0.55" opacity="0.6" />
            <line x1="0" y1="56" x2="64" y2="56" strokeWidth="0.55" opacity="0.6" />
            <path d="M 0 18 Q 14 14 26 22 Q 38 30 50 28 Q 60 26 64 30" stroke="#7dd3fc" strokeWidth="0.85" fill="none" />
            {[0, 14, 26, 38, 50, 64].map((x, i) => (
              <circle key={i} cx={x} cy={[18, 14, 22, 30, 28, 30][i]} r="1.3" fill="#7dd3fc" stroke="none" />
            ))}
            <text x="-3" y="6" fontSize="3.2" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.55">score</text>
            <text x="64" y="62" textAnchor="end" fontSize="3.2" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.55">week 12</text>
          </g>
        </g>

        {/* Stage 4 — endpoint */}
        <g opacity={stage === "endpoint" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <rect x="86" y="58" width="64" height="24" rx="1.5" stroke="#86efac" strokeWidth="0.7" fill="#86efac" fillOpacity="0.18" />
          <text x="118" y="68" textAnchor="middle" fontSize="4.6" fill="#86efac" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontWeight="700">Δ −18.4</text>
          <text x="118" y="76" textAnchor="middle" fontSize="3.4" fill="#86efac" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">vs. baseline · p &lt; .001</text>
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
