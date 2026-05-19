"use client";

/**
 * SourceDataVerification — four-stage looping animation of a CRA
 * monitoring visit. The monitor compares EDC entries against
 * source (chart), flags discrepancies, queries are issued, and
 * sites resolve.
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["visit", "compare", "query", "resolve"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  visit:   { label: "MONITORING VISIT", sub: "CRA · on-site",        duration: 2400 },
  compare: { label: "SDV",              sub: "EDC vs source",        duration: 2800 },
  query:   { label: "QUERY ISSUED",     sub: "discrepancy flagged",  duration: 2600 },
  resolve: { label: "RESOLVED",         sub: "site response · close", duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function SourceDataVerification({ size = 180, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  const showCompare = stage === "compare" || stage === "query" || stage === "resolve";
  const showQuery = stage === "query" || stage === "resolve";
  const showResolve = stage === "resolve";

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
        aria-label={`SDV — ${info.label}`}
      >
        {/* Source (paper chart) */}
        <g>
          <rect x="18" y="28" width="58" height="64" rx="2" />
          <text x="24" y="38" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" letterSpacing="0.5" opacity="0.75">SOURCE · CHART</text>
          <line x1="24" y1="42" x2="70" y2="42" strokeWidth="0.5" opacity="0.55" />
          {[50, 56, 62, 68, 74, 80, 86].map((y, i) => (
            <g key={y}>
              <text x="24" y={y} fontSize="3.6" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.7">{["Visit", "BP", "HR", "Temp", "Weight", "AE", "Sig"][i]}</text>
              <line x1="44" y1={y - 1} x2={44 + [22, 14, 18, 14, 16, 22, 20][i]} y2={y - 1} strokeWidth="0.5" opacity="0.55" />
            </g>
          ))}
        </g>

        {/* EDC (digital screen) */}
        <g>
          <rect x="100" y="28" width="62" height="64" rx="3" />
          <line x1="100" y1="38" x2="162" y2="38" strokeWidth="0.55" opacity="0.55" />
          <text x="106" y="38" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" letterSpacing="0.5" opacity="0.75">EDC · CRF</text>
          {[50, 56, 62, 68, 74, 80, 86].map((y, i) => (
            <g key={`e-${y}`}>
              <text x="106" y={y} fontSize="3.6" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.7">{["Visit", "BP", "HR", "Temp", "Weight", "AE", "Sig"][i]}</text>
              <line x1="126" y1={y - 1} x2={126 + [22, 14, 18, 14, 16, 22, 20][i]} y2={y - 1} strokeWidth="0.5" opacity="0.55" />
            </g>
          ))}
        </g>

        {/* Compare arrows */}
        <g opacity={showCompare ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          {[58, 76].map((y) => (
            <g key={y}>
              <line x1="80" y1={y} x2="96" y2={y} strokeWidth="0.7" strokeDasharray="2 1.5" opacity="0.7" />
              <path d={`M 92 ${y - 1.6} L 96 ${y} L 92 ${y + 1.6}`} strokeWidth="0.55" fill="none" />
            </g>
          ))}
        </g>

        {/* Discrepancy flag */}
        <g opacity={showQuery ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <line x1="126" y1="67" x2="146" y2="67" stroke="#fb7185" strokeWidth="0.85" />
          <circle cx="150" cy="67" r="2.4" fill="#fb7185" stroke="none" />
          <text x="156" y="69" fontSize="4" fill="#fb7185" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" letterSpacing="0.3">Q</text>
        </g>

        {/* Resolve check */}
        <g opacity={showResolve ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <circle cx="150" cy="67" r="3.6" stroke="#86efac" strokeWidth="0.85" fill="#86efac" fillOpacity="0.18" />
          <path d="M 147 67 L 149 69 L 153 65" stroke="#86efac" strokeWidth="0.85" fill="none" />
        </g>

        {/* Stage label */}
        <g fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
          <text x="90" y="118" textAnchor="middle" fontSize="6.8" fontWeight="700" letterSpacing="1.3">{info.label}</text>
          <text x="90" y="130" textAnchor="middle" fontSize="5.6" opacity="0.55" letterSpacing="0.4">{info.sub}</text>
        </g>

        <g
          transform="translate(72 144)"
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
