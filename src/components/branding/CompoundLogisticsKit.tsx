"use client";

/**
 * CompoundLogisticsKit — four-stage looping animation of clinical
 * supplies / IRT-driven kit logistics. A blinded kit is packed,
 * shipped to a site, dispensed to a patient, and the IRT ledger
 * updates.
 *
 * Stages:
 *   1. PACK      — blinded kit assembled with vial + insert
 *   2. SHIP      — courier symbol with route line to site
 *   3. DISPENSE  — site shelf + patient receives kit
 *   4. IRT       — IRT ledger row added with kit-ID + status
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["pack", "ship", "dispense", "irt"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  pack:     { label: "BLINDED KIT",  sub: "kit ID · 24-118-A",    duration: 2400 },
  ship:     { label: "SHIP · 2-8 °C", sub: "courier · 24 h",      duration: 2600 },
  dispense: { label: "DISPENSE",     sub: "site pharmacy",        duration: 2400 },
  irt:      { label: "IRT LEDGER",   sub: "kit assigned · pt 042", duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function CompoundLogisticsKit({ size = 180, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  return (
    <div className={className}>
      <svg width={size} height={size * (170 / 180)} viewBox="0 0 180 170" fill="none" stroke="currentColor"
        strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round"
        role="img" aria-label={`Compound logistics — ${info.label}`}>
        {/* Kit box */}
        <g>
          <rect x="22" y="34" width="36" height="44" rx="2" />
          <line x1="22" y1="44" x2="58" y2="44" strokeWidth="0.55" opacity="0.55" />
          <text x="40" y="44" textAnchor="middle" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.6" letterSpacing="0.4">24-118-A</text>
          {/* Vial inside */}
          <rect x="28" y="50" width="8" height="18" rx="1" stroke-width="0.7" />
          <rect x="27" y="48" width="10" height="3" rx="1" stroke-width="0.55" />
          {/* Insert paper */}
          <rect x="40" y="50" width="14" height="22" stroke-width="0.55" />
          <line x1="42" y1="56" x2="52" y2="56" strokeWidth="0.45" opacity="0.55" />
          <line x1="42" y1="60" x2="50" y2="60" strokeWidth="0.45" opacity="0.55" />
          <line x1="42" y1="64" x2="52" y2="64" strokeWidth="0.45" opacity="0.55" />
        </g>

        {/* Route line to site */}
        <g opacity={stage === "ship" || stage === "dispense" || stage === "irt" ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <path d="M 60 60 Q 100 38, 134 56" strokeWidth="0.55" strokeDasharray="2 2" opacity="0.6" />
          {/* Truck icon */}
          <g opacity={stage === "ship" ? 1 : 0.45} transform="translate(82 42)">
            <rect x="0" y="0" width="18" height="10" rx="1.5" />
            <rect x="-6" y="3" width="6" height="7" stroke-width="0.55" />
            <circle cx="-3" cy="12" r="1.6" stroke-width="0.7" />
            <circle cx="12" cy="12" r="1.6" stroke-width="0.7" />
          </g>
        </g>

        {/* Site — pharmacy shelf */}
        <g opacity={stage === "dispense" || stage === "irt" ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <rect x="120" y="34" width="40" height="44" rx="2" />
          <line x1="120" y1="50" x2="160" y2="50" strokeWidth="0.55" opacity="0.55" />
          <line x1="120" y1="64" x2="160" y2="64" strokeWidth="0.55" opacity="0.55" />
          {/* Mini kits on shelf */}
          {[
            { x: 124, y: 38 }, { x: 132, y: 38 }, { x: 140, y: 38 }, { x: 148, y: 38 },
            { x: 124, y: 52 }, { x: 132, y: 52 }, { x: 140, y: 52 }, { x: 148, y: 52 },
            { x: 124, y: 66 }, { x: 132, y: 66 }, { x: 140, y: 66 }, { x: 148, y: 66 },
          ].map((k, i) => (
            <rect key={i} x={k.x} y={k.y} width="6" height="10" stroke-width="0.55" opacity={i === 5 ? 1 : 0.6}
              fill={i === 5 ? "#86efac" : "currentColor"} fillOpacity={i === 5 ? 0.4 : 0.05} />
          ))}
          <text x="140" y="32" textAnchor="middle" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.65" letterSpacing="0.4">SITE 02</text>
        </g>

        {/* Patient */}
        <g opacity={stage === "dispense" || stage === "irt" ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}
          transform="translate(140 92)">
          <circle cx="0" cy="0" r="5" />
          <path d="M -8 22 Q 0 12, 8 22" />
        </g>

        {/* IRT ledger */}
        <g opacity={stage === "irt" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <rect x="22" y="86" width="92" height="24" rx="3" />
          <line x1="28" y1="94" x2="108" y2="94" strokeWidth="0.55" opacity="0.55" />
          <text x="28" y="94" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" letterSpacing="0.4" opacity="0.7">IRT · KIT 24-118-A</text>
          <text x="28" y="102" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.75">→ patient 042 · DISPENSED</text>
          <circle cx="104" cy="100" r="3" stroke="#86efac" strokeWidth="0.7" fill="#86efac" fillOpacity="0.2" />
        </g>

        <g fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
          <text x="90" y="138" textAnchor="middle" fontSize="6.8" fontWeight="700" letterSpacing="1.3">{info.label}</text>
          <text x="90" y="150" textAnchor="middle" fontSize="5.6" opacity="0.55" letterSpacing="0.4">{info.sub}</text>
        </g>
        <g transform="translate(72 162)" role="progressbar"
          aria-label={`Cycle stage ${stageIdx + 1} of ${STAGES.length}: ${info.label}`}
          aria-valuenow={stageIdx + 1} aria-valuemin={1} aria-valuemax={STAGES.length}>
          {STAGES.map((_, i) => (
            <circle key={i} cx={i * 12} cy={0} r="1.6" fill={i === stageIdx ? "#86efac" : "currentColor"}
              opacity={i === stageIdx ? 1 : 0.3} stroke="none"
              style={{ transition: noTransition ?? "opacity 300ms ease, fill 300ms ease" }} />
          ))}
        </g>
      </svg>
    </div>
  );
}
