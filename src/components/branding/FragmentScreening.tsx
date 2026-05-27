"use client";

/**
 * FragmentScreening — four-stage looping animation of fragment-based
 * drug discovery (FBDD). A library of low-molecular-weight fragments
 * is screened against a target → SPR / STD-NMR identifies binders →
 * a hit is selected → SAR analogs are grown around the fragment to
 * raise potency.
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["library", "screen", "hit", "grow"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  library: { label: "LIBRARY",  sub: "1,500 fragments",     duration: 2400 },
  screen:  { label: "SCREEN",   sub: "STD-NMR · SPR",       duration: 2600 },
  hit:     { label: "HIT",      sub: "Kd = 300 µM",         duration: 2400 },
  grow:    { label: "GROW",     sub: "SAR · 50 nM lead",    duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function FragmentScreening({ size = 180, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  // 4×6 fragment grid
  const fragments: { x: number; y: number }[] = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 6; c++) fragments.push({ x: 30 + c * 20, y: 44 + r * 14 });
  }

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
        aria-label={`Fragment screening — ${info.label}`}
      >
        <rect x="22" y="36" width="136" height="68" rx="2.5" strokeWidth="0.65" />
        {fragments.map((f, i) => {
          const isHit = i === 9 || i === 16;
          const showAsHit = (stage === "hit" || stage === "grow") && isHit;
          return (
            <g key={i}>
              <circle cx={f.x} cy={f.y} r="3" strokeWidth="0.5" />
              <circle
                cx={f.x} cy={f.y} r="2.4"
                fill={showAsHit ? "#86efac" : "currentColor"}
                fillOpacity={showAsHit ? 0.9 : 0.4}
                stroke="none"
                style={{ transition: noTransition ?? "fill 350ms ease, fill-opacity 350ms ease" }}
              />
            </g>
          );
        })}

        {/* Stage 2 — STD-NMR peaks */}
        <g opacity={stage === "screen" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <path d="M 24 100 L 40 100 L 44 88 L 48 100 L 60 100 L 64 92 L 68 100 L 84 100 L 88 80 L 92 100 L 108 100 L 112 90 L 116 100 L 132 100 L 136 86 L 140 100 L 158 100" stroke="#7dd3fc" strokeWidth="0.85" fill="none" />
        </g>

        {/* Stage 4 — SAR analog growth around the hit */}
        <g opacity={stage === "grow" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <g transform="translate(70 58)">
            {[[0, 0], [-10, -6], [10, -6], [-10, 8], [10, 8], [0, 14]].map(([dx, dy], i) => (
              <g key={i} transform={`translate(${dx} ${dy})`}>
                <circle cx="0" cy="0" r="3" stroke="#86efac" strokeWidth="0.7" fill="#86efac" fillOpacity={i === 0 ? 0.6 : 0.25} />
              </g>
            ))}
            <line x1="-10" y1="-6" x2="0" y2="0" stroke="#86efac" strokeWidth="0.45" opacity="0.7" />
            <line x1="10" y1="-6" x2="0" y2="0" stroke="#86efac" strokeWidth="0.45" opacity="0.7" />
            <line x1="-10" y1="8" x2="0" y2="0" stroke="#86efac" strokeWidth="0.45" opacity="0.7" />
            <line x1="10" y1="8" x2="0" y2="0" stroke="#86efac" strokeWidth="0.45" opacity="0.7" />
            <line x1="0" y1="14" x2="0" y2="0" stroke="#86efac" strokeWidth="0.45" opacity="0.7" />
          </g>
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
