"use client";

/**
 * CompetitiveIntelligence — four-stage looping animation of the
 * commercial competitive-intelligence cycle. Open sources scanned →
 * findings synthesised into a SWOT → executive brief written →
 * strategic response options recommended.
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["scan", "synthesise", "brief", "respond"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  scan:       { label: "SCAN",      sub: "press · filings · ct.gov", duration: 2400 },
  synthesise: { label: "SYNTHESISE",sub: "SWOT · 4 quadrants",       duration: 2600 },
  brief:      { label: "BRIEF",     sub: "exec memo · 1 page",       duration: 2400 },
  respond:    { label: "RESPOND",   sub: "playbook · option B",      duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function CompetitiveIntelligence({ size = 180, className }: Props) {
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
        aria-label={`Competitive intelligence — ${info.label}`}
      >
        {/* Stage 1 — radar / scan view */}
        <g opacity={stage === "scan" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <g transform="translate(90 64)">
            <circle cx="0" cy="0" r="28" stroke="#7dd3fc" strokeWidth="0.6" opacity="0.4" />
            <circle cx="0" cy="0" r="18" stroke="#7dd3fc" strokeWidth="0.55" opacity="0.55" />
            <circle cx="0" cy="0" r="8"  stroke="#7dd3fc" strokeWidth="0.5" opacity="0.7" />
            <line x1="-28" y1="0" x2="28" y2="0" stroke="#7dd3fc" strokeWidth="0.45" opacity="0.4" />
            <line x1="0" y1="-28" x2="0" y2="28" stroke="#7dd3fc" strokeWidth="0.45" opacity="0.4" />
            {/* radar sweep wedge */}
            <path d="M 0 0 L 22 -18 A 28 28 0 0 1 28 0 Z" fill="#7dd3fc" fillOpacity="0.18" stroke="none" />
            {/* enemy dots */}
            <circle cx="14" cy="-8" r="1.6" fill="#fb7185" stroke="none" />
            <circle cx="-6" cy="16" r="1.6" fill="#fb7185" stroke="none" />
            <circle cx="22" cy="14" r="1.6" fill="#fb7185" stroke="none" />
          </g>
        </g>

        {/* Stage 2 — SWOT matrix */}
        <g opacity={stage === "synthesise" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <g transform="translate(46 38)">
            {[0, 1].map((row) =>
              [0, 1].map((col) => {
                const tint = ["#86efac", "#fbbf24", "#7dd3fc", "#fb7185"][row * 2 + col];
                const label = ["S", "W", "O", "T"][row * 2 + col];
                return (
                  <g key={`${row}-${col}`} transform={`translate(${col * 44} ${row * 28})`}>
                    <rect x="0" y="0" width="40" height="24" stroke={tint} strokeWidth="0.65" fill={tint} fillOpacity="0.15" />
                    <text x="20" y="16" textAnchor="middle" fontSize="9" fill={tint} stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontWeight="700">{label}</text>
                  </g>
                );
              })
            )}
          </g>
        </g>

        {/* Stage 3 — exec brief */}
        <g opacity={stage === "brief" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <g transform="translate(66 38)">
            <rect x="0" y="0" width="48" height="56" stroke="#fbbf24" strokeWidth="0.7" />
            <text x="24" y="10" textAnchor="middle" fontSize="3.6" fill="#fbbf24" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontWeight="700">EXEC BRIEF</text>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <line key={i} x1="4" y1={18 + i * 6} x2={4 + (i % 3 === 0 ? 40 : 32)} y2={18 + i * 6} stroke="#fbbf24" strokeWidth="0.45" opacity={i === 0 ? 1 : 0.65 - i * 0.08} />
            ))}
          </g>
        </g>

        {/* Stage 4 — response playbook */}
        <g opacity={stage === "respond" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          {["A", "B", "C"].map((letter, i) => (
            <g key={letter} transform={`translate(${42 + i * 38} 50)`}>
              <rect
                x="0" y="0" width="32" height="30"
                stroke={i === 1 ? "#86efac" : "currentColor"}
                strokeWidth={i === 1 ? "0.95" : "0.55"}
                fill={i === 1 ? "#86efac" : "none"}
                fillOpacity={i === 1 ? 0.18 : 0}
              />
              <text
                x="16" y="20"
                textAnchor="middle" fontSize="10"
                fill={i === 1 ? "#86efac" : "currentColor"}
                stroke="none"
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                fontWeight="700"
                opacity={i === 1 ? 1 : 0.5}
              >
                {letter}
              </text>
            </g>
          ))}
          <text x="90" y="92" textAnchor="middle" fontSize="3.6" fill="#86efac" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">option B · proceed</text>
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
