"use client";

/**
 * SterilityTest — four-stage looping animation of compendial
 * sterility testing for advanced therapies (USP <71>). Sample is
 * filtered through a membrane, inoculated into FTM and SCDM, and
 * incubated for 14 days; no growth = pass.
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["sample", "filter", "incubate", "result"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  sample:   { label: "SAMPLE",       sub: "drug substance",         duration: 2400 },
  filter:   { label: "MEMBRANE",     sub: "0.45 µm · split",         duration: 2600 },
  incubate: { label: "FTM + SCDM",   sub: "14 d · 22 / 32 °C",       duration: 3000 },
  result:   { label: "NO GROWTH",    sub: "sterility · PASS",        duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function SterilityTest({ size = 180, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  const showFilter = stage === "filter" || stage === "incubate" || stage === "result";
  const showBottles = stage === "incubate" || stage === "result";
  const showPass = stage === "result";

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
        aria-label={`Sterility test — ${info.label}`}
      >
        {/* Source vial */}
        <g>
          <rect x="20" y="40" width="10" height="22" rx="1" />
          <rect x="19" y="36" width="12" height="4" rx="1" strokeWidth="0.6" />
          <rect x="21" y="46" width="8" height="14" fill="#7dd3fc" fillOpacity="0.35" stroke="none" />
        </g>

        {/* Filter funnel */}
        <g opacity={showFilter ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <path d="M 50 36 L 78 36 L 70 60 L 58 60 Z" strokeWidth="0.9" />
          <line x1="58" y1="58" x2="70" y2="58" strokeWidth="0.5" strokeDasharray="2 1.5" opacity="0.6" />
          <text x="64" y="32" textAnchor="middle" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.7">0.45 µm</text>
          <line x1="64" y1="60" x2="64" y2="74" strokeWidth="0.6" />
        </g>

        {/* Media bottles (FTM + SCDM) */}
        <g opacity={showBottles ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          {/* FTM */}
          <g>
            <rect x="92" y="44" width="22" height="44" rx="2" />
            <rect x="91" y="40" width="24" height="6" rx="1" strokeWidth="0.55" />
            <rect x="94" y="56" width="18" height="30" fill="#86efac" fillOpacity="0.18" stroke="none" />
            <text x="103" y="98" textAnchor="middle" fontSize="4.6" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.75">FTM · 32 °C</text>
          </g>
          {/* SCDM */}
          <g>
            <rect x="128" y="44" width="22" height="44" rx="2" />
            <rect x="127" y="40" width="24" height="6" rx="1" strokeWidth="0.55" />
            <rect x="130" y="56" width="18" height="30" fill="#7dd3fc" fillOpacity="0.18" stroke="none" />
            <text x="139" y="98" textAnchor="middle" fontSize="4.6" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.75">SCDM · 22 °C</text>
          </g>
        </g>

        {/* Pass banner */}
        <g opacity={showPass ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <rect x="40" y="106" width="100" height="14" rx="7" stroke="#86efac" strokeWidth="0.85" fill="#86efac" fillOpacity="0.16" />
          <text x="90" y="115" textAnchor="middle" fontSize="5.6" fill="#86efac" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontWeight="700" letterSpacing="0.5">USP &lt;71&gt; · PASS</text>
        </g>

        {/* Stage label */}
        <g fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
          <text x="90" y="136" textAnchor="middle" fontSize="6.8" fontWeight="700" letterSpacing="1.3">{info.label}</text>
          <text x="90" y="148" textAnchor="middle" fontSize="5.6" opacity="0.55" letterSpacing="0.4">{info.sub}</text>
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
