"use client";

/**
 * MasterProtocolTrial — four-stage looping animation of a master
 * protocol / umbrella trial design. Patients screened against a
 * biomarker panel → assigned to one of multiple parallel sub-studies
 * → each arm runs its own dosing + readout → data rolls back up to
 * one consolidated trial.
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["screen", "assign", "treat", "readout"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  screen:  { label: "SCREEN",  sub: "biomarker · n = 248",  duration: 2400 },
  assign:  { label: "ASSIGN",  sub: "4 sub-studies",        duration: 2600 },
  treat:   { label: "TREAT",   sub: "arms run in parallel", duration: 2800 },
  readout: { label: "READOUT", sub: "combined endpoint",    duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function MasterProtocolTrial({ size = 180, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  // 4 sub-studies fan out from a central hub
  const arms = [
    { x: 50, y: 50, color: "#86efac", label: "A" },
    { x: 130, y: 50, color: "#7dd3fc", label: "B" },
    { x: 50, y: 96, color: "#fbbf24", label: "C" },
    { x: 130, y: 96, color: "#fb7185", label: "D" },
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
        aria-label={`Master protocol — ${info.label}`}
      >
        {/* Central hub — master protocol */}
        <rect x="78" y="64" width="24" height="20" rx="2" strokeWidth="0.85" fill="currentColor" fillOpacity="0.08" />
        <text x="90" y="76" textAnchor="middle" fontSize="4.6" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontWeight="700">HUB</text>

        {/* Arms — visible from assign onwards */}
        {arms.map((a, i) => {
          const visible = stage !== "screen";
          const tint = stage === "treat" || stage === "readout" ? a.color : "currentColor";
          return (
            <g key={i} opacity={visible ? 1 : 0.3} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
              <line
                x1={a.x < 90 ? 78 : 102}
                y1={a.y < 74 ? 70 : 78}
                x2={a.x + (a.x < 90 ? 14 : 0)}
                y2={a.y + (a.y < 74 ? 12 : -2)}
                stroke={tint}
                strokeWidth="0.55"
                strokeDasharray="2 2"
              />
              <rect x={a.x} y={a.y} width="14" height="12" rx="1.5" stroke={tint} strokeWidth="0.7" fill={tint} fillOpacity="0.18" />
              <text x={a.x + 7} y={a.y + 8} textAnchor="middle" fontSize="4.4" fill={tint} stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontWeight="700">{a.label}</text>
            </g>
          );
        })}

        {/* Stage 1 — patient pool */}
        <g opacity={stage === "screen" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          {Array.from({ length: 20 }).map((_, i) => (
            <circle
              key={i}
              cx={28 + (i % 10) * 14}
              cy={36 + Math.floor(i / 10) * 8}
              r="1.4"
              fill="#7dd3fc"
              stroke="none"
              opacity="0.8"
            />
          ))}
          <text x="90" y="108" textAnchor="middle" fontSize="3.6" fill="#7dd3fc" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">screening · 248 → 60 enroll</text>
        </g>

        {/* Stage 4 — combined readout */}
        <g opacity={stage === "readout" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <rect x="54" y="108" width="72" height="10" rx="1.5" stroke="#86efac" strokeWidth="0.7" fill="#86efac" fillOpacity="0.2" />
          <text x="90" y="116" textAnchor="middle" fontSize="4.4" fill="#86efac" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontWeight="700">combined endpoint hit</text>
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
