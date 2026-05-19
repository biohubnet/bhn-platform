"use client";

/**
 * ChromatographyPurification — four-stage looping animation of a
 * downstream chromatography step (think Protein A capture for a
 * monoclonal antibody, or IEX polishing). A column on the left, a
 * UV trace on the right. Bands migrate, the peak rises, then a
 * collection cup catches the product pool.
 *
 * Stages:
 *   1. LOAD   — feed band sits at the top of the column; nothing
 *               yet on the UV trace.
 *   2. WASH   — feed band still in the column; small flat baseline
 *               + early shoulder appearing on the UV trace as
 *               flow-through impurities elute.
 *   3. ELUTE  — feed band migrates down the column; UV trace
 *               draws a sharp Gaussian peak.
 *   4. POOL   — product band exits the bottom of the column into
 *               a collection cup; peak stays on the trace, cup
 *               fills with green pool.
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["load", "wash", "elute", "pool"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  load:  { label: "LOAD",  sub: "equilibrated resin",   duration: 2600 },
  wash:  { label: "WASH",  sub: "flow-through removed", duration: 2800 },
  elute: { label: "ELUTE", sub: "pH shift · linear",    duration: 3200 },
  pool:  { label: "POOL",  sub: "product collected",    duration: 2800 },
};

interface Props {
  size?: number;
  className?: string;
}

export function ChromatographyPurification({ size = 180, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  // Band y-position inside the column (column body: y 22..104).
  const bandY =
    stage === "load"  ? 28 :
    stage === "wash"  ? 38 :
    stage === "elute" ? 80 :
    /* pool */          104;

  // Band opacity — fades as it leaves the bottom of the column during POOL.
  const bandOpacity =
    stage === "pool" ? 0.4 : 0.9;

  // UV trace path — flat line + Gaussian peak. The "drawn" portion grows by stage.
  // Path is built piecewise so each stage can reveal more of it via dasharray.
  const traceLen = 200;
  const tracePath =
    "M 96 100 " +
    "L 110 100 " +              // baseline
    "L 120 99 L 126 96 " +      // wash shoulder
    "L 132 88 L 138 70 L 144 50 L 150 40 " + // peak rising
    "L 156 50 L 162 70 L 168 88 L 174 96 L 180 100"; // peak descending

  const traceOffset =
    stage === "load"  ? traceLen :
    stage === "wash"  ? traceLen * 0.6 :
    stage === "elute" ? 0 :
    /* pool */          0;

  // Collection cup pool fill — only visible during POOL.
  const poolFill = stage === "pool" ? 1 : 0;

  return (
    <div className={className}>
      <svg
        width={size}
        height={size * (160 / 180)}
        viewBox="0 0 180 160"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        role="img"
        aria-label={`Chromatography purification — ${info.label}`}
      >
        {/* ── Column body ─────────────────────────────────────────── */}
        <rect x="32" y="22" width="32" height="82" rx="2" />
        {/* Top inlet */}
        <line x1="48" y1="22" x2="48" y2="14" />
        <circle cx="48" cy="12" r="2" fill="currentColor" stroke="none" opacity="0.75" />
        {/* Resin frit lines top + bottom */}
        <line x1="32" y1="28" x2="64" y2="28" strokeWidth="0.55" strokeDasharray="2 1.5" opacity="0.5" />
        <line x1="32" y1="98" x2="64" y2="98" strokeWidth="0.55" strokeDasharray="2 1.5" opacity="0.5" />

        {/* Resin bed — light hatched fill */}
        <g opacity="0.32">
          {[34, 40, 46, 52, 58].map((x) => (
            <line key={x} x1={x} y1="32" x2={x} y2="96" strokeWidth="0.5" />
          ))}
        </g>

        {/* ── Migrating band */}
        <rect
          x="34" y={bandY} width="28" height="6"
          fill="#86efac" stroke="none"
          opacity={bandOpacity}
          style={{ transition: noTransition ?? "y 1100ms cubic-bezier(.5,.1,.4,1), opacity 600ms ease" }}
        />

        {/* ── Collection cup at the bottom */}
        <path d="M 30 108 L 30 124 Q 30 132, 38 132 L 58 132 Q 66 132, 66 124 L 66 108" />
        {/* Pool liquid level inside cup */}
        <rect
          x="33" y="120" width="30" height="10"
          fill="#86efac"
          opacity={0.6 * poolFill}
          stroke="none"
          style={{ transition: noTransition ?? "opacity 600ms ease" }}
        />
        {/* Drip from column to cup during POOL */}
        <line
          x1="48" y1="104" x2="48" y2="118"
          stroke="#86efac" strokeWidth="0.85"
          opacity={poolFill * 0.8}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}
        />

        {/* ── UV trace plot area ─────────────────────────────────── */}
        <g>
          {/* Axes */}
          <line x1="96" y1="100" x2="96" y2="30" opacity="0.55" />
          <line x1="96" y1="100" x2="180" y2="100" opacity="0.55" />
          <text
            x="96" y="22"
            fontSize="5.4"
            textAnchor="middle"
            fill="currentColor" stroke="none"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            opacity="0.6"
          >
            A₂₈₀
          </text>
          <text
            x="138" y="112"
            fontSize="5.4"
            textAnchor="middle"
            fill="currentColor" stroke="none"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            opacity="0.6"
          >
            volume (CV)
          </text>
        </g>

        {/* UV trace itself — reveal via strokeDashoffset. */}
        <path
          d={tracePath}
          stroke="currentColor" strokeWidth="1"
          fill="none"
          strokeDasharray={traceLen}
          strokeDashoffset={traceOffset}
          style={{ transition: noTransition ?? "stroke-dashoffset 1100ms cubic-bezier(.4,.1,.4,1)" }}
        />

        {/* Peak marker — small triangle above the apex during ELUTE / POOL */}
        <g
          opacity={stage === "elute" || stage === "pool" ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}
        >
          <path d="M 147 34 L 150 28 L 153 34 Z" fill="#86efac" stroke="none" />
          <text
            x="150" y="46"
            fontSize="5"
            textAnchor="middle"
            fill="currentColor" stroke="none"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            opacity="0.7"
          >
            mAb
          </text>
        </g>

        {/* ── Stage label */}
        <g
          fill="currentColor" stroke="none"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        >
          <text x="90" y="146" textAnchor="middle" fontSize="7" fontWeight="700" letterSpacing="1.3">
            {info.label}
          </text>
          <text x="90" y="156" textAnchor="middle" fontSize="5.8" opacity="0.55" letterSpacing="0.4">
            {info.sub}
          </text>
        </g>

        {/* ── Stage dots */}
        <g
          transform="translate(72 6)"
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
