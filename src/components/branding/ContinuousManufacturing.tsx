"use client";

/**
 * ContinuousManufacturing — four-stage looping animation contrasting
 * batch manufacturing (discrete unit operations with hold tanks
 * between them) with continuous manufacturing (steady-state flow
 * between connected units). FDA-encouraged evolution for both small
 * molecules and biologics.
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["batch", "connect", "steady", "continuous"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  batch:      { label: "BATCH",       sub: "isolated units · holds",     duration: 2400 },
  connect:    { label: "CONNECT",     sub: "remove holds · 1 line",      duration: 2600 },
  steady:     { label: "STEADY",      sub: "controlled state",           duration: 2600 },
  continuous: { label: "CONTINUOUS",  sub: "24/7 · 1 batch · no breaks", duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function ContinuousManufacturing({ size = 180, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  // 4 unit operations in a row
  const units = [
    { x: 30, label: "rx" },     // reactor
    { x: 64, label: "fil" },    // filter
    { x: 98, label: "dry" },    // dry
    { x: 132, label: "pkg" },   // package
  ];

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
        aria-label={`Continuous manufacturing — ${info.label}`}
      >
        {/* Unit operations */}
        {units.map((u, i) => (
          <g key={i}>
            <rect x={u.x} y="56" width="20" height="20" rx="1.5" strokeWidth="0.85" />
            <text x={u.x + 10} y="69" textAnchor="middle" fontSize="3.6" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.7">{u.label}</text>
          </g>
        ))}

        {/* Stage 1 — batch holds between units */}
        <g opacity={stage === "batch" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          {units.slice(0, -1).map((u, i) => (
            <g key={i} transform={`translate(${u.x + 22} 60)`}>
              <ellipse cx="6" cy="6" rx="6" ry="4" stroke="#fbbf24" strokeWidth="0.7" fill="#fbbf24" fillOpacity="0.2" />
              <text x="6" y="14" textAnchor="middle" fontSize="3" fill="#fbbf24" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">hold</text>
            </g>
          ))}
        </g>

        {/* Stage 2 — connecting lines drawn between units */}
        <g opacity={stage === "connect" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          {units.slice(0, -1).map((u, i) => (
            <path key={i} d={`M ${u.x + 20} 66 L ${u.x + 34} 66`} stroke="#86efac" strokeWidth="0.85" />
          ))}
        </g>

        {/* Stage 3 — steady state: filled lines, flow indicators */}
        <g opacity={stage === "steady" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          {units.slice(0, -1).map((u, i) => (
            <g key={i}>
              <path d={`M ${u.x + 20} 66 L ${u.x + 34} 66`} stroke="#86efac" strokeWidth="1" />
              <circle cx={u.x + 27} cy={66} r="1.4" fill="#86efac" stroke="none" />
            </g>
          ))}
          <text x="90" y="92" textAnchor="middle" fontSize="3.6" fill="#86efac" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">CQAs · in control</text>
        </g>

        {/* Stage 4 — continuous flow + 24/7 output */}
        <g opacity={stage === "continuous" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          {units.slice(0, -1).map((u, i) => (
            <g key={i}>
              <path d={`M ${u.x + 20} 66 L ${u.x + 34} 66`} stroke="#86efac" strokeWidth="1.1" />
              {[0, 1, 2].map((j) => (
                <circle key={j} cx={u.x + 22 + j * 4} cy={66} r="1" fill="#86efac" stroke="none" opacity={0.4 + j * 0.2} />
              ))}
            </g>
          ))}
          {/* Output stream out the right side */}
          <line x1="152" y1="66" x2="166" y2="66" stroke="#86efac" strokeWidth="1.1" />
          <path d="M 162 63 L 166 66 L 162 69" stroke="#86efac" strokeWidth="0.85" fill="none" />
          <text x="90" y="92" textAnchor="middle" fontSize="3.6" fill="#86efac" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">24 / 7 · steady output</text>
        </g>

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
