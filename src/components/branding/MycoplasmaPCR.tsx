"use client";

/**
 * MycoplasmaPCR — four-stage looping animation of a qPCR-based
 * mycoplasma test (compendial alternative to 28-day culture). DNA
 * is extracted, mixed with primers/probes, amplified, and a
 * negative call is rendered against the threshold.
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["extract", "mix", "amplify", "call"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  extract: { label: "DNA EXTRACT",  sub: "lysis · column",          duration: 2400 },
  mix:     { label: "qPCR MIX",     sub: "primers · probe · MM",    duration: 2400 },
  amplify: { label: "AMPLIFY",      sub: "40 cycles",               duration: 2800 },
  call:    { label: "NEGATIVE",     sub: "Ct > 35 · myco-free",     duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function MycoplasmaPCR({ size = 180, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  const showMix = stage === "mix" || stage === "amplify" || stage === "call";
  const showAmplify = stage === "amplify" || stage === "call";
  const showCall = stage === "call";

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
        aria-label={`Mycoplasma qPCR — ${info.label}`}
      >
        {/* Extraction column */}
        <g>
          <rect x="22" y="30" width="14" height="32" rx="1.5" />
          <line x1="22" y1="38" x2="36" y2="38" strokeWidth="0.55" strokeDasharray="1.5 1.5" opacity="0.55" />
          <text x="29" y="74" textAnchor="middle" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.6">column</text>
        </g>

        {/* qPCR tube */}
        <g opacity={showMix ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <path d="M 54 30 L 80 30 L 80 42 L 72 70 L 62 70 L 54 42 Z" />
          <text x="67" y="80" textAnchor="middle" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.6">qPCR tube</text>
        </g>

        {/* Amplification curve */}
        <g opacity={showAmplify ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <line x1="96" y1="80" x2="170" y2="80" strokeWidth="0.55" opacity="0.6" />
          <line x1="96" y1="80" x2="96" y2="28" strokeWidth="0.55" opacity="0.6" />
          <text x="170" y="92" textAnchor="end" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.6">cycle</text>
          <text x="92" y="32" textAnchor="end" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.6">ΔRn</text>
          {/* Positive control curve */}
          <path d="M 96 80 Q 116 80, 124 76 Q 136 62, 144 38 Q 156 30, 168 28" stroke="#fb7185" strokeWidth="0.85" fill="none" />
          {/* Sample curve — flat */}
          <path d="M 96 80 Q 130 80, 168 78" stroke="#86efac" strokeWidth="0.85" fill="none" />
          {/* Threshold line */}
          <line x1="96" y1="60" x2="170" y2="60" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.55" />
          <text x="172" y="60" fontSize="4.2" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.6">Ct</text>
        </g>

        {/* Call banner */}
        <g opacity={showCall ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <rect x="40" y="106" width="100" height="14" rx="7" stroke="#86efac" strokeWidth="0.85" fill="#86efac" fillOpacity="0.16" />
          <text x="90" y="115" textAnchor="middle" fontSize="5.4" fill="#86efac" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontWeight="700" letterSpacing="0.5">MYCOPLASMA · NEGATIVE</text>
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
