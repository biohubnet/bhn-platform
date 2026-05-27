"use client";

/**
 * InvestigatorSponsoredTrial — four-stage looping animation of an
 * investigator-sponsored trial (IIT) proposal cycle. A PI's clinical
 * question → protocol drafted → industry funding secured → first
 * patient enrolled at the academic site.
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["question", "protocol", "fund", "enroll"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  question: { label: "QUESTION", sub: "clinical PI · gap",     duration: 2400 },
  protocol: { label: "PROTOCOL", sub: "v0.9 → v1.0",          duration: 2600 },
  fund:     { label: "FUND",     sub: "industry support",     duration: 2400 },
  enroll:   { label: "ENROLL",   sub: "FPI · n = 1",          duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function InvestigatorSponsoredTrial({ size = 180, className }: Props) {
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
        aria-label={`Investigator-sponsored trial — ${info.label}`}
      >
        {/* PI figure (left) */}
        <g transform="translate(28 38)">
          <circle cx="6" cy="6" r="3.5" strokeWidth="0.7" />
          <path d="M 0 22 L 0 14 Q 6 10 12 14 L 12 22" strokeWidth="0.7" />
          <text x="6" y="36" textAnchor="middle" fontSize="4.2" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.55" letterSpacing="0.3">PI</text>
        </g>

        {/* Funnel — concept to clinic */}
        <path d="M 62 44 L 132 44 L 116 84 L 78 84 Z" strokeWidth="0.6" opacity="0.4" />

        {/* Site / hospital (right) */}
        <g transform="translate(132 38)">
          <rect x="0" y="0" width="32" height="36" strokeWidth="0.7" />
          <line x1="16" y1="6" x2="16" y2="14" strokeWidth="0.7" />
          <line x1="12" y1="10" x2="20" y2="10" strokeWidth="0.7" />
          <rect x="6" y="20" width="6" height="10" strokeWidth="0.4" opacity="0.6" />
          <rect x="20" y="20" width="6" height="10" strokeWidth="0.4" opacity="0.6" />
        </g>

        {/* Stage-specific overlays */}
        <g opacity={stage === "question" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <text x="90" y="58" textAnchor="middle" fontSize="14" fill="#fbbf24" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontWeight="700">?</text>
          <text x="90" y="74" textAnchor="middle" fontSize="3.8" fill="#fbbf24" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.85">unmet need</text>
        </g>

        <g opacity={stage === "protocol" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <rect x="78" y="50" width="24" height="30" stroke="#7dd3fc" strokeWidth="0.6" />
          <line x1="80" y1="56" x2="100" y2="56" stroke="#7dd3fc" strokeWidth="0.4" />
          <line x1="80" y1="60" x2="100" y2="60" stroke="#7dd3fc" strokeWidth="0.4" opacity="0.7" />
          <line x1="80" y1="64" x2="100" y2="64" stroke="#7dd3fc" strokeWidth="0.4" opacity="0.6" />
          <line x1="80" y1="68" x2="96" y2="68" stroke="#7dd3fc" strokeWidth="0.4" opacity="0.5" />
          <line x1="80" y1="72" x2="98" y2="72" stroke="#7dd3fc" strokeWidth="0.4" opacity="0.4" />
          <text x="104" y="56" fontSize="3.4" fill="#7dd3fc" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.85">v1.0</text>
        </g>

        <g opacity={stage === "fund" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <rect x="78" y="58" width="24" height="14" rx="1.5" fill="#86efac" fillOpacity="0.2" stroke="#86efac" strokeWidth="0.7" />
          <text x="90" y="69" textAnchor="middle" fontSize="5.4" fill="#86efac" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontWeight="700">$ 2.4 M</text>
        </g>

        <g opacity={stage === "enroll" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <circle cx="148" cy="84" r="4" fill="#fb7185" fillOpacity="0.3" stroke="#fb7185" strokeWidth="0.65" />
          <path d="M 144 90 L 144 88 Q 148 86 152 88 L 152 90" stroke="#fb7185" strokeWidth="0.55" fill="none" />
          <text x="148" y="100" textAnchor="middle" fontSize="3.8" fill="#fb7185" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">PT-001</text>
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
