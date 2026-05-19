"use client";

/**
 * BactAlertRapid — four-stage looping animation of a BacT/ALERT
 * rapid microbial detection system (explicitly named in the
 * BHN QA/QC Micro course). Sample is inoculated into a bottle,
 * loaded into the incubator-detector, CO₂ from microbial growth
 * shifts the colorimetric sensor, and an alert is triggered.
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["inoculate", "load", "monitor", "alert"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  inoculate: { label: "INOCULATE",     sub: "1 mL · bottle",         duration: 2400 },
  load:      { label: "LOAD · INCUB",  sub: "32 / 22 °C",            duration: 2400 },
  monitor:   { label: "CO₂ MONITOR",   sub: "colorimetric · 10 min", duration: 2800 },
  alert:     { label: "ALERT",         sub: "growth detected",       duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function BactAlertRapid({ size = 180, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  const showInst = stage === "load" || stage === "monitor" || stage === "alert";
  const showCo2 = stage === "monitor" || stage === "alert";
  const showAlert = stage === "alert";

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
        aria-label={`BacT/ALERT — ${info.label}`}
      >
        {/* Source vial */}
        <g>
          <rect x="20" y="44" width="10" height="22" rx="1" />
          <rect x="19" y="40" width="12" height="4" rx="1" strokeWidth="0.6" />
        </g>

        {/* Pipette to bottle */}
        <g opacity={stage === "inoculate" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <line x1="38" y1="40" x2="58" y2="48" strokeWidth="0.65" />
          <circle cx="58" cy="50" r="1.2" fill="#7dd3fc" stroke="none" opacity="0.85" />
        </g>

        {/* Culture bottle */}
        <g>
          <ellipse cx="60" cy="74" rx="14" ry="20" />
          <rect x="56" y="44" width="8" height="10" rx="1" strokeWidth="0.65" />
          <ellipse cx="60" cy="90" rx="10" ry="3" stroke="none" fill="currentColor" fillOpacity="0.15" />
          {/* CO2 sensor pad */}
          <circle cx="60" cy="86" r="3" stroke="#fbbf24" strokeWidth="0.7" fill="#fbbf24" fillOpacity={showAlert ? 0.7 : (showCo2 ? 0.4 : 0.2)} />
        </g>

        {/* Instrument */}
        <g opacity={showInst ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <rect x="92" y="38" width="64" height="64" rx="3" strokeWidth="0.95" />
          <text x="124" y="34" textAnchor="middle" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" letterSpacing="0.4" opacity="0.8">BacT/ALERT</text>
          {/* Slot grid */}
          {[0, 1, 2, 3].map((c) => (
            [0, 1, 2, 3, 4].map((r) => (
              <rect key={`${c}-${r}`} x={98 + c * 14} y={44 + r * 11} width="10" height="8" rx="1" strokeWidth="0.5" opacity="0.65" />
            ))
          ))}
          {/* Status LED */}
          <circle cx="148" cy="40" r="2" fill={showAlert ? "#fb7185" : "#86efac"} stroke="none" opacity="0.9" />
        </g>

        {/* CO2 sensor curve */}
        <g opacity={showCo2 ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <line x1="22" y1="112" x2="158" y2="112" strokeWidth="0.55" opacity="0.55" />
          <path
            d="M 22 112 L 60 112 L 80 108 L 100 96 L 124 62 L 158 50"
            stroke={showAlert ? "#fb7185" : "#fbbf24"} strokeWidth="0.85" fill="none"
          />
          <line x1="22" y1="70" x2="158" y2="70" strokeWidth="0.5" strokeDasharray="2 2" stroke="#fb7185" opacity="0.55" />
        </g>

        {/* Alert banner */}
        <g opacity={showAlert ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }} className="pulse">
          <rect x="32" y="20" width="116" height="12" rx="6" fill="#fb7185" fillOpacity="0.18" stroke="#fb7185" strokeWidth="0.85" />
          <text x="90" y="28" textAnchor="middle" fontSize="5.4" fill="#fb7185" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontWeight="700" letterSpacing="0.5">POSITIVE · INVESTIGATE</text>
        </g>

        {/* Stage label */}
        <g fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
          <text x="90" y="138" textAnchor="middle" fontSize="6.8" fontWeight="700" letterSpacing="1.3">{info.label}</text>
          <text x="90" y="150" textAnchor="middle" fontSize="5.6" opacity="0.55" letterSpacing="0.4">{info.sub}</text>
        </g>

        <g
          transform="translate(72 162)"
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
