"use client";

/**
 * DoseEscalation3plus3 — four-stage looping animation of a phase-I
 * oncology 3+3 dose-escalation decision. Three patients dose at a
 * given level; one DLT triggers a 3-more expansion; no further DLTs
 * means escalate, otherwise declare MTD.
 *
 * Stages:
 *   1. COHORT      — 3 dots at the current dose level
 *   2. DLT         — one dot turns red (DLT observed)
 *   3. EXPAND      — three more dots added at the same level
 *   4. ESCALATE    — green arrow up to the next level
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["cohort", "dlt", "expand", "escalate"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  cohort:   { label: "COHORT · 3 PT",   sub: "DL2 · enrolled",     duration: 2400 },
  dlt:      { label: "DLT OBSERVED",    sub: "1/3 · grade 4",      duration: 2400 },
  expand:   { label: "EXPAND · +3 PT",  sub: "3+3 rule",           duration: 2600 },
  escalate: { label: "ESCALATE · DL3",  sub: "no further DLT",     duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function DoseEscalation3plus3({ size = 180, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  return (
    <div className={className}>
      <svg width={size} height={size * (170 / 180)} viewBox="0 0 180 170" fill="none" stroke="currentColor"
        strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round"
        role="img" aria-label={`3+3 dose escalation — ${info.label}`}>
        {/* Dose-level ladder */}
        {[
          { y: 30, label: "DL3" },
          { y: 60, label: "DL2" },
          { y: 90, label: "DL1" },
        ].map((lvl) => (
          <g key={lvl.label}>
            <line x1="38" y1={lvl.y} x2="160" y2={lvl.y} strokeWidth="0.55" opacity="0.55" />
            <text x="30" y={lvl.y + 1.5} textAnchor="end" fontSize="5" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.7">{lvl.label}</text>
          </g>
        ))}

        {/* Cohort 1 — three dots at DL2 (y=60) */}
        <g>
          {[60, 76, 92].map((cx, i) => (
            <circle key={i} cx={cx} cy={60} r="2.8"
              fill={stage !== "cohort" && i === 0 ? "#fb7185" : "currentColor"}
              stroke="none" opacity="0.85"
              style={{ transition: noTransition ?? "fill 500ms ease" }} />
          ))}
        </g>

        {/* DLT marker */}
        <g opacity={stage === "dlt" || stage === "expand" || stage === "escalate" ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <circle cx="60" cy="60" r="6" stroke="#fb7185" strokeWidth="0.85" fill="none" />
          <text x="60" y="48" textAnchor="middle" fontSize="4.6" fill="#fb7185" stroke="none" fontFamily="ui-monospace,monospace" letterSpacing="0.4">DLT</text>
        </g>

        {/* Expansion — 3 more dots at the same level */}
        <g opacity={stage === "expand" || stage === "escalate" ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          {[108, 124, 140].map((cx, i) => (
            <circle key={i} cx={cx} cy={60} r="2.8" fill="currentColor" stroke="none" opacity="0.85" />
          ))}
          <text x="124" y="50" textAnchor="middle" fontSize="4.6" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.7" letterSpacing="0.4">+3 · 0/3 DLT</text>
        </g>

        {/* Escalate arrow up to DL3 */}
        <g opacity={stage === "escalate" ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <line x1="100" y1="54" x2="100" y2="36" strokeWidth="1.1" stroke="#86efac" />
          <path d="M 95 38 L 100 32 L 105 38" strokeWidth="1.1" stroke="#86efac" fill="none" />
          {/* Three new patients at DL3 */}
          {[80, 96, 112].map((cx, i) => (
            <circle key={i} cx={cx} cy={30} r="2.8" fill="#86efac" stroke="none" opacity="0.85" />
          ))}
        </g>

        <g fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
          <text x="90" y="128" textAnchor="middle" fontSize="6.8" fontWeight="700" letterSpacing="1.3">{info.label}</text>
          <text x="90" y="140" textAnchor="middle" fontSize="5.6" opacity="0.55" letterSpacing="0.4">{info.sub}</text>
        </g>
        <g transform="translate(72 154)" role="progressbar"
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
