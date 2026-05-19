"use client";

/**
 * AsepticConnection — four-stage looping animation of a sterile
 * tubing weld in a closed-system process (BHN closed-systems +
 * CAR-T manufacturing course). Two tubing ends are aligned, heat
 * is applied, the weld forms, and integrity is verified.
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["align", "heat", "weld", "verify"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  align:  { label: "ALIGN TUBING",  sub: "TPE · same OD",       duration: 2400 },
  heat:   { label: "HEAT BLADE",    sub: "wafer · 260 °C",      duration: 2600 },
  weld:   { label: "WELD",          sub: "fuse · cool",          duration: 2600 },
  verify: { label: "INTEGRITY",     sub: "no leak · sterile",   duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function AsepticConnection({ size = 180, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  const showHeat = stage === "heat";
  const showWeld = stage === "weld" || stage === "verify";
  const showVerify = stage === "verify";

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
        aria-label={`Aseptic connection — ${info.label}`}
      >
        {/* Tubing — left segment */}
        <rect x="18" y="64" width="68" height="12" rx="2" />
        {/* Inner lumen */}
        <line x1="22" y1="70" x2="84" y2="70" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.55" />
        {/* Tubing — right segment */}
        <rect x="94" y="64" width="68" height="12" rx="2" />
        <line x1="96" y1="70" x2="160" y2="70" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.55" />

        {/* Welder housing */}
        <rect x="80" y="50" width="20" height="40" rx="2" strokeWidth="0.95" fill="currentColor" fillOpacity="0.06" />
        <line x1="80" y1="60" x2="100" y2="60" strokeWidth="0.6" opacity="0.55" />
        <text x="90" y="58" textAnchor="middle" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.65" letterSpacing="0.3">WELD</text>

        {/* Heater blade */}
        <g opacity={showHeat ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <rect x="86" y="68" width="8" height="4" fill="#fb7185" stroke="none" opacity="0.85" />
          <circle cx="90" cy="70" r="3" stroke="#fb7185" strokeWidth="0.65" opacity="0.55" />
          <text x="90" y="46" textAnchor="middle" fontSize="4.6" fill="#fb7185" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">260 °C</text>
        </g>

        {/* Welded joint */}
        <g opacity={showWeld ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <rect x="86" y="64" width="8" height="12" fill="#86efac" fillOpacity="0.3" stroke="#86efac" strokeWidth="0.7" />
          <line x1="86" y1="70" x2="94" y2="70" stroke="#86efac" strokeWidth="0.6" opacity="0.85" />
        </g>

        {/* Integrity check — green ring + flow arrows */}
        <g opacity={showVerify ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <circle cx="90" cy="70" r="10" stroke="#86efac" strokeWidth="0.95" fill="none" />
          {/* Flow arrows */}
          <path d="M 22 100 L 158 100" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.55" />
          <path d="M 154 97 L 158 100 L 154 103" strokeWidth="0.55" fill="none" />
          <text x="90" y="116" textAnchor="middle" fontSize="4.6" fill="#86efac" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" letterSpacing="0.4">flow OK · sterile</text>
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
