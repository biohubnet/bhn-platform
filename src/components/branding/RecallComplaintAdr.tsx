"use client";

/**
 * RecallComplaintAdr — five-stage looping animation of a
 * post-market complaint → adverse drug reaction (ADR) → recall
 * workflow (BHN Regulatory Affairs · explicitly named). A
 * complaint arrives, is triaged, an ADR is reported to Health
 * Canada, a root-cause investigation runs, and a recall is issued.
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["intake", "triage", "adr", "investigate", "recall"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  intake:      { label: "COMPLAINT",     sub: "patient · pharmacist",   duration: 2400 },
  triage:      { label: "TRIAGE",        sub: "serious · expedited",    duration: 2400 },
  adr:         { label: "ADR · MEDEFFECT", sub: "Health Canada · 15-day", duration: 2800 },
  investigate: { label: "ROOT CAUSE",    sub: "batch · supplier · CAPA", duration: 2600 },
  recall:      { label: "RECALL · CLASS II", sub: "field action · notify", duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function RecallComplaintAdr({ size = 180, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  const showTriage = stage === "triage" || stage === "adr" || stage === "investigate" || stage === "recall";
  const showAdr = stage === "adr" || stage === "investigate" || stage === "recall";
  const showInv = stage === "investigate" || stage === "recall";
  const showRecall = stage === "recall";

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
        aria-label={`Recall · complaint · ADR — ${info.label}`}
      >
        {/* Complaint card */}
        <g>
          <rect x="20" y="22" width="58" height="40" rx="3" />
          <text x="26" y="32" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" letterSpacing="0.4" opacity="0.75">COMPLAINT</text>
          <line x1="26" y1="36" x2="72" y2="36" strokeWidth="0.5" opacity="0.55" />
          <text x="26" y="44" fontSize="3.8" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.7">Lot 24-118 · rash</text>
          <text x="26" y="50" fontSize="3.8" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.7">grade 3 · serious</text>
          <text x="26" y="56" fontSize="3.8" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.7">date · 2026-01-04</text>
        </g>

        {/* Triage flag */}
        <g opacity={showTriage ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <rect x="84" y="22" width="34" height="14" rx="7" fill="#fb7185" fillOpacity="0.18" stroke="#fb7185" strokeWidth="0.85" />
          <text x="101" y="32" textAnchor="middle" fontSize="5" fill="#fb7185" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontWeight="700" letterSpacing="0.4">SERIOUS</text>
        </g>

        {/* ADR submission card */}
        <g opacity={showAdr ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <rect x="84" y="40" width="74" height="32" rx="3" strokeWidth="0.7" />
          <text x="92" y="50" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" letterSpacing="0.4" opacity="0.8">MedEffect · ADR</text>
          <line x1="92" y1="54" x2="150" y2="54" strokeWidth="0.5" opacity="0.55" />
          <text x="92" y="62" fontSize="3.8" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.7">15-day expedited</text>
          <text x="92" y="68" fontSize="3.8" fill="#86efac" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">submitted ✓</text>
        </g>

        {/* Investigation */}
        <g opacity={showInv ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <rect x="20" y="74" width="138" height="22" rx="3" strokeWidth="0.7" />
          <text x="26" y="84" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" letterSpacing="0.4">ROOT CAUSE · CAPA</text>
          <text x="26" y="92" fontSize="3.8" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.7">supplier change · excipient impurity above threshold</text>
        </g>

        {/* Recall stamp */}
        <g opacity={showRecall ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease, transform 600ms cubic-bezier(.4,.1,.4,1)", transform: showRecall ? "rotate(-8deg) translate(0,0)" : "rotate(-8deg) translate(-6px,6px)", transformOrigin: "90px 116px" }}>
          <ellipse cx="90" cy="116" rx="40" ry="13" stroke="#fb7185" strokeWidth="1.05" fill="#fb7185" fillOpacity="0.16" />
          <text x="90" y="114" textAnchor="middle" fontSize="6" fill="#fb7185" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontWeight="700" letterSpacing="0.5">RECALL</text>
          <text x="90" y="122" textAnchor="middle" fontSize="4.4" fill="#fb7185" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.85">Class II · Lot 24-118</text>
        </g>

        {/* Stage label */}
        <g fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
          <text x="90" y="142" textAnchor="middle" fontSize="6.8" fontWeight="700" letterSpacing="1.3">{info.label}</text>
          <text x="90" y="154" textAnchor="middle" fontSize="5.6" opacity="0.55" letterSpacing="0.4">{info.sub}</text>
        </g>

        <g
          transform="translate(60 166)"
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
