"use client";

/**
 * AdaptiveTrialDesign — four-stage looping animation of an adaptive
 * clinical trial. An interim look is conducted; futility/efficacy
 * boundaries appear; one arm is dropped; the remaining arms continue.
 *
 * Stages:
 *   1. ENROLL    — three arms accruing dots
 *   2. INTERIM   — vertical interim look line; boundaries overlay
 *   3. DROP      — Arm C strikes through (failed futility)
 *   4. CONTINUE  — Arms A and B continue with momentum
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["enroll", "interim", "drop", "continue"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  enroll:   { label: "ENROLLING",   sub: "3 arms · accruing",    duration: 2600 },
  interim:  { label: "INTERIM LOOK", sub: "α spend · O'Brien-F", duration: 2800 },
  drop:     { label: "DROP · ARM C", sub: "futility crossed",    duration: 2400 },
  continue: { label: "CONTINUE",    sub: "arms A · B · larger n", duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function AdaptiveTrialDesign({ size = 200, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  const interimX = 100;
  const showInterim = stage !== "enroll";
  const showBoundary = stage === "interim";
  const showDrop = stage === "drop" || stage === "continue";
  const showContinue = stage === "continue";

  const ARMS = [
    { y: 40, label: "A", color: "#86efac" },
    { y: 60, label: "B", color: "#7dd3fc" },
    { y: 80, label: "C", color: "#fbbf24" },
  ];

  return (
    <div className={className}>
      <svg width={size} height={size * (170 / 200)} viewBox="0 0 200 170" fill="none" stroke="currentColor"
        strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round"
        role="img" aria-label={`Adaptive trial — ${info.label}`}>
        {/* Time axis */}
        <line x1="22" y1="98" x2="178" y2="98" strokeWidth="0.55" opacity="0.6" />
        <text x="178" y="108" textAnchor="end" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.6">time</text>

        {/* Arms */}
        {ARMS.map((arm, ai) => {
          const dropped = ai === 2 && showDrop;
          const extended = showContinue && ai < 2;
          return (
            <g key={arm.label} opacity={dropped && stage === "continue" ? 0.3 : 1}
              style={{ transition: noTransition ?? "opacity 500ms ease" }}>
              {/* Arm baseline */}
              <line x1="22" y1={arm.y} x2={extended ? 178 : interimX + (dropped ? 0 : 26)} y2={arm.y}
                strokeWidth="0.7" stroke={arm.color} opacity="0.85"
                style={{ transition: noTransition ?? "x2 800ms ease" }} />
              {/* Patient dots accruing along the arm */}
              {Array.from({ length: 14 }).map((_, k) => {
                const cx = 28 + k * 11;
                if (!extended && cx > interimX + 26) return null;
                if (dropped && cx > interimX) return null;
                return <circle key={k} cx={cx} cy={arm.y} r="1.5" fill={arm.color} stroke="none" opacity="0.85" />;
              })}
              {/* Arm label */}
              <text x="16" y={arm.y + 1.5} textAnchor="end" fontSize="5" fill={arm.color} stroke="none" fontFamily="ui-monospace,monospace" letterSpacing="0.4">{arm.label}</text>
              {/* Strike-through if dropped */}
              {dropped && (
                <line x1={interimX} y1={arm.y} x2={interimX + 26} y2={arm.y} stroke="#fb7185" strokeWidth="0.9" />
              )}
            </g>
          );
        })}

        {/* Interim look vertical line */}
        <g opacity={showInterim ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <line x1={interimX} y1="20" x2={interimX} y2="98" strokeWidth="0.7" strokeDasharray="2 2" opacity="0.75" />
          <text x={interimX} y="18" textAnchor="middle" fontSize="4.6" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.75" letterSpacing="0.4">interim · 50% info</text>
        </g>

        {/* Efficacy/futility boundary band — sloping line */}
        <g opacity={showBoundary ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <path d="M 22 32 L 178 86" strokeWidth="0.55" stroke="#86efac" strokeDasharray="2 2" opacity="0.65" />
          <path d="M 22 96 L 178 50" strokeWidth="0.55" stroke="#fb7185" strokeDasharray="2 2" opacity="0.65" />
          <text x="170" y="86" fontSize="4.4" fill="#86efac" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.8" textAnchor="end">efficacy</text>
          <text x="170" y="54" fontSize="4.4" fill="#fb7185" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.8" textAnchor="end">futility</text>
        </g>

        <g fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
          <text x="100" y="128" textAnchor="middle" fontSize="6.8" fontWeight="700" letterSpacing="1.3">{info.label}</text>
          <text x="100" y="140" textAnchor="middle" fontSize="5.6" opacity="0.55" letterSpacing="0.4">{info.sub}</text>
        </g>
        <g transform="translate(82 152)" role="progressbar"
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
