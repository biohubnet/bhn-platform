"use client";

/**
 * PkPdModeling — four-stage looping animation of the PK/PD
 * modeling workflow used in preclinical / translational dose
 * selection. Raw concentration-time data → compartmental model fit →
 * Monte-Carlo simulation across doses → human dose prediction.
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["data", "fit", "simulate", "predict"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  data:     { label: "DATA",      sub: "Cp vs t · raw",          duration: 2400 },
  fit:      { label: "FIT",       sub: "2-cmpt · NLME",          duration: 2600 },
  simulate: { label: "SIMULATE",  sub: "MC · n = 1000",          duration: 2800 },
  predict:  { label: "PREDICT",   sub: "PhI dose · 60 mg",       duration: 3000 },
};

// Plot area in viewBox units
const PLOT = { x: 26, y: 38, w: 128, h: 70 };

// Synthetic Cp-vs-t points (log-scale-ish decay)
const DATA_POINTS = [
  { t: 0.05, c: 0.95 },
  { t: 0.15, c: 0.78 },
  { t: 0.30, c: 0.55 },
  { t: 0.45, c: 0.40 },
  { t: 0.60, c: 0.28 },
  { t: 0.75, c: 0.18 },
  { t: 0.88, c: 0.10 },
];

interface Props { size?: number; className?: string; }

export function PkPdModeling({ size = 180, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  // Smooth fitted curve as a bezier path through the data shape
  const fitPath = (() => {
    const pts = DATA_POINTS.map(({ t, c }) => ({
      x: PLOT.x + t * PLOT.w,
      y: PLOT.y + (1 - c) * PLOT.h,
    }));
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i - 1], p1 = pts[i];
      const cx = (p0.x + p1.x) / 2;
      d += ` Q ${cx} ${p0.y} ${p1.x} ${p1.y}`;
    }
    return d;
  })();

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
        aria-label={`PK/PD modeling — ${info.label}`}
      >
        {/* Axes */}
        <line x1={PLOT.x} y1={PLOT.y} x2={PLOT.x} y2={PLOT.y + PLOT.h} strokeWidth="0.7" />
        <line x1={PLOT.x} y1={PLOT.y + PLOT.h} x2={PLOT.x + PLOT.w} y2={PLOT.y + PLOT.h} strokeWidth="0.7" />
        <text x={PLOT.x - 4} y={PLOT.y + 6} textAnchor="end" fontSize="3.6" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.55">Cp</text>
        <text x={PLOT.x + PLOT.w} y={PLOT.y + PLOT.h + 8} textAnchor="end" fontSize="3.6" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.55">t (h)</text>

        {/* Data points — always visible from stage 1 onwards */}
        {DATA_POINTS.map((p, i) => (
          <circle
            key={i}
            cx={PLOT.x + p.t * PLOT.w}
            cy={PLOT.y + (1 - p.c) * PLOT.h}
            r="1.6"
            fill="currentColor"
            stroke="none"
            opacity="0.75"
          />
        ))}

        {/* Fitted curve — visible from fit onwards */}
        <path
          d={fitPath}
          stroke="#86efac"
          strokeWidth="0.9"
          fill="none"
          opacity={stage === "fit" || stage === "simulate" || stage === "predict" ? 0.95 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}
        />

        {/* Simulation cloud — many faint curves, visible during simulate */}
        <g opacity={stage === "simulate" || stage === "predict" ? 0.55 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          {[0.85, 0.92, 1.06, 1.14, 1.22].map((scale, i) => (
            <path
              key={i}
              d={fitPath}
              stroke="#7dd3fc"
              strokeWidth="0.45"
              fill="none"
              transform={`translate(0 ${(scale - 1) * 12}) scale(1 ${scale})`}
              opacity="0.45"
              style={{ transformOrigin: `${PLOT.x + PLOT.w / 2}px ${PLOT.y + PLOT.h / 2}px` }}
            />
          ))}
        </g>

        {/* Predicted dose annotation — visible during predict */}
        <g opacity={stage === "predict" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <line x1={PLOT.x} y1={PLOT.y + PLOT.h * 0.45} x2={PLOT.x + PLOT.w} y2={PLOT.y + PLOT.h * 0.45} stroke="#fbbf24" strokeWidth="0.5" strokeDasharray="2 2" />
          <text x={PLOT.x + PLOT.w - 2} y={PLOT.y + PLOT.h * 0.45 - 2} textAnchor="end" fontSize="3.8" fill="#fbbf24" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">target Cmin</text>
          <text x={PLOT.x + 4} y={PLOT.y + 12} fontSize="5" fill="#fbbf24" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontWeight="700">60 mg q24h</text>
        </g>

        {/* Stage label */}
        <g fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
          <text x="90" y="134" textAnchor="middle" fontSize="6.8" fontWeight="700" letterSpacing="1.3">{info.label}</text>
          <text x="90" y="146" textAnchor="middle" fontSize="5.6" opacity="0.55" letterSpacing="0.4">{info.sub}</text>
        </g>

        <g
          transform="translate(72 158)"
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
