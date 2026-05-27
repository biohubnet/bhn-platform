"use client";

/**
 * CongressEngagementPlan — four-stage looping animation of the
 * Medical Affairs congress engagement plan (ASCO / ASH / AACR-class
 * scientific meetings). Abstracts drafted → posters and orals
 * delivered → symposium hosted → post-congress follow-up sent.
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["abstract", "present", "symposium", "follow-up"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  abstract:    { label: "ABSTRACT",  sub: "n = 6 · submitted",     duration: 2400 },
  present:     { label: "PRESENT",   sub: "posters + oral",        duration: 2600 },
  symposium:   { label: "SYMPOSIUM", sub: "satellite · 200 pax",   duration: 2800 },
  "follow-up": { label: "FOLLOW-UP", sub: "outreach · 48 hrs",     duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function CongressEngagementPlan({ size = 180, className }: Props) {
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
        aria-label={`Congress plan — ${info.label}`}
      >
        {/* Congress hall outline (always visible) */}
        <rect x="22" y="38" width="136" height="50" rx="2" strokeWidth="0.7" opacity="0.45" />
        <line x1="22" y1="56" x2="158" y2="56" strokeWidth="0.5" opacity="0.4" />
        <text x="90" y="48" textAnchor="middle" fontSize="3.4" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.55" letterSpacing="0.4">CONGRESS HALL</text>

        {/* Stage 1 — abstracts (clipboard) */}
        <g opacity={stage === "abstract" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          {[0, 1, 2].map((i) => (
            <g key={i} transform={`translate(${42 + i * 22} 62)`}>
              <rect x="0" y="0" width="16" height="20" stroke="#7dd3fc" strokeWidth="0.6" />
              <line x1="2" y1="4" x2="14" y2="4" stroke="#7dd3fc" strokeWidth="0.4" />
              <line x1="2" y1="7" x2="14" y2="7" stroke="#7dd3fc" strokeWidth="0.4" opacity="0.7" />
              <line x1="2" y1="10" x2="12" y2="10" stroke="#7dd3fc" strokeWidth="0.4" opacity="0.55" />
              <line x1="2" y1="13" x2="14" y2="13" stroke="#7dd3fc" strokeWidth="0.4" opacity="0.4" />
            </g>
          ))}
          <text x="158" y="68" textAnchor="end" fontSize="3.6" fill="#7dd3fc" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">6 abstracts</text>
        </g>

        {/* Stage 2 — posters in a row */}
        <g opacity={stage === "present" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          {[0, 1, 2, 3].map((i) => (
            <g key={i} transform={`translate(${30 + i * 30} 62)`}>
              <rect x="0" y="0" width="20" height="22" stroke="#86efac" strokeWidth="0.6" fill="#86efac" fillOpacity="0.12" />
              <line x1="2" y1="4" x2="18" y2="4" stroke="#86efac" strokeWidth="0.4" />
              <line x1="2" y1="8" x2="18" y2="8" stroke="#86efac" strokeWidth="0.4" opacity="0.7" />
              <line x1="2" y1="12" x2="14" y2="12" stroke="#86efac" strokeWidth="0.4" opacity="0.55" />
              <rect x="2" y="14" width="16" height="6" stroke="#86efac" strokeWidth="0.4" opacity="0.5" />
            </g>
          ))}
        </g>

        {/* Stage 3 — symposium stage with podium + audience */}
        <g opacity={stage === "symposium" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          {/* Stage */}
          <rect x="64" y="58" width="52" height="6" stroke="#fbbf24" strokeWidth="0.6" fill="#fbbf24" fillOpacity="0.15" />
          {/* Podium */}
          <rect x="86" y="50" width="8" height="10" stroke="#fbbf24" strokeWidth="0.55" />
          {/* Speaker silhouette */}
          <circle cx="90" cy="46" r="2" stroke="#fbbf24" strokeWidth="0.55" />
          {/* Audience dots */}
          {Array.from({ length: 16 }).map((_, i) => (
            <circle
              key={i}
              cx={36 + (i % 8) * 14}
              cy={72 + Math.floor(i / 8) * 6}
              r="1.2"
              fill="#fbbf24"
              stroke="none"
              opacity="0.85"
            />
          ))}
        </g>

        {/* Stage 4 — follow-up emails fanning out */}
        <g opacity={stage === "follow-up" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <rect x="78" y="58" width="24" height="14" stroke="#a78bfa" strokeWidth="0.65" />
          <path d="M 78 58 L 90 67 L 102 58" stroke="#a78bfa" strokeWidth="0.55" fill="none" />
          {/* arrows out */}
          <path d="M 102 65 L 144 56" stroke="#a78bfa" strokeWidth="0.5" strokeDasharray="2 2" />
          <path d="M 102 65 L 144 65" stroke="#a78bfa" strokeWidth="0.5" strokeDasharray="2 2" />
          <path d="M 102 65 L 144 74" stroke="#a78bfa" strokeWidth="0.5" strokeDasharray="2 2" />
          <path d="M 78 65 L 36 56" stroke="#a78bfa" strokeWidth="0.5" strokeDasharray="2 2" />
          <path d="M 78 65 L 36 65" stroke="#a78bfa" strokeWidth="0.5" strokeDasharray="2 2" />
          <path d="M 78 65 L 36 74" stroke="#a78bfa" strokeWidth="0.5" strokeDasharray="2 2" />
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
