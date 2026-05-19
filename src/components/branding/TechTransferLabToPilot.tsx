"use client";

/**
 * TechTransferLabToPilot — four-stage looping animation of a
 * tech-transfer team moving a process from R&D lab to pilot to
 * commercial. A small flask, a pilot vessel, and a commercial
 * skid grow in size as the active scale advances.
 *
 * Stages:
 *   1. LAB        — R&D flask only
 *   2. PROTOCOL   — protocol pages flow from lab to pilot
 *   3. ENG RUNS   — pilot vessel runs (3 engineering runs)
 *   4. COMMERCIAL — commercial skid with green check
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["lab", "protocol", "eng", "commercial"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  lab:        { label: "R&D LAB",     sub: "process locked",      duration: 2400 },
  protocol:   { label: "PROTOCOL",    sub: "MBR · transferred",   duration: 2400 },
  eng:        { label: "ENG RUNS",    sub: "3 confirmation runs", duration: 2800 },
  commercial: { label: "COMMERCIAL",  sub: "PPQ · approved",      duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function TechTransferLabToPilot({ size = 200, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];
  const activeIdx = STAGES.indexOf(stage);

  return (
    <div className={className}>
      <svg width={size} height={size * (170 / 200)} viewBox="0 0 200 170" fill="none" stroke="currentColor"
        strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round"
        role="img" aria-label={`Tech transfer — ${info.label}`}>
        {/* R&D flask */}
        <g opacity={activeIdx >= 0 ? 1 : 0.4} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <path d="M 30 56 L 34 56 L 34 70 L 46 92 L 14 92 L 26 70 L 26 56 L 30 56 Z" />
          <line x1="20" y1="84" x2="40" y2="84" strokeWidth="0.55" opacity="0.55" />
          <text x="30" y="106" textAnchor="middle" fontSize="4.6" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.65">lab</text>
        </g>

        {/* Protocol pages — drift right */}
        <g opacity={stage === "protocol" || stage === "eng" || stage === "commercial" ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <rect x="56" y="60" width="14" height="18" rx="1" />
          <rect x="58" y="58" width="14" height="18" rx="1" />
          <line x1="60" y1="64" x2="68" y2="64" strokeWidth="0.5" opacity="0.55" />
          <line x1="60" y1="68" x2="68" y2="68" strokeWidth="0.5" opacity="0.55" />
          <line x1="60" y1="72" x2="68" y2="72" strokeWidth="0.5" opacity="0.55" />
        </g>

        {/* Pilot vessel */}
        <g opacity={activeIdx >= 2 ? 1 : 0.35} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <path d="M 90 60 Q 102 56, 114 60 L 114 96 Q 102 100, 90 96 Z" />
          <line x1="102" y1="56" x2="102" y2="88" strokeWidth="0.7" opacity="0.6" />
          <line x1="96" y1="88" x2="108" y2="88" strokeWidth="0.85" opacity="0.7" />
          <text x="102" y="112" textAnchor="middle" fontSize="4.6" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.65">pilot</text>
        </g>

        {/* Engineering run dots */}
        <g opacity={stage === "eng" || stage === "commercial" ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          {[
            { y: 30, ok: true },
            { y: 40, ok: true },
            { y: 50, ok: true },
          ].map((r, i) => (
            <g key={i}>
              <line x1="80" y1={r.y} x2="124" y2={r.y} strokeWidth="0.55" opacity="0.55" />
              <circle cx="124" cy={r.y} r="2.4" stroke="#86efac" strokeWidth="0.7" fill="#86efac" fillOpacity="0.3" />
              <text x="78" y={r.y + 1.5} textAnchor="end" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.7">R{i + 1}</text>
            </g>
          ))}
        </g>

        {/* Commercial skid */}
        <g opacity={activeIdx >= 3 ? 1 : 0.3} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <path d="M 140 50 Q 160 44, 180 50 L 180 100 Q 160 106, 140 100 Z" />
          <line x1="160" y1="46" x2="160" y2="90" strokeWidth="0.7" opacity="0.6" />
          <line x1="150" y1="90" x2="170" y2="90" strokeWidth="0.85" opacity="0.7" />
          <line x1="146" y1="60" x2="174" y2="60" strokeWidth="0.55" opacity="0.5" />
          <text x="160" y="116" textAnchor="middle" fontSize="4.6" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.65">commercial</text>
        </g>

        {/* Final approval check */}
        <g opacity={stage === "commercial" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <circle cx="160" cy="74" r="7" stroke="#86efac" strokeWidth="0.95" fill="#86efac" fillOpacity="0.18" />
          <path d="M 156 74 L 159 77 L 164 71" stroke="#86efac" strokeWidth="0.95" fill="none" />
        </g>

        <g fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
          <text x="100" y="130" textAnchor="middle" fontSize="6.8" fontWeight="700" letterSpacing="1.3">{info.label}</text>
          <text x="100" y="142" textAnchor="middle" fontSize="5.6" opacity="0.55" letterSpacing="0.4">{info.sub}</text>
        </g>
        <g transform="translate(82 156)" role="progressbar"
          aria-label={`Cycle stage ${stageIdx + 1} of ${STAGES.length}: ${info.label}`}
          aria-valuenow={stageIdx + 1} aria-valuemin={1} aria-valuemax={STAGES.length}>
          {STAGES.map((_, i) => (
            <circle key={i} cx={i * 12} cy={0} r="1.6" fill={i === stageIdx ? "#86efac" : "currentColor"}
              opacity={i === stageIdx ? 1 : 0.3} stroke="none"
              style={{ transition: noTransition ?? "opacity 300ms ease, fill 300ms ease" }} />
          ))}
        </g>
      </svg>
    </div>
  );
}
