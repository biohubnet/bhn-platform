"use client";

/**
 * HighThroughputScreen — four-stage looping animation of an HTS
 * primary screen. A 96-well plate gets dosed, read, and a few hits
 * light up; then a confirmation pick-list emerges.
 *
 * Stages:
 *   1. LIBRARY  — empty plate with compound positions marked
 *   2. DOSE     — every well gets a small dot (compound added)
 *   3. READ     — a handful of wells light green (hits)
 *   4. CONFIRM  — three confirmed hits arranged in a small pickup row
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["library", "dose", "read", "confirm"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  library: { label: "LIBRARY · 96",  sub: "diversity set",   duration: 2400 },
  dose:    { label: "DOSE · 10 µM",  sub: "single shot",     duration: 2400 },
  read:    { label: "PLATE READ",    sub: "Z' > 0.6",        duration: 2800 },
  confirm: { label: "HITS · CONFIRM", sub: "dose-response next", duration: 3000 },
};

// 12×8 plate grid — 96 wells.
const COLS = 12;
const ROWS = 8;
const HIT_INDICES = [11, 27, 42, 65, 78]; // arbitrary "hit" positions
const CONFIRMED = [27, 42, 78]; // confirmed subset

interface Props { size?: number; className?: string; }

export function HighThroughputScreen({ size = 200, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  // Per-well opacity for the compound dot.
  const dotOp = stage === "library" ? 0 : 0.8;
  const showHits = stage === "read" || stage === "confirm";
  const showConfirmRow = stage === "confirm";

  const wellR = 3;
  const xStart = 22;
  const yStart = 26;
  const xStep = 12;
  const yStep = 11;

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
        aria-label={`HTS plate — ${info.label}`}
      >
        {/* Plate outline */}
        <rect x="14" y="14" width="166" height="100" rx="3" />
        {/* Notch (orientation corner) */}
        <path d="M 14 14 L 22 14 L 14 22 Z" fill="currentColor" fillOpacity="0.18" stroke="none" />

        {/* Column + row labels */}
        {Array.from({ length: COLS }).map((_, c) => (
          <text
            key={`c-${c}`}
            x={xStart + c * xStep} y={20}
            fontSize="4.4" textAnchor="middle"
            fill="currentColor" stroke="none"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            opacity="0.5"
          >{c + 1}</text>
        ))}
        {Array.from({ length: ROWS }).map((_, r) => (
          <text
            key={`r-${r}`}
            x={16} y={yStart + r * yStep + 1.5}
            fontSize="4.4"
            fill="currentColor" stroke="none"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            opacity="0.5"
          >{String.fromCharCode(65 + r)}</text>
        ))}

        {/* Wells */}
        {Array.from({ length: COLS * ROWS }).map((_, i) => {
          const c = i % COLS;
          const r = Math.floor(i / COLS);
          const cx = xStart + c * xStep;
          const cy = yStart + r * yStep;
          const isHit = HIT_INDICES.includes(i);
          return (
            <g key={`w-${i}`}>
              <circle cx={cx} cy={cy} r={wellR} stroke="currentColor" strokeWidth="0.5" opacity="0.55" />
              {/* Compound dot */}
              <circle
                cx={cx} cy={cy} r="1.4"
                fill={showHits && isHit ? "#86efac" : "currentColor"}
                stroke="none"
                opacity={dotOp}
                style={{ transition: noTransition ?? "opacity 500ms ease, fill 500ms ease" }}
              />
              {/* Hit glow */}
              {showHits && isHit && (
                <circle
                  cx={cx} cy={cy} r="4.2"
                  stroke="#86efac" strokeWidth="0.55" opacity="0.65" fill="none"
                />
              )}
            </g>
          );
        })}

        {/* Confirm row — three picked hits stacked at the bottom */}
        <g
          opacity={showConfirmRow ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}
        >
          <text
            x="14" y="130"
            fontSize="5"
            fill="currentColor" stroke="none"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            opacity="0.6"
            letterSpacing="0.4"
          >
            PICK ↓
          </text>
          {CONFIRMED.map((idx, j) => (
            <g key={`p-${j}`}>
              <circle cx={42 + j * 22} cy={130} r="4" stroke="#86efac" strokeWidth="0.75" fill="#86efac" fillOpacity="0.18" />
              <text
                x={42 + j * 22} y={132.6}
                fontSize="4.6" textAnchor="middle"
                fill="#86efac" stroke="none"
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              >
                {String.fromCharCode(65 + Math.floor(idx / COLS))}{(idx % COLS) + 1}
              </text>
            </g>
          ))}
        </g>

        {/* Stage label */}
        <g fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
          <text x="100" y="148" textAnchor="middle" fontSize="6.5" fontWeight="700" letterSpacing="1.3">{info.label}</text>
          <text x="100" y="156" textAnchor="middle" fontSize="5.4" opacity="0.55" letterSpacing="0.4">{info.sub}</text>
        </g>
      </svg>
    </div>
  );
}
