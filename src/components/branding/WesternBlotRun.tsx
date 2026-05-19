"use client";

/**
 * WesternBlotRun — five-stage looping animation of a Western blot
 * from "samples loaded into wells at the top of the gel" through
 * "bands separated by molecular weight" to "antibody probed +
 * developed". The protein-analysis workflow told as a process.
 *
 * Stages:
 *   1. LOAD      — samples sitting in the wells at the top of the
 *                  gel; no bands yet visible in the lanes
 *   2. RUN       — current applied; bands migrate downward,
 *                  smaller proteins ahead of larger ones (target
 *                  at 50 kDa lands lower than the loading control
 *                  at the ladder positions)
 *   3. TRANSFER  — bands have stopped migrating; the gel is
 *                  blotted onto a membrane (visualised by a faint
 *                  shift in band tint to suggest immobilisation)
 *   4. PROBE     — primary + secondary antibody applied; only
 *                  the target band lights up (bands at the
 *                  loading control + ladder positions fade)
 *   5. DEVELOP   — chemiluminescent signal; final readable
 *                  pattern with target band at full intensity
 *                  + loading control re-emerging at moderate
 *                  intensity; then cycle loops
 *
 * Five sample lanes (ladder + four samples) match the static
 * `WesternBlot` glyph composition; the difference is that each
 * lane's bands are animated to their final positions.
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["load", "run", "transfer", "probe", "develop"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  load:     { label: "LOAD",     sub: "samples into wells",   duration: 2600 },
  run:      { label: "RUN",      sub: "120 V · 90 min",       duration: 3600 },
  transfer: { label: "TRANSFER", sub: "gel → PVDF membrane",  duration: 2400 },
  probe:    { label: "PROBE",    sub: "1° + HRP-conjugated 2°", duration: 2800 },
  develop:  { label: "DEVELOP",  sub: "ECL chemiluminescence", duration: 3200 },
};

/** Y-position of the wells at the top of each lane. Samples sit
 *  here during LOAD and start their migration during RUN. */
const WELL_Y = 16;

/** A single band's per-stage Y-position and opacity. */
interface BandState {
  /** Y-position during each stage (LOAD, RUN, TRANSFER, PROBE, DEVELOP). */
  y: Record<Stage, number>;
  /** Opacity during each stage. */
  op: Record<Stage, number>;
  /** Whether this band is the "target" (the one that lights up
   *  on PROBE/DEVELOP) or a loading control or ladder rung. */
  kind: "ladder" | "loading" | "target";
}

/** Geometry for the five sample lanes. Each lane has 0-2 bands;
 *  the bands' final positions are y=33 (target, ~50 kDa) and
 *  y=69 (loading control, ~37 kDa); the ladder lane has four
 *  bands at fixed ladder positions. */
const LANE_X: number[] = [26, 45, 64, 83, 102];

/** Bands rendered per stage. Each band knows its per-stage y +
 *  opacity, computed as a simple progression from WELL_Y (LOAD)
 *  to the band's final resting position (RUN onward). */
function bandFinalY(kind: BandState["kind"], finalY: number): Record<Stage, number> {
  return {
    load:     WELL_Y,
    run:      finalY,
    transfer: finalY,
    probe:    finalY,
    develop:  finalY,
  };
}

function bandOpacity(kind: BandState["kind"]): Record<Stage, number> {
  if (kind === "target") {
    // Target band: faintly visible after RUN, lights up on PROBE/DEVELOP.
    return { load: 0.6, run: 0.55, transfer: 0.55, probe: 0.85, develop: 1.0 };
  }
  if (kind === "loading") {
    // Loading control: visible during the run, fades during the
    // probe (only the target gets probed), then re-emerges
    // moderately on develop.
    return { load: 0.6, run: 0.55, transfer: 0.55, probe: 0.20, develop: 0.45 };
  }
  // Ladder bands: visible during run + transfer, fade during
  // probe (the antibody doesn't bind ladder proteins), bleed
  // back faintly on develop as background.
  return { load: 0.6, run: 0.55, transfer: 0.55, probe: 0.18, develop: 0.30 };
}

/** Per-lane band roster. */
interface LaneBands {
  ladderBands?: number[]; // y positions (ladder lane only)
  targetY?: number;       // 33 for ~50 kDa
  loadingY?: number;      // 69 for ~37 kDa
  /** Intensity multiplier for the target band (0–1) so lane 3 is
   *  weaker than lane 2, lane 4 is strongest, lane 5 is knockout.
   *  Applied on top of `bandOpacity`. */
  targetMul: number;
}

const LANES: LaneBands[] = [
  // Lane 1 — ladder
  { ladderBands: [19, 33, 49, 69], targetMul: 0 },
  // Lane 2 — moderate target + loading
  { targetY: 33, loadingY: 69, targetMul: 0.85 },
  // Lane 3 — weaker target + loading
  { targetY: 33, loadingY: 69, targetMul: 0.5 },
  // Lane 4 — strongest target + loading
  { targetY: 32, loadingY: 69, targetMul: 1.0 },
  // Lane 5 — knockout (no target, loading only)
  { loadingY: 69, targetMul: 0 },
];

interface Props {
  size?: number;
  className?: string;
}

export function WesternBlotRun({ size = 132, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  return (
    <div className={className}>
      <svg
        width={size}
        height={size * (140 / 124)}
        viewBox="0 0 124 140"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
        role="img"
        aria-label={`Western blot run — ${info.label}`}
      >
        {/* ── kDa ladder label */}
        <text
          x="13" y="6"
          textAnchor="middle"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          fontSize="5"
          fill="currentColor"
          stroke="none"
          opacity="0.65"
        >
          kDa
        </text>

        {/* ── kDa axis on the left side */}
        <line x1="13" y1="14" x2="13" y2="84" strokeWidth="0.78" opacity="0.7" />
        <line x1="10" y1="20" x2="16" y2="20" strokeWidth="0.9" opacity="0.7" />
        <line x1="10" y1="34" x2="16" y2="34" strokeWidth="0.9" opacity="0.7" />
        <line x1="10" y1="50" x2="16" y2="50" strokeWidth="0.9" opacity="0.7" />
        <line x1="10" y1="70" x2="16" y2="70" strokeWidth="0.9" opacity="0.7" />

        {/* ── Gel / membrane outline */}
        <rect x="22" y="10" width="96" height="78" rx="2" />

        {/* ── Lane dividers */}
        <line x1="41" y1="10" x2="41" y2="88" strokeWidth="0.52" opacity="0.35" />
        <line x1="60" y1="10" x2="60" y2="88" strokeWidth="0.52" opacity="0.35" />
        <line x1="79" y1="10" x2="79" y2="88" strokeWidth="0.52" opacity="0.35" />
        <line x1="98" y1="10" x2="98" y2="88" strokeWidth="0.52" opacity="0.35" />

        {/* ── Sample wells at the top of each lane (visible during
              LOAD; subtle outline throughout). */}
        {LANE_X.map((x) => (
          <rect
            key={`well-${x}`}
            x={x} y="11.5"
            width="11" height="3.5"
            strokeWidth="0.5"
            opacity={stage === "load" ? 0.9 : 0.3}
            style={{ transition: noTransition ?? "opacity 500ms ease" }}
          />
        ))}

        {/* ── Sample dots in the wells (visible only during LOAD) */}
        {LANE_X.map((x) => (
          <rect
            key={`sample-${x}`}
            x={x + 1} y="12.5"
            width="9" height="1.6"
            fill="currentColor"
            stroke="none"
            opacity={stage === "load" ? 0.7 : 0}
            style={{ transition: noTransition ?? "opacity 500ms ease" }}
          />
        ))}

        {/* ── Bands — animated per stage */}
        {LANES.map((lane, laneIdx) => {
          const x = LANE_X[laneIdx];
          return (
            <g key={`lane-${laneIdx}`}>
              {/* Ladder bands (lane 1 only) */}
              {lane.ladderBands?.map((y, j) => {
                const yPosByStage = bandFinalY("ladder", y);
                const opByStage = bandOpacity("ladder");
                return (
                  <BandRect
                    key={`ladder-${laneIdx}-${j}`}
                    x={x}
                    y={yPosByStage[stage]}
                    opacity={opByStage[stage]}
                    noTransition={noTransition}
                  />
                );
              })}

              {/* Target band */}
              {lane.targetY !== undefined && lane.targetMul > 0 && (
                <BandRect
                  x={x}
                  y={bandFinalY("target", lane.targetY)[stage]}
                  opacity={bandOpacity("target")[stage] * lane.targetMul}
                  highlight={stage === "probe" || stage === "develop"}
                  height={stage === "develop" ? 3.0 : 2.2}
                  noTransition={noTransition}
                />
              )}

              {/* Loading control band */}
              {lane.loadingY !== undefined && (
                <BandRect
                  x={x}
                  y={bandFinalY("loading", lane.loadingY)[stage]}
                  opacity={bandOpacity("loading")[stage]}
                  noTransition={noTransition}
                />
              )}
            </g>
          );
        })}

        {/* ── Stage label + sub-label */}
        <g fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
          <text x="62" y="106" textAnchor="middle" fontSize="6.8" fontWeight="700" letterSpacing="1.3">
            {info.label}
          </text>
          <text x="62" y="117" textAnchor="middle" fontSize="5.6" opacity="0.55" letterSpacing="0.4">
            {info.sub}
          </text>
        </g>

        {/* ── Stage dots */}
        <g
          transform="translate(46 130)"
          role="progressbar"
          aria-label={`Cycle stage ${stageIdx + 1} of ${STAGES.length}: ${info.label}`}
          aria-valuenow={stageIdx + 1}
          aria-valuemin={1}
          aria-valuemax={STAGES.length}
        >
          {STAGES.map((_, i) => (
            <circle
              key={i}
              cx={i * 8}
              cy={0}
              r="1.5"
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

/** A single animated band — y position + opacity transition in
 *  smoothly between stages. */
function BandRect({
  x, y, opacity, height = 2.2, highlight = false, noTransition,
}: {
  x: number;
  y: number;
  opacity: number;
  height?: number;
  highlight?: boolean;
  noTransition: "none" | undefined;
}) {
  return (
    <rect
      x={x}
      y={y}
      width="11"
      height={height}
      fill="currentColor"
      stroke={highlight ? "currentColor" : "none"}
      strokeWidth={highlight ? 0.3 : 0}
      opacity={opacity}
      style={{
        transition: noTransition ?? "y 1100ms ease, opacity 600ms ease, height 500ms ease",
      }}
    />
  );
}
