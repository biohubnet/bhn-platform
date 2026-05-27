"use client";

/**
 * IrbReviewCycle — four-stage looping animation of the IRB /
 * Research Ethics Board review cycle (academic + commercial trials).
 * Protocol submitted → reviewed by an ethics panel → revised on
 * stipulations → final approval stamp.
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["submit", "review", "revise", "approve"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  submit:  { label: "SUBMIT",   sub: "protocol v1.0",      duration: 2400 },
  review:  { label: "REVIEW",   sub: "panel · n = 7",      duration: 2600 },
  revise:  { label: "REVISE",   sub: "stipulations · v1.1",duration: 2600 },
  approve: { label: "APPROVE",  sub: "REB # 24-118",       duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function IrbReviewCycle({ size = 180, className }: Props) {
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
        aria-label={`IRB review — ${info.label}`}
      >
        {/* Protocol document (left) */}
        <g transform="translate(22 38)">
          <rect x="0" y="0" width="34" height="44" rx="1" />
          <line x1="4" y1="8" x2="30" y2="8" strokeWidth="0.5" />
          <line x1="4" y1="14" x2="26" y2="14" strokeWidth="0.5" opacity="0.7" />
          <line x1="4" y1="20" x2="30" y2="20" strokeWidth="0.5" opacity="0.55" />
          <line x1="4" y1="26" x2="28" y2="26" strokeWidth="0.5" opacity="0.55" />
          <line x1="4" y1="32" x2="22" y2="32" strokeWidth="0.5" opacity="0.4" />
        </g>

        {/* Review panel — 3 figures around a small table */}
        <g transform="translate(78 38)" opacity={stage === "review" || stage === "revise" ? 1 : 0.25} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          {[0, 1, 2].map((i) => (
            <g key={i} transform={`translate(${i * 14} 0)`}>
              <circle cx="4" cy="6" r="2.6" strokeWidth="0.7" />
              <path d="M 0 18 L 0 12 Q 4 9 8 12 L 8 18" strokeWidth="0.7" />
            </g>
          ))}
          <rect x="-2" y="20" width="34" height="10" rx="1" strokeWidth="0.6" />
        </g>

        {/* Stamp / approval area (right) */}
        <g transform="translate(132 42)">
          <rect x="0" y="0" width="32" height="36" rx="1" strokeWidth="0.7" strokeDasharray="3 2" opacity="0.4" />
          <text x="16" y="22" textAnchor="middle" fontSize="6" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.45">REB</text>
        </g>

        {/* Stage-specific overlays */}
        <g opacity={stage === "submit" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <path d="M 56 60 L 78 60" strokeWidth="0.6" strokeDasharray="2 2" stroke="#7dd3fc" />
          <path d="M 75 57 L 78 60 L 75 63" strokeWidth="0.6" stroke="#7dd3fc" fill="none" />
        </g>

        <g opacity={stage === "review" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <circle cx="46" cy="60" r="3.5" stroke="#fbbf24" strokeWidth="0.6" />
          <circle cx="46" cy="60" r="6" stroke="#fbbf24" strokeWidth="0.45" opacity="0.5" />
          <text x="46" y="92" textAnchor="middle" fontSize="4" fill="#fbbf24" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" letterSpacing="0.3">reading…</text>
        </g>

        <g opacity={stage === "revise" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <line x1="26" y1="46" x2="50" y2="46" stroke="#fb7185" strokeWidth="0.7" />
          <line x1="26" y1="52" x2="44" y2="52" stroke="#fb7185" strokeWidth="0.7" />
          <text x="46" y="92" textAnchor="middle" fontSize="4" fill="#fb7185" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" letterSpacing="0.3">stipulations 3</text>
        </g>

        <g opacity={stage === "approve" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <g transform="translate(132 42)">
            <rect x="0" y="0" width="32" height="36" rx="1" stroke="#86efac" strokeWidth="0.9" fillOpacity="0.1" fill="#86efac" />
            <text x="16" y="18" textAnchor="middle" fontSize="6.2" fill="#86efac" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontWeight="700">APPROVED</text>
            <text x="16" y="28" textAnchor="middle" fontSize="3.6" fill="#86efac" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.85">REB · 24-118</text>
          </g>
        </g>

        {/* Stage label */}
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
