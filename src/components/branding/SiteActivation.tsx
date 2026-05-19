"use client";

/**
 * SiteActivation — five-stage looping animation of clinical-trial
 * site activation. A candidate site is selected, contract executed,
 * IRB approves, regulatory pack delivered, then FPI (first patient in).
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["select", "contract", "irb", "ready", "fpi"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  select:   { label: "SELECT SITE",     sub: "feasibility · PI",     duration: 2400 },
  contract: { label: "CONTRACT",        sub: "CTA · budget",         duration: 2400 },
  irb:      { label: "IRB · APPROVED",  sub: "protocol · ICF",       duration: 2600 },
  ready:    { label: "SIV · GREEN",     sub: "supplies · training",  duration: 2400 },
  fpi:      { label: "FPI",             sub: "first patient · C1D1", duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function SiteActivation({ size = 180, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  const checkpoints = {
    select: 0, contract: 1, irb: 2, ready: 3, fpi: 4,
  };
  const idx = checkpoints[stage];

  const SITES = [
    { x: 90, y: 50 },
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
        aria-label={`Site activation — ${info.label}`}
      >
        {/* Hospital silhouette */}
        <g>
          <rect x="58" y="32" width="64" height="40" />
          <rect x="64" y="40" width="10" height="10" strokeWidth="0.55" />
          <rect x="80" y="40" width="10" height="10" strokeWidth="0.55" />
          <rect x="96" y="40" width="10" height="10" strokeWidth="0.55" />
          <rect x="64" y="56" width="10" height="10" strokeWidth="0.55" />
          <rect x="80" y="56" width="10" height="10" strokeWidth="0.55" />
          <rect x="96" y="56" width="10" height="10" strokeWidth="0.55" />
          {/* Hospital cross */}
          <line x1="90" y1="20" x2="90" y2="30" strokeWidth="0.9" />
          <line x1="86" y1="25" x2="94" y2="25" strokeWidth="0.9" />
          <text x="90" y="80" textAnchor="middle" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.7">SITE 02</text>
        </g>

        {/* Checkpoint chain */}
        <g>
          {[
            { x: 24, label: "PI" },
            { x: 60, label: "CTA" },
            { x: 96, label: "IRB" },
            { x: 132, label: "SIV" },
            { x: 168, label: "FPI" },
          ].map((c, i) => {
            const lit = idx >= i;
            return (
              <g key={i}>
                <circle cx={c.x} cy="100" r="5" stroke={lit ? "#86efac" : "currentColor"} strokeWidth="0.85" fill={lit ? "#86efac" : "currentColor"} fillOpacity={lit ? 0.25 : 0.04} />
                {lit && <path d={`M ${c.x - 2.4} 100 L ${c.x - 0.5} 102 L ${c.x + 2.6} 97`} stroke="#86efac" strokeWidth="0.85" fill="none" />}
                <text x={c.x} y="112" textAnchor="middle" fontSize="4.4" fill={lit ? "#86efac" : "currentColor"} stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity={lit ? 1 : 0.55}>{c.label}</text>
              </g>
            );
          })}
          {/* Connector line */}
          <line x1="24" y1="100" x2="168" y2="100" strokeWidth="0.55" opacity="0.45" />
          {/* Lit portion */}
          {idx > 0 && (
            <line x1="24" y1="100" x2={24 + 36 * idx} y2="100" stroke="#86efac" strokeWidth="0.95" opacity="0.65" />
          )}
        </g>

        {/* FPI patient icon */}
        <g opacity={stage === "fpi" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <circle cx="148" cy="68" r="5" fill="#86efac" fillOpacity="0.2" stroke="#86efac" strokeWidth="0.7" />
          <path d="M 142 80 Q 148 72, 154 80" stroke="#86efac" strokeWidth="0.7" fill="none" />
          <text x="148" y="92" textAnchor="middle" fontSize="4.4" fill="#86efac" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" letterSpacing="0.3">PT-001</text>
        </g>

        {/* Stage label */}
        <g fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
          <text x="90" y="138" textAnchor="middle" fontSize="6.8" fontWeight="700" letterSpacing="1.3">{info.label}</text>
          <text x="90" y="150" textAnchor="middle" fontSize="5.6" opacity="0.55" letterSpacing="0.4">{info.sub}</text>
        </g>

        <g
          transform="translate(60 162)"
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
