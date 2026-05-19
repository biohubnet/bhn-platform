"use client";

/**
 * ElisaPlateAssay — five-stage looping animation of a sandwich
 * ELISA. The plate is coated with capture antibody, the sample is
 * added, a detection antibody binds, substrate develops color,
 * and the plate is read.
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["coat", "sample", "detect", "develop", "read"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  coat:    { label: "COAT",      sub: "capture Ab · overnight", duration: 2400 },
  sample:  { label: "SAMPLE",    sub: "incubate · wash",        duration: 2400 },
  detect:  { label: "DETECT Ab", sub: "HRP conjugate",          duration: 2600 },
  develop: { label: "TMB",       sub: "substrate · stop",       duration: 2400 },
  read:    { label: "READ",      sub: "OD 450 · standard curve", duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function ElisaPlateAssay({ size = 200, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  // 96-well plate (8×12)
  const COLS = 12;
  const ROWS = 8;
  const xStart = 28;
  const yStart = 30;
  const xStep = 11;
  const yStep = 9;

  // Per-stage well rendering
  const fillForWell = (col: number, row: number): string => {
    if (stage === "develop" || stage === "read") {
      // Standard curve: rows have decreasing intensity (top = high)
      const intensity = (ROWS - 1 - row) / (ROWS - 1);
      return `rgba(253, 230, 138, ${0.15 + intensity * 0.55})`;
    }
    if (stage === "detect") return "rgba(125, 211, 252, 0.3)";
    if (stage === "sample") return "rgba(125, 211, 252, 0.18)";
    if (stage === "coat") return "rgba(255, 255, 255, 0.06)";
    return "transparent";
  };

  return (
    <div className={className}>
      <svg
        width={size}
        height={size * (170 / 200)}
        viewBox="0 0 200 170"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        role="img"
        aria-label={`ELISA — ${info.label}`}
      >
        {/* Plate */}
        <rect x="20" y="22" width="160" height="76" rx="3" />
        <path d="M 20 22 L 26 22 L 20 28 Z" fill="currentColor" fillOpacity="0.18" stroke="none" />

        {/* Wells */}
        {Array.from({ length: COLS * ROWS }).map((_, i) => {
          const c = i % COLS;
          const r = Math.floor(i / COLS);
          const cx = xStart + c * xStep;
          const cy = yStart + r * yStep;
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r="3"
              strokeWidth="0.5"
              opacity="0.6"
              fill={fillForWell(c, r)}
              style={{ transition: noTransition ?? "fill 600ms ease" }}
            />
          );
        })}

        {/* Standard curve appears on READ */}
        <g opacity={stage === "read" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <line x1="20" y1="138" x2="180" y2="138" strokeWidth="0.5" opacity="0.55" />
          <line x1="20" y1="138" x2="20" y2="106" strokeWidth="0.5" opacity="0.55" />
          <text x="20" y="104" fontSize="4.2" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.6">OD₄₅₀</text>
          <text x="180" y="148" textAnchor="end" fontSize="4.2" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.6">[conc]</text>
          <path d="M 24 134 Q 60 132, 90 122 T 168 110" stroke="#86efac" strokeWidth="0.85" fill="none" />
          {[24, 50, 80, 110, 140, 168].map((x, i) => (
            <circle key={x} cx={x} cy={134 - i * 4 - (i === 0 ? 0 : i)} r="1.4" fill="#86efac" stroke="none" />
          ))}
        </g>

        {/* Stage label */}
        <g fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
          <text x="100" y="124" textAnchor="middle" fontSize="6.8" fontWeight="700" letterSpacing="1.3">{info.label}</text>
          <text x="100" y="136" textAnchor="middle" fontSize="5.6" opacity="0.55" letterSpacing="0.4">{info.sub}</text>
        </g>

        <g
          transform="translate(76 158)"
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
