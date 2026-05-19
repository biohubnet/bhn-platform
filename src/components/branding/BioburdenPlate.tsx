"use client";

/**
 * BioburdenPlate — four-stage looping animation of pre-sterile
 * bioburden enumeration. A sample is filtered or directly plated
 * onto soybean-casein digest agar, incubated, and CFU are counted.
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["dilute", "plate", "incubate", "count"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  dilute:   { label: "DILUTION",  sub: "1:10 · serial",       duration: 2400 },
  plate:    { label: "PLATE",     sub: "SCDA · spread",       duration: 2400 },
  incubate: { label: "INCUBATE",  sub: "3 d · 32 °C",         duration: 2600 },
  count:    { label: "ENUMERATE", sub: "14 CFU · pass",       duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function BioburdenPlate({ size = 180, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  const showPlate = stage === "plate" || stage === "incubate" || stage === "count";
  const showColonies = stage === "incubate" || stage === "count";
  const showCount = stage === "count";

  // Colony positions and sizes
  const COLONIES = [
    { x: 60, y: 60, r: 2 }, { x: 78, y: 56, r: 1.6 }, { x: 90, y: 70, r: 2.4 },
    { x: 100, y: 60, r: 1.8 }, { x: 110, y: 76, r: 1.4 }, { x: 70, y: 78, r: 2.2 },
    { x: 84, y: 88, r: 1.6 }, { x: 100, y: 90, r: 2 }, { x: 116, y: 64, r: 1.8 },
    { x: 56, y: 72, r: 1.4 }, { x: 64, y: 92, r: 1.6 }, { x: 122, y: 80, r: 2 },
    { x: 74, y: 100, r: 1.4 }, { x: 108, y: 96, r: 1.6 },
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
        aria-label={`Bioburden plate — ${info.label}`}
      >
        {/* Dilution tubes */}
        <g opacity={stage === "dilute" ? 1 : 0.4} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          {[16, 30, 44].map((x, i) => (
            <g key={x}>
              <rect x={x} y="32" width="10" height="22" rx="1" strokeWidth="0.7" />
              <rect x={x} y={42 - i * 4} width="10" height={i === 0 ? 12 : 8} fill="#7dd3fc" fillOpacity={0.4 - i * 0.1} stroke="none" />
              <text x={x + 5} y="62" textAnchor="middle" fontSize="3.6" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.65">1:10{i ? `^${i + 1}` : ""}</text>
            </g>
          ))}
        </g>

        {/* Petri dish */}
        <g opacity={showPlate ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <circle cx="90" cy="76" r="40" strokeWidth="0.95" />
          <circle cx="90" cy="76" r="36" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.55" />
          {/* Inoculation spread spiral */}
          {!showColonies && (
            <path d="M 90 76 m -22 0 a 22 22 0 1 0 44 0 a 22 22 0 1 0 -44 0" strokeWidth="0.55" strokeDasharray="2 1.5" opacity="0.45" />
          )}
          <text x="90" y="124" textAnchor="middle" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.65">SCDA · 90 mm</text>
        </g>

        {/* Colonies appear after incubation */}
        <g opacity={showColonies ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          {COLONIES.map((c, i) => (
            <circle key={i} cx={c.x} cy={c.y} r={c.r} fill="#86efac" stroke="none" opacity="0.85" />
          ))}
        </g>

        {/* Count badge */}
        <g opacity={showCount ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <rect x="140" y="36" width="32" height="14" rx="7" stroke="#86efac" strokeWidth="0.85" fill="#86efac" fillOpacity="0.16" />
          <text x="156" y="46" textAnchor="middle" fontSize="5.6" fill="#86efac" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontWeight="700">14 CFU</text>
          <text x="156" y="56" textAnchor="middle" fontSize="4" fill="#86efac" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" letterSpacing="0.3">PASS</text>
        </g>

        {/* Stage label */}
        <g fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
          <text x="90" y="136" textAnchor="middle" fontSize="6.8" fontWeight="700" letterSpacing="1.3">{info.label}</text>
          <text x="90" y="148" textAnchor="middle" fontSize="5.6" opacity="0.55" letterSpacing="0.4">{info.sub}</text>
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
