"use client";

/**
 * AcademicTechTransfer — four-stage looping animation of the
 * academic technology-transfer pipeline (bench discovery → invention
 * disclosure → patent filing → licence to a spinout). The cycle
 * mirrors the standard OTL / TTO workflow that universities run
 * alongside BHN's entrepreneurship pathway.
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["discover", "disclose", "patent", "license"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  discover: { label: "DISCOVER", sub: "lab insight",      duration: 2400 },
  disclose: { label: "DISCLOSE", sub: "invention form",   duration: 2400 },
  patent:   { label: "PATENT",   sub: "PCT · provisional",duration: 2600 },
  license:  { label: "LICENSE",  sub: "spinout · equity", duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function AcademicTechTransfer({ size = 180, className }: Props) {
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
        aria-label={`Academic tech transfer — ${info.label}`}
      >
        {/* University building (left) */}
        <g transform="translate(20 38)">
          <polygon points="0,16 18,4 36,16" strokeWidth="0.7" />
          <rect x="4" y="16" width="28" height="22" strokeWidth="0.7" />
          <rect x="10" y="22" width="4" height="6" strokeWidth="0.5" opacity="0.7" />
          <rect x="22" y="22" width="4" height="6" strokeWidth="0.5" opacity="0.7" />
          <rect x="16" y="30" width="4" height="8" strokeWidth="0.5" opacity="0.7" />
        </g>

        {/* Pipeline arrow */}
        <path d="M 62 60 L 116 60" strokeWidth="0.55" strokeDasharray="2 2" opacity="0.5" />
        <path d="M 112 57 L 116 60 L 112 63" strokeWidth="0.6" />

        {/* Company building (right) */}
        <g transform="translate(122 38)">
          <rect x="0" y="6" width="36" height="32" strokeWidth="0.7" />
          <rect x="6" y="12" width="4" height="4" strokeWidth="0.4" opacity="0.6" />
          <rect x="14" y="12" width="4" height="4" strokeWidth="0.4" opacity="0.6" />
          <rect x="22" y="12" width="4" height="4" strokeWidth="0.4" opacity="0.6" />
          <rect x="6" y="20" width="4" height="4" strokeWidth="0.4" opacity="0.6" />
          <rect x="14" y="20" width="4" height="4" strokeWidth="0.4" opacity="0.6" />
          <rect x="22" y="20" width="4" height="4" strokeWidth="0.4" opacity="0.6" />
        </g>

        {/* Stage-specific overlays */}
        <g opacity={stage === "discover" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <g transform="translate(36 38)">
            <circle cx="0" cy="-2" r="4" stroke="#fbbf24" strokeWidth="0.7" fill="#fbbf24" fillOpacity="0.25" />
            <line x1="0" y1="-9" x2="0" y2="-7" stroke="#fbbf24" strokeWidth="0.6" />
            <line x1="-5" y1="-2" x2="-7" y2="-2" stroke="#fbbf24" strokeWidth="0.6" />
            <line x1="7" y1="-2" x2="5" y2="-2" stroke="#fbbf24" strokeWidth="0.6" />
          </g>
        </g>

        <g opacity={stage === "disclose" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <rect x="78" y="78" width="24" height="14" stroke="#7dd3fc" strokeWidth="0.65" />
          <line x1="80" y1="82" x2="100" y2="82" stroke="#7dd3fc" strokeWidth="0.4" />
          <line x1="80" y1="85" x2="100" y2="85" stroke="#7dd3fc" strokeWidth="0.4" opacity="0.7" />
          <line x1="80" y1="88" x2="92" y2="88" stroke="#7dd3fc" strokeWidth="0.4" opacity="0.55" />
          <text x="90" y="100" textAnchor="middle" fontSize="3.8" fill="#7dd3fc" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">Form 14A</text>
        </g>

        <g opacity={stage === "patent" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <rect x="78" y="78" width="24" height="14" stroke="#86efac" strokeWidth="0.7" fill="#86efac" fillOpacity="0.1" />
          <text x="90" y="89" textAnchor="middle" fontSize="6" fill="#86efac" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontWeight="700">US-PCT</text>
        </g>

        <g opacity={stage === "license" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <text x="90" y="78" textAnchor="middle" fontSize="5" fill="#a78bfa" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" letterSpacing="0.3">8% royalty</text>
          <path d="M 78 86 L 102 86" stroke="#a78bfa" strokeWidth="0.7" />
          <path d="M 99 83 L 102 86 L 99 89" stroke="#a78bfa" strokeWidth="0.7" fill="none" />
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
