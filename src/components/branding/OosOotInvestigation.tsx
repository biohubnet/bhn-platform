"use client";

/**
 * OosOotInvestigation — five-stage looping animation of a
 * structured OOS/OOT investigation (BHN QA/QC core outcome). A
 * result lands outside specification, a Phase-I lab review is
 * opened, retest is run, root cause is identified, and a
 * disposition decision is made.
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["flag", "phase1", "retest", "root", "dispo"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  flag:   { label: "OOS · FLAG",     sub: "result outside spec",       duration: 2400 },
  phase1: { label: "PHASE I REVIEW", sub: "lab error · ruled out",     duration: 2600 },
  retest: { label: "RETEST",         sub: "fresh aliquot · in-spec",   duration: 2600 },
  root:   { label: "ROOT CAUSE",     sub: "method · column drift",     duration: 2800 },
  dispo:  { label: "DISPO · INVALID", sub: "original result invalid",  duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function OosOotInvestigation({ size = 180, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  const showPhase1 = stage === "phase1" || stage === "retest" || stage === "root" || stage === "dispo";
  const showRetest = stage === "retest" || stage === "root" || stage === "dispo";
  const showRoot = stage === "root" || stage === "dispo";
  const showDispo = stage === "dispo";

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
        aria-label={`OOS investigation — ${info.label}`}
      >
        {/* Spec range bar */}
        <g>
          <text x="20" y="28" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.65" letterSpacing="0.4">SPEC · 95.0 – 105.0 %</text>
          <line x1="20" y1="40" x2="160" y2="40" strokeWidth="0.55" opacity="0.55" />
          {/* spec range */}
          <rect x="60" y="36" width="80" height="8" stroke="#86efac" strokeWidth="0.7" fill="#86efac" fillOpacity="0.12" />
          {/* OOS marker */}
          <circle cx="42" cy="40" r="3.4" fill="#fb7185" stroke="none" />
          <text x="42" y="32" textAnchor="middle" fontSize="4.4" fill="#fb7185" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" letterSpacing="0.3">88.2 %</text>
        </g>

        {/* Phase 1 review card */}
        <g opacity={showPhase1 ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <rect x="20" y="52" width="60" height="22" rx="3" strokeWidth="0.7" />
          <text x="50" y="62" textAnchor="middle" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" letterSpacing="0.4">PHASE I</text>
          <text x="50" y="70" textAnchor="middle" fontSize="3.8" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.65">lab error: NONE</text>
        </g>

        {/* Retest card */}
        <g opacity={showRetest ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <rect x="90" y="52" width="70" height="22" rx="3" strokeWidth="0.7" />
          <text x="125" y="62" textAnchor="middle" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" letterSpacing="0.4">RETEST · n=3</text>
          <text x="125" y="70" textAnchor="middle" fontSize="3.8" fill="#86efac" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">99.8 · 100.1 · 99.4 %</text>
        </g>

        {/* Root cause card */}
        <g opacity={showRoot ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <rect x="20" y="82" width="140" height="22" rx="3" strokeWidth="0.7" />
          <text x="26" y="92" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" letterSpacing="0.4">ROOT CAUSE</text>
          <text x="26" y="100" fontSize="3.8" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.7">HPLC column · plate count drift · re-equilibration insufficient</text>
        </g>

        {/* Dispo */}
        <g opacity={showDispo ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <rect x="40" y="110" width="100" height="14" rx="7" stroke="#86efac" strokeWidth="0.85" fill="#86efac" fillOpacity="0.16" />
          <text x="90" y="119" textAnchor="middle" fontSize="5.4" fill="#86efac" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontWeight="700" letterSpacing="0.5">DISPO · BATCH RELEASE</text>
        </g>

        {/* Stage label */}
        <g fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
          <text x="90" y="138" textAnchor="middle" fontSize="6.8" fontWeight="700" letterSpacing="1.3">{info.label}</text>
          <text x="90" y="150" textAnchor="middle" fontSize="5.6" opacity="0.55" letterSpacing="0.4">{info.sub}</text>
        </g>

        <g
          transform="translate(60 162)"
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
