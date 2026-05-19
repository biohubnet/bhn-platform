"use client";

/**
 * ColdChainShipment — four-stage looping animation of cold-chain
 * shipping for biologics. The shipper is packed, frozen, in transit
 * with a temperature trace, and arrives at the clinical site.
 *
 * Stages:
 *   1. PACK     — insulated shipper is assembled with vial inside
 *   2. FREEZE   — thermometer drops to -80°C
 *   3. TRANSIT  — plane/truck silhouette with a thin temperature
 *                 trace running below
 *   4. ARRIVE   — shipper at clinic with green delivery check
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["pack", "freeze", "transit", "arrive"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  pack:    { label: "PACK",      sub: "vacuum-insulated shipper", duration: 2400 },
  freeze:  { label: "FREEZE",    sub: "−80 °C · dry ice",         duration: 2600 },
  transit: { label: "IN TRANSIT", sub: "GPS · 18 h",               duration: 3000 },
  arrive:  { label: "AT SITE",   sub: "chain intact",             duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function ColdChainShipment({ size = 180, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  // Thermometer fill height — lower fill = colder
  const tempY = stage === "pack" ? 50 : stage === "freeze" || stage === "transit" || stage === "arrive" ? 78 : 50;
  const tempText =
    stage === "pack" ? "+25" :
    stage === "freeze" ? "-80" :
    stage === "transit" ? "-78" :
    /* arrive */         "-79";

  const showVehicle = stage === "transit";
  const showSite = stage === "arrive";
  const showCheck = stage === "arrive";

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
        aria-label={`Cold chain shipment — ${info.label}`}
      >
        {/* Shipper box */}
        <g>
          <rect x="22" y="42" width="60" height="56" rx="2" />
          {/* lid */}
          <rect x="20" y="36" width="64" height="8" rx="1" stroke-width="0.7" />
          {/* foam interior outline */}
          <rect x="28" y="50" width="48" height="40" rx="2" strokeWidth="0.55" opacity="0.55" strokeDasharray="2 2" />
          {/* vial inside */}
          <rect x="48" y="60" width="8" height="20" rx="1" stroke="currentColor" strokeWidth="0.7" />
          <rect x="47" y="56" width="10" height="5" rx="1" stroke-width="0.6" />
        </g>

        {/* Thermometer (right of shipper) */}
        <g>
          <rect x="98" y="40" width="10" height="50" rx="5" />
          <circle cx="103" cy="94" r="8" />
          {/* Fill */}
          <rect
            x="100" y={tempY}
            width="6" height={92 - tempY}
            fill="#7dd3fc" fillOpacity="0.6" stroke="none"
            style={{ transition: noTransition ?? "y 700ms ease, height 700ms ease" }}
          />
          <circle cx="103" cy="94" r="5" fill="#7dd3fc" fillOpacity="0.6" stroke="none" />
          {/* Tick marks */}
          <line x1="108" y1="50" x2="112" y2="50" strokeWidth="0.5" opacity="0.55" />
          <line x1="108" y1="65" x2="112" y2="65" strokeWidth="0.5" opacity="0.55" />
          <line x1="108" y1="78" x2="112" y2="78" strokeWidth="0.5" opacity="0.55" />
          <text x="114" y="80" fontSize="4.6" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.7">
            {tempText} °C
          </text>
        </g>

        {/* Vehicle (transit) */}
        <g
          opacity={showVehicle ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}
          transform="translate(124 34)"
        >
          <rect x="0" y="0" width="32" height="14" rx="2" />
          <rect x="2" y="2" width="10" height="6" rx="1" stroke-width="0.55" opacity="0.65" />
          <circle cx="6" cy="14" r="2.6" stroke-width="0.85" />
          <circle cx="26" cy="14" r="2.6" stroke-width="0.85" />
        </g>

        {/* Site (arrive) */}
        <g
          opacity={showSite ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}
          transform="translate(124 30)"
        >
          {/* Hospital silhouette */}
          <rect x="0" y="8" width="34" height="22" />
          <rect x="6" y="14" width="6" height="6" stroke-width="0.6" />
          <rect x="22" y="14" width="6" height="6" stroke-width="0.6" />
          {/* Hospital cross */}
          <line x1="17" y1="18" x2="17" y2="24" strokeWidth="0.85" />
          <line x1="14" y1="21" x2="20" y2="21" strokeWidth="0.85" />
        </g>

        {/* Temperature trace (during TRANSIT and ARRIVE) */}
        <g
          opacity={stage === "transit" || stage === "arrive" ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}
        >
          <line x1="22" y1="118" x2="158" y2="118" strokeWidth="0.5" opacity="0.55" />
          <path
            d="M 22 116 L 36 117 L 50 116 L 64 117.5 L 78 116 L 92 117 L 106 116.5 L 120 117 L 134 116 L 148 117 L 158 116"
            stroke="#7dd3fc" strokeWidth="0.85" fill="none" opacity="0.85"
          />
          <text
            x="22" y="112" fontSize="4.6"
            fill="currentColor" stroke="none"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            opacity="0.6"
            letterSpacing="0.3"
          >
            temperature log (−80 °C ± 1)
          </text>
        </g>

        {/* Delivery check */}
        <g
          opacity={showCheck ? 1 : 0}
          style={{
            transition: noTransition ?? "opacity 500ms ease, transform 600ms cubic-bezier(.4,.1,.4,1)",
            transform: showCheck ? "translate(0,0)" : "translate(-6px,6px)",
          }}
        >
          <circle cx="160" cy="20" r="6.5" stroke="#86efac" strokeWidth="0.95" fill="#86efac" fillOpacity="0.18" />
          <path d="M 156 20 L 159 23 L 164 17" stroke="#86efac" strokeWidth="0.95" fill="none" />
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
