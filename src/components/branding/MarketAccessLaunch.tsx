"use client";

/**
 * MarketAccessLaunch — four-stage looping animation of the market-
 * access launch path for a new therapy. HTA dossier assembled →
 * payer meetings + value story → formulary placement decision →
 * coverage live for claims processing.
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["dossier", "payer", "formulary", "coverage"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  dossier:   { label: "DOSSIER",    sub: "HTA · v1.0",          duration: 2400 },
  payer:     { label: "PAYER",      sub: "value story · meets", duration: 2600 },
  formulary: { label: "FORMULARY",  sub: "tier 2 · PA",         duration: 2400 },
  coverage:  { label: "COVERAGE",   sub: "claims live",         duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function MarketAccessLaunch({ size = 180, className }: Props) {
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
        aria-label={`Market access — ${info.label}`}
      >
        {/* Pipeline arrow underlay */}
        <path d="M 22 70 L 158 70" strokeWidth="0.55" strokeDasharray="2 2" opacity="0.4" />
        <path d="M 154 67 L 158 70 L 154 73" strokeWidth="0.55" opacity="0.5" />

        {/* Stage 1 — HTA dossier */}
        <g transform="translate(22 44)" opacity={stage === "dossier" ? 1 : 0.25} style={{ transition: noTransition ?? "opacity 400ms ease" }}>
          <rect x="0" y="0" width="22" height="30" stroke={stage === "dossier" ? "#7dd3fc" : "currentColor"} strokeWidth="0.65" />
          <line x1="3" y1="6" x2="19" y2="6" stroke={stage === "dossier" ? "#7dd3fc" : "currentColor"} strokeWidth="0.4" />
          <line x1="3" y1="10" x2="17" y2="10" stroke={stage === "dossier" ? "#7dd3fc" : "currentColor"} strokeWidth="0.4" opacity="0.7" />
          <line x1="3" y1="14" x2="19" y2="14" stroke={stage === "dossier" ? "#7dd3fc" : "currentColor"} strokeWidth="0.4" opacity="0.6" />
          <line x1="3" y1="18" x2="17" y2="18" stroke={stage === "dossier" ? "#7dd3fc" : "currentColor"} strokeWidth="0.4" opacity="0.5" />
          <line x1="3" y1="22" x2="19" y2="22" stroke={stage === "dossier" ? "#7dd3fc" : "currentColor"} strokeWidth="0.4" opacity="0.4" />
          <text x="11" y="38" textAnchor="middle" fontSize="3.6" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.6">HTA</text>
        </g>

        {/* Stage 2 — payer (briefcase + meeting bubble) */}
        <g transform="translate(58 44)" opacity={stage === "payer" ? 1 : 0.25} style={{ transition: noTransition ?? "opacity 400ms ease" }}>
          <rect x="0" y="8" width="22" height="22" stroke={stage === "payer" ? "#fbbf24" : "currentColor"} strokeWidth="0.65" />
          <rect x="6" y="3" width="10" height="8" stroke={stage === "payer" ? "#fbbf24" : "currentColor"} strokeWidth="0.55" />
          <line x1="0" y1="18" x2="22" y2="18" stroke={stage === "payer" ? "#fbbf24" : "currentColor"} strokeWidth="0.4" opacity="0.55" />
          <text x="11" y="42" textAnchor="middle" fontSize="3.6" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.6">PAYER</text>
        </g>

        {/* Stage 3 — formulary (tier list) */}
        <g transform="translate(94 44)" opacity={stage === "formulary" ? 1 : 0.25} style={{ transition: noTransition ?? "opacity 400ms ease" }}>
          <rect x="0" y="0" width="22" height="30" stroke={stage === "formulary" ? "#86efac" : "currentColor"} strokeWidth="0.65" />
          {[0, 1, 2, 3].map((i) => (
            <g key={i}>
              <line x1="3" y1={6 + i * 6} x2="19" y2={6 + i * 6} stroke={stage === "formulary" && i === 1 ? "#86efac" : "currentColor"} strokeWidth={stage === "formulary" && i === 1 ? "0.9" : "0.4"} opacity={i === 1 ? 1 : 0.5} />
              <text x="3" y={6 + i * 6 - 1.5} fontSize="2.6" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.45">T{i + 1}</text>
            </g>
          ))}
          <text x="11" y="42" textAnchor="middle" fontSize="3.6" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.6">TIER 2</text>
        </g>

        {/* Stage 4 — coverage check */}
        <g transform="translate(132 44)" opacity={stage === "coverage" ? 1 : 0.25} style={{ transition: noTransition ?? "opacity 400ms ease" }}>
          <rect x="0" y="0" width="26" height="30" stroke={stage === "coverage" ? "#a78bfa" : "currentColor"} strokeWidth="0.65" />
          <path d="M 4 14 L 11 21 L 22 8" stroke={stage === "coverage" ? "#a78bfa" : "currentColor"} strokeWidth="1.2" fill="none" />
          <text x="13" y="42" textAnchor="middle" fontSize="3.6" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.6">COVERED</text>
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
