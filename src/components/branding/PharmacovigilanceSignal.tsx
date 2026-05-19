"use client";

/**
 * PharmacovigilanceSignal — four-stage looping animation of a
 * drug-safety signal-detection pipeline. Adverse event reports
 * stream in, get coded, plotted as a scatter, and one outlier
 * lights up as a candidate safety signal.
 *
 * Stages:
 *   1. INTAKE         — AE report dots stream in from the left
 *                       and pile in an intake queue.
 *   2. CODE           — reports get tagged with MedDRA codes
 *                       (small SOC color tags appear on each dot).
 *   3. DISPROPORTION  — dots fan out into a scatter on a small
 *                       observed-vs-expected plot.
 *   4. SIGNAL         — one outlier point starts pulsing red and
 *                       a "SIGNAL" lozenge appears.
 *
 * Reads as: every adverse event is a dot. The whole job is finding
 * the one dot that means something.
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["intake", "code", "disprop", "signal"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  intake:  { label: "AE INTAKE",        sub: "ICSR queue",            duration: 2600 },
  code:    { label: "MedDRA CODING",    sub: "PT · LLT · SOC",        duration: 2800 },
  disprop: { label: "DISPROPORTIONALITY", sub: "ROR · PRR",           duration: 3000 },
  signal:  { label: "SAFETY SIGNAL",    sub: "validation pending",    duration: 3000 },
};

// Intake-queue positions (left column, stacked).
const INTAKE_QUEUE: Array<{ x: number; y: number }> = [
  { x: 22, y: 32 }, { x: 22, y: 42 }, { x: 22, y: 52 },
  { x: 22, y: 62 }, { x: 22, y: 72 }, { x: 22, y: 82 },
  { x: 22, y: 92 }, { x: 22, y: 102 },
];

// Scatter positions on the observed-vs-expected plot.
// One of them (signalIdx) will be the outlier.
const SCATTER: Array<{ x: number; y: number; color?: string }> = [
  { x: 56, y: 92 }, { x: 64, y: 82 }, { x: 70, y: 92 }, { x: 76, y: 78 },
  { x: 82, y: 86 }, { x: 90, y: 74 }, { x: 96, y: 82 }, { x: 102, y: 76 },
  { x: 110, y: 68 }, { x: 118, y: 60 }, { x: 126, y: 32 }, // ← outlier (high observed, high O/E)
  { x: 60, y: 100 }, { x: 88, y: 96 },
];

const SIGNAL_IDX = 10;

// SOC tag colors used during CODE.
const SOC_COLORS = ["#7dd3fc", "#fbbf24", "#86efac", "#f0abfc"];

interface Props {
  size?: number;
  className?: string;
}

export function PharmacovigilanceSignal({ size = 170, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  const showQueue   = stage === "intake" || stage === "code";
  const showScatter = stage === "disprop" || stage === "signal";
  const showSignal  = stage === "signal";
  const showSocTags = stage === "code";

  return (
    <div className={className}>
      <svg
        width={size}
        height={size * (170 / 170)}
        viewBox="0 0 170 170"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        role="img"
        aria-label={`Pharmacovigilance signal detection — ${info.label}`}
      >
        {/* ── Plot axes (visible only when scatter is) */}
        <g
          opacity={showScatter ? 0.6 : 0}
          style={{ transition: noTransition ?? "opacity 600ms ease" }}
        >
          <line x1="46" y1="118" x2="146" y2="118" />
          <line x1="46" y1="118" x2="46" y2="24" />
          <g
            fill="currentColor" stroke="none"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            opacity="0.7"
          >
            <text x="96" y="130" textAnchor="middle" fontSize="5">expected</text>
            <text
              x="38" y="68"
              fontSize="5"
              transform="rotate(-90 38 68)"
              textAnchor="middle"
            >
              observed
            </text>
          </g>
          {/* Identity line — expected ≈ observed reference. */}
          <line
            x1="46" y1="118" x2="146" y2="36"
            stroke="currentColor" strokeWidth="0.8"
            strokeDasharray="2 2" opacity="0.45"
          />
        </g>

        {/* ── Intake queue (left column) */}
        <g
          opacity={showQueue ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}
        >
          {INTAKE_QUEUE.map((p, i) => (
            <g key={`q-${i}`}>
              <circle
                cx={p.x} cy={p.y}
                r="2"
                fill="currentColor" stroke="none"
                opacity="0.75"
              />
              {/* SOC tag — color flag appearing during CODE only */}
              <rect
                x={p.x + 4} y={p.y - 1.5}
                width="6" height="3"
                fill={SOC_COLORS[i % SOC_COLORS.length]}
                opacity={showSocTags ? 0.85 : 0}
                style={{ transition: noTransition ?? "opacity 500ms ease" }}
                stroke="none"
              />
            </g>
          ))}
          {/* Queue bracket */}
          <path d="M 14 28 L 14 108" opacity="0.45" />
          <text
            x="10" y="22"
            fontSize="5.2"
            fill="currentColor" stroke="none"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            opacity="0.6"
          >
            ICSR
          </text>
        </g>

        {/* ── Scatter points */}
        <g
          opacity={showScatter ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 700ms ease" }}
        >
          {SCATTER.map((p, i) => {
            const isSignal = showSignal && i === SIGNAL_IDX;
            return (
              <circle
                key={`s-${i}`}
                cx={p.x} cy={p.y}
                r={isSignal ? 3 : 2}
                fill={isSignal ? "#fb7185" : "currentColor"}
                stroke="none"
                opacity={isSignal ? 1 : 0.7}
                style={{
                  transition:
                    noTransition ?? "r 500ms ease, fill 500ms ease, opacity 500ms ease",
                }}
              />
            );
          })}
          {/* Pulsing ring around the signal */}
          {showSignal && (
            <circle
              cx={SCATTER[SIGNAL_IDX].x}
              cy={SCATTER[SIGNAL_IDX].y}
              r="6"
              stroke="#fb7185" strokeWidth="0.9"
              opacity="0.55"
            />
          )}
        </g>

        {/* ── SIGNAL lozenge label */}
        <g
          opacity={showSignal ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}
        >
          <rect
            x="100" y="14" width="48" height="11" rx="5.5"
            fill="#fb7185" fillOpacity="0.18"
            stroke="#fb7185" strokeWidth="1.0"
          />
          <text
            x="124" y="22"
            textAnchor="middle"
            fontSize="6"
            fill="#fb7185" stroke="none"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            letterSpacing="0.6"
            fontWeight="700"
          >
            SIGNAL
          </text>
        </g>

        {/* ── Stage label */}
        <g
          fill="currentColor" stroke="none"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        >
          <text x="85" y="146" textAnchor="middle" fontSize="7" fontWeight="700" letterSpacing="1.3">
            {info.label}
          </text>
          <text x="85" y="158" textAnchor="middle" fontSize="5.8" opacity="0.55" letterSpacing="0.4">
            {info.sub}
          </text>
        </g>

        {/* ── Stage dots */}
        <g
          transform="translate(67 166)"
          role="progressbar"
          aria-label={`Cycle stage ${stageIdx + 1} of ${STAGES.length}: ${info.label}`}
          aria-valuenow={stageIdx + 1}
          aria-valuemin={1}
          aria-valuemax={STAGES.length}
        >
          {STAGES.map((_, i) => (
            <circle
              key={i}
              cx={i * 12}
              cy={0}
              r="1.6"
              fill={i === stageIdx ? "#86efac" : "currentColor"}
              opacity={i === stageIdx ? 1 : 0.3}
              stroke="none"
              style={{ transition: noTransition ?? "opacity 300ms ease, fill 300ms ease" }}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
