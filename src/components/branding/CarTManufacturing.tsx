"use client";

/**
 * CarTManufacturing — five-stage looping animation of autologous
 * CAR-T cell manufacturing — apheresis from the patient, viral
 * transduction, expansion, QC release, then infusion back.
 *
 * Stages:
 *   1. APHERESIS  — patient + apheresis line + collection bag
 *   2. TRANSDUCE  — cells with viral vector capsids approaching
 *   3. EXPAND     — bioreactor bag with growing cells (more dots)
 *   4. RELEASE    — green QC check stamp on the product
 *   5. INFUSE     — drip back into patient
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["apheresis", "transduce", "expand", "release", "infuse"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  apheresis: { label: "APHERESIS",     sub: "T cells · 10¹⁰",       duration: 2600 },
  transduce: { label: "TRANSDUCE",     sub: "lentiviral · CAR",     duration: 2800 },
  expand:    { label: "EXPAND",        sub: "GMP bioreactor",       duration: 2800 },
  release:   { label: "QC RELEASE",    sub: "potency · sterility",  duration: 2800 },
  infuse:    { label: "INFUSE",        sub: "lymphodepletion done", duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function CarTManufacturing({ size = 200, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  const showApheresis = stage === "apheresis";
  const showTransduce = stage === "transduce";
  const showExpand = stage === "expand";
  const showRelease = stage === "release";
  const showInfuse = stage === "infuse";

  // Cell counts grow stage by stage
  const cellCount = stage === "apheresis" ? 4 : stage === "transduce" ? 5 : stage === "expand" ? 10 : stage === "release" ? 10 : 0;
  const CELLS = [
    {x:60,y:48},{x:70,y:54},{x:64,y:62},{x:74,y:46},
    {x:80,y:60},{x:84,y:50},{x:88,y:64},{x:92,y:54},
    {x:96,y:62},{x:100,y:48},
  ];

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
        aria-label={`CAR-T manufacturing — ${info.label}`}
      >
        {/* Patient silhouette — left side (apheresis + infuse) */}
        <g>
          <circle cx="22" cy="32" r="7" />
          <path d="M 12 80 Q 22 52, 32 80" />
        </g>

        {/* Apheresis line + bag */}
        <g
          opacity={showApheresis ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}
        >
          <line x1="32" y1="40" x2="56" y2="46" strokeWidth="0.7" />
          <rect x="56" y="40" width="22" height="20" rx="2" />
          <line x1="60" y1="46" x2="74" y2="46" strokeWidth="0.55" opacity="0.5" />
          <text x="67" y="68" textAnchor="middle" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.7">collection</text>
        </g>

        {/* Central vessel — appears at transduce/expand */}
        <g
          opacity={showTransduce || showExpand || showRelease ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}
        >
          <rect x="56" y="36" width="58" height="40" rx="3" />
          <line x1="56" y1="42" x2="114" y2="42" strokeWidth="0.55" opacity="0.55" strokeDasharray="2 2" />
        </g>

        {/* Viral vector capsids — small triangles approaching during TRANSDUCE */}
        <g
          opacity={showTransduce ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}
        >
          {[
            {x:120, y:40}, {x:124, y:50}, {x:120, y:60}, {x:124, y:70},
          ].map((v, i) => (
            <g key={i}>
              <polygon points={`${v.x},${v.y - 2.5} ${v.x + 4},${v.y} ${v.x},${v.y + 2.5} ${v.x - 4},${v.y}`} stroke="currentColor" strokeWidth="0.55" fill="currentColor" fillOpacity="0.2" />
              <line x1={v.x - 2} y1={v.y - 2.5} x2={v.x + 2} y2={v.y - 5} strokeWidth="0.55" opacity="0.65" />
              <line x1={v.x + 2} y1={v.y - 2.5} x2={v.x + 5} y2={v.y - 4} strokeWidth="0.55" opacity="0.65" />
            </g>
          ))}
        </g>

        {/* Cells inside vessel */}
        <g
          opacity={showTransduce || showExpand || showRelease ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}
        >
          {CELLS.slice(0, cellCount).map((c, i) => (
            <circle key={`c-${i}`} cx={c.x} cy={c.y} r="1.5" fill="#7dd3fc" stroke="none" opacity="0.85" />
          ))}
        </g>

        {/* Release stamp */}
        <g
          opacity={showRelease ? 1 : 0}
          style={{
            transition: noTransition ?? "opacity 500ms ease, transform 600ms cubic-bezier(.4,.1,.4,1)",
            transform: showRelease ? "rotate(-10deg) translate(0,0)" : "rotate(-10deg) translate(-6px,6px)",
            transformOrigin: "85px 56px",
          }}
        >
          <ellipse cx="85" cy="56" rx="18" ry="11" stroke="#86efac" strokeWidth="0.95" fill="#86efac" fillOpacity="0.18" />
          <text x="85" y="60" textAnchor="middle" fontSize="6.4" fill="#86efac" stroke="none" fontFamily="ui-monospace,monospace" fontWeight="700">RELEASE</text>
        </g>

        {/* Infusion path — visible during INFUSE: vessel back to patient */}
        <g
          opacity={showInfuse ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}
        >
          {/* IV bag */}
          <rect x="120" y="20" width="22" height="30" rx="2" />
          <line x1="124" y1="26" x2="138" y2="26" strokeWidth="0.55" opacity="0.55" />
          {/* Drip chamber + line */}
          <ellipse cx="131" cy="56" rx="3" ry="4" />
          <line x1="131" y1="60" x2="131" y2="78" strokeWidth="0.85" />
          {/* Curve down to patient */}
          <path d="M 131 78 Q 100 88, 30 68" strokeWidth="0.85" />
          {/* Droplets */}
          <circle cx="131" cy="50" r="0.9" fill="#7dd3fc" stroke="none" opacity="0.85" />
          <circle cx="131" cy="68" r="0.8" fill="#7dd3fc" stroke="none" opacity="0.7" />
          <text x="131" y="100" textAnchor="middle" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.65">infusion</text>
        </g>

        {/* Stage label */}
        <g fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
          <text x="100" y="134" textAnchor="middle" fontSize="6.8" fontWeight="700" letterSpacing="1.3">{info.label}</text>
          <text x="100" y="146" textAnchor="middle" fontSize="5.6" opacity="0.55" letterSpacing="0.4">{info.sub}</text>
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
