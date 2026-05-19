"use client";

/**
 * EndotoxinLAL — four-stage looping animation of an endotoxin
 * test by LAL (Limulus Amebocyte Lysate, gel-clot or kinetic
 * chromogenic). Sample is mixed with LAL reagent, incubated, and
 * a result is read against an endotoxin specification.
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["sample", "lal", "react", "result"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  sample: { label: "SAMPLE · pH 6–8",  sub: "endo-free water dilution", duration: 2400 },
  lal:    { label: "LAL · ADD",         sub: "lysate · 37 °C",          duration: 2400 },
  react:  { label: "REACTION",          sub: "kinetic · 60 min",        duration: 2800 },
  result: { label: "EU/mL · PASS",      sub: "below limit",             duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function EndotoxinLAL({ size = 180, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  const showLal = stage === "lal" || stage === "react" || stage === "result";
  const showReact = stage === "react" || stage === "result";
  const showResult = stage === "result";

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
        aria-label={`Endotoxin LAL — ${info.label}`}
      >
        {/* Microplate */}
        <rect x="20" y="34" width="100" height="60" rx="3" />
        {Array.from({ length: 8 }).map((_, c) => (
          Array.from({ length: 5 }).map((_, r) => (
            <circle
              key={`${c}-${r}`}
              cx={28 + c * 12}
              cy={40 + r * 11}
              r="3"
              strokeWidth="0.5" opacity="0.55"
            />
          ))
        ))}
        <text x="20" y="30" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.6">96-well · LAL plate</text>

        {/* LAL reagent dropper */}
        <g opacity={showLal ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <rect x="130" y="22" width="14" height="20" rx="2" />
          <line x1="137" y1="42" x2="137" y2="56" strokeWidth="0.85" />
          <circle cx="137" cy="58" r="1.2" fill="#fbbf24" stroke="none" opacity="0.85" />
          <text x="137" y="18" textAnchor="middle" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.7">LAL</text>
        </g>

        {/* Reaction — wells turn amber */}
        <g opacity={showReact ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          {Array.from({ length: 8 }).map((_, c) => (
            Array.from({ length: 5 }).map((_, r) => (
              <circle
                key={`${c}-${r}-r`}
                cx={28 + c * 12}
                cy={40 + r * 11}
                r="2.4"
                fill="#fbbf24"
                fillOpacity={0.15 + (c + r) * 0.04}
                stroke="none"
              />
            ))
          ))}
        </g>

        {/* Pass banner */}
        <g opacity={showResult ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <rect x="130" y="60" width="40" height="22" rx="3" stroke="#86efac" strokeWidth="0.85" fill="#86efac" fillOpacity="0.16" />
          <text x="150" y="72" textAnchor="middle" fontSize="5.4" fill="#86efac" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontWeight="700">0.18 EU/mL</text>
          <text x="150" y="80" textAnchor="middle" fontSize="4.4" fill="#86efac" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" letterSpacing="0.4">PASS &lt; 0.5</text>
        </g>

        {/* Stage label */}
        <g fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
          <text x="90" y="124" textAnchor="middle" fontSize="6.8" fontWeight="700" letterSpacing="1.3">{info.label}</text>
          <text x="90" y="136" textAnchor="middle" fontSize="5.6" opacity="0.55" letterSpacing="0.4">{info.sub}</text>
        </g>

        <g
          transform="translate(72 152)"
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
