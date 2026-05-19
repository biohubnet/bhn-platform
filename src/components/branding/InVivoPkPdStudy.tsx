"use client";

/**
 * InVivoPkPdStudy — four-stage looping animation of a mouse PK/PD
 * study. Animal is dosed, blood is sampled across timepoints, the
 * samples are assayed, and a PK curve emerges.
 *
 * Stages:
 *   1. DOSE     — small mouse silhouette with a dosing syringe nearby
 *   2. SAMPLE   — five timepoint sample tubes appear in a rack
 *   3. ASSAY    — sample dots transform into concentration markers
 *                 plotted on a small axis
 *   4. CURVE    — exponential decay curve draws through the points
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["dose", "sample", "assay", "curve"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  dose:   { label: "DOSE · 10 mg/kg",  sub: "PO · single",      duration: 2600 },
  sample: { label: "PK SAMPLING",      sub: "5 timepoints",     duration: 2400 },
  assay:  { label: "BIOANALYSIS",      sub: "LC-MS/MS",         duration: 2600 },
  curve:  { label: "PK PROFILE",       sub: "Cmax · AUC₀-24",   duration: 3200 },
};

// Timepoints (hours) and concentrations (arbitrary, log decay-ish)
const TIMEPOINTS = [
  { t: 0.5, c: 95 },
  { t: 1,   c: 80 },
  { t: 2,   c: 56 },
  { t: 4,   c: 32 },
  { t: 8,   c: 14 },
];

// Plot box
const PB = { x0: 84, y0: 96, x1: 168, y1: 36 };
function mapPoint(t: number, c: number) {
  const x = PB.x0 + ((Math.log(t + 0.5) - Math.log(0.5 + 0.5)) / (Math.log(8 + 0.5) - Math.log(0.5 + 0.5))) * (PB.x1 - PB.x0);
  const y = PB.y0 - (c / 100) * (PB.y0 - PB.y1);
  return { x, y };
}

interface Props { size?: number; className?: string; }

export function InVivoPkPdStudy({ size = 200, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  const showSyringe = stage === "dose";
  const showSamples = stage === "sample" || stage === "assay";
  const showAxes = stage === "assay" || stage === "curve";
  const showPoints = stage === "assay" || stage === "curve";
  const showCurve = stage === "curve";

  const CURVE_LEN = 200;

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
        aria-label={`In-vivo PK/PD — ${info.label}`}
      >
        {/* Mouse silhouette — body + ear + tail */}
        <g>
          <ellipse cx="40" cy="68" rx="22" ry="12" />
          <circle cx="20" cy="62" r="6" />
          <circle cx="18" cy="56" r="2.6" />
          <line x1="62" y1="68" x2="78" y2="76" strokeWidth="0.7" />
          {/* feet */}
          <line x1="30" y1="80" x2="30" y2="86" strokeWidth="0.7" />
          <line x1="50" y1="80" x2="50" y2="86" strokeWidth="0.7" />
          {/* eye */}
          <circle cx="14" cy="60" r="0.8" fill="currentColor" stroke="none" opacity="0.85" />
        </g>

        {/* Syringe — visible at DOSE */}
        <g
          opacity={showSyringe ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}
        >
          <rect x="22" y="34" width="22" height="6" rx="1" />
          <line x1="44" y1="37" x2="50" y2="37" strokeWidth="0.85" />
          <line x1="48" y1="35" x2="48" y2="39" strokeWidth="0.85" />
          <line x1="22" y1="37" x2="14" y2="37" strokeWidth="0.6" />
          <text
            x="14" y="32"
            fontSize="4.6"
            fill="currentColor" stroke="none"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            opacity="0.7"
          >100 µL</text>
        </g>

        {/* Sample tubes — visible at SAMPLE and ASSAY */}
        <g
          opacity={showSamples ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}
        >
          {TIMEPOINTS.map((tp, i) => (
            <g key={`s-${i}`} transform={`translate(${84 + i * 16} 70)`}>
              <rect x="-3" y="-12" width="6" height="18" rx="1" />
              <line x1="-3" y1="-2" x2="3" y2="-2" strokeWidth="0.55" opacity="0.5" />
              {/* fill volume */}
              <rect x="-2" y={-12 + 14 - (tp.c / 100) * 10} width="4" height={(tp.c / 100) * 10} fill="#7dd3fc" fillOpacity="0.45" stroke="none" />
              <text
                x="0" y="14"
                fontSize="4.4" textAnchor="middle"
                fill="currentColor" stroke="none"
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                opacity="0.6"
              >{tp.t}h</text>
            </g>
          ))}
        </g>

        {/* Plot axes — visible at ASSAY and CURVE */}
        <g
          opacity={showAxes ? 0.7 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}
        >
          <line x1={PB.x0} y1={PB.y0} x2={PB.x1} y2={PB.y0} />
          <line x1={PB.x0} y1={PB.y0} x2={PB.x0} y2={PB.y1} />
          <text
            x={(PB.x0 + PB.x1) / 2} y={PB.y0 + 10}
            fontSize="4.6" textAnchor="middle"
            fill="currentColor" stroke="none"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            opacity="0.6"
          >time (h)</text>
          <text
            x={PB.x0 - 6} y={(PB.y0 + PB.y1) / 2}
            fontSize="4.6" textAnchor="middle"
            fill="currentColor" stroke="none"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            opacity="0.6"
            transform={`rotate(-90 ${PB.x0 - 6} ${(PB.y0 + PB.y1) / 2})`}
          >[drug]</text>
        </g>

        {/* Data points */}
        <g
          opacity={showPoints ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}
        >
          {TIMEPOINTS.map((tp, i) => {
            const p = mapPoint(tp.t, tp.c);
            return <circle key={`p-${i}`} cx={p.x} cy={p.y} r="1.8" fill="currentColor" stroke="none" />;
          })}
        </g>

        {/* PK curve */}
        <path
          d={(() => {
            const pts = TIMEPOINTS.map((tp) => mapPoint(tp.t, tp.c));
            let d = `M ${pts[0].x} ${pts[0].y}`;
            for (let i = 1; i < pts.length; i++) {
              d += ` L ${pts[i].x} ${pts[i].y}`;
            }
            return d;
          })()}
          stroke="#86efac" strokeWidth="0.95" fill="none"
          strokeDasharray={CURVE_LEN}
          strokeDashoffset={showCurve ? 0 : CURVE_LEN}
          style={{ transition: noTransition ?? "stroke-dashoffset 1100ms cubic-bezier(.4,.1,.4,1)" }}
        />
        {/* Cmax dot annotation */}
        <g
          opacity={showCurve ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}
        >
          {(() => { const p = mapPoint(0.5, 95); return (
            <>
              <circle cx={p.x} cy={p.y} r="2.4" stroke="#86efac" strokeWidth="0.85" fill="none" />
              <text
                x={p.x + 4} y={p.y - 2}
                fontSize="4.4"
                fill="#86efac" stroke="none"
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              >Cmax</text>
            </>
          ); })()}
        </g>

        {/* Stage label */}
        <g fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
          <text x="100" y="130" textAnchor="middle" fontSize="6.8" fontWeight="700" letterSpacing="1.3">{info.label}</text>
          <text x="100" y="142" textAnchor="middle" fontSize="5.6" opacity="0.55" letterSpacing="0.4">{info.sub}</text>
        </g>

        <g
          transform="translate(82 154)"
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
