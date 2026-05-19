"use client";

/**
 * SterileFillFinish — four-stage looping animation of aseptic
 * fill/finish on a vial line. Empty vials advance along a
 * conveyor, get filled, inspected, and labeled.
 *
 * Stages:
 *   1. CONVEYOR — empty vials line up
 *   2. FILL     — filling needle descends and fills each in turn
 *   3. INSPECT  — overhead camera + reject mark on one
 *   4. LABEL    — labels appear on the survivors
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["conveyor", "fill", "inspect", "label"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  conveyor: { label: "CONVEYOR LOAD", sub: "depyrogenated vials", duration: 2400 },
  fill:     { label: "ASEPTIC FILL",  sub: "ISO 5 · class A",     duration: 3000 },
  inspect:  { label: "INSPECT",       sub: "particulate scan",    duration: 2800 },
  label:    { label: "LABEL",         sub: "lot · expiry",        duration: 2800 },
};

// Vials along the conveyor — index 2 will be the reject.
const VIAL_X = [30, 56, 82, 108, 134, 160];
const REJECT_IDX = 3;

interface Props { size?: number; className?: string; }

export function SterileFillFinish({ size = 200, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  const showFill = stage === "fill";
  const showInspect = stage === "inspect" || stage === "label";
  const showReject = stage === "inspect" || stage === "label";
  const showLabels = stage === "label";
  const fillVials = stage === "fill" || stage === "inspect" || stage === "label";

  return (
    <div className={className}>
      <svg
        width={size}
        height={size * (160 / 200)}
        viewBox="0 0 200 160"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        role="img"
        aria-label={`Sterile fill/finish — ${info.label}`}
      >
        {/* Conveyor belt */}
        <line x1="14" y1="98" x2="186" y2="98" strokeWidth="0.95" />
        <line x1="14" y1="106" x2="186" y2="106" strokeWidth="0.5" opacity="0.55" />
        {/* Belt tick marks */}
        {[24, 44, 64, 84, 104, 124, 144, 164].map((x) => (
          <line key={x} x1={x} y1="98" x2={x} y2="106" strokeWidth="0.5" opacity="0.4" />
        ))}

        {/* Filling needle — descends during FILL above vial 2 (x=82) */}
        <g
          opacity={showFill ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}
        >
          <line x1="82" y1="20" x2="82" y2="44" strokeWidth="0.85" />
          <path d="M 80 44 L 84 44 L 82 60 Z" stroke="currentColor" strokeWidth="0.7" />
          <rect x="76" y="14" width="12" height="6" rx="1" />
          {/* Drop forming at tip */}
          <circle cx="82" cy="62" r="1.2" fill="#7dd3fc" stroke="none" opacity="0.85" />
        </g>

        {/* Inspection camera — visible at INSPECT */}
        <g
          opacity={showInspect ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}
          transform="translate(108 22)"
        >
          <rect x="-8" y="0" width="16" height="8" rx="1" />
          <circle cx="0" cy="4" r="2.4" />
          <line x1="-2" y1="14" x2="2" y2="14" strokeWidth="0.55" strokeDasharray="1.5 1.5" opacity="0.55" />
          <line x1="-4" y1="20" x2="4" y2="20" strokeWidth="0.55" strokeDasharray="1.5 1.5" opacity="0.55" />
          <text x="0" y="-2" textAnchor="middle" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.65">cam</text>
        </g>

        {/* Vials */}
        {VIAL_X.map((x, i) => {
          const filled = fillVials && i !== REJECT_IDX;
          const rejected = showReject && i === REJECT_IDX;
          const labeled = showLabels && i !== REJECT_IDX;
          return (
            <g key={`v-${i}`}>
              {/* Body */}
              <rect x={x - 5} y="78" width="10" height="20" rx="1" />
              {/* Cap */}
              <rect x={x - 5.5} y="74" width="11" height="5" rx="1" stroke-width="0.7" />
              {/* Fill level */}
              <rect
                x={x - 4} y={filled ? 84 : 96}
                width="8" height={filled ? 12 : 0}
                fill="#7dd3fc" fillOpacity="0.55" stroke="none"
                style={{ transition: noTransition ?? "y 700ms ease, height 700ms ease" }}
              />
              {/* Reject X */}
              {rejected && (
                <g>
                  <line x1={x - 5} y1="78" x2={x + 5} y2="98" stroke="#fb7185" strokeWidth="0.95" />
                  <line x1={x + 5} y1="78" x2={x - 5} y2="98" stroke="#fb7185" strokeWidth="0.95" />
                </g>
              )}
              {/* Label band */}
              {labeled && (
                <rect x={x - 5} y="88" width="10" height="4" fill="#86efac" fillOpacity="0.5" stroke="none" />
              )}
            </g>
          );
        })}

        {/* Stage label */}
        <g fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
          <text x="100" y="128" textAnchor="middle" fontSize="6.8" fontWeight="700" letterSpacing="1.3">{info.label}</text>
          <text x="100" y="140" textAnchor="middle" fontSize="5.6" opacity="0.55" letterSpacing="0.4">{info.sub}</text>
        </g>

        <g
          transform="translate(82 152)"
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
