"use client";

/**
 * MedChemSAR — four-stage looping animation of a SAR (structure-
 * activity relationship) iteration. A hit scaffold is identified;
 * R-groups are varied, potency is tracked on a small bar chart;
 * one analog emerges as the lead.
 *
 * Stages:
 *   1. HIT      — base scaffold (benzene + linker + amide) sketched
 *   2. ANALOG   — three R-group variants drawn as small substituents
 *   3. SAR      — small bar chart appears showing potencies; one bar
 *                 grows tallest
 *   4. LEAD     — lead analog highlighted with a green outline + IC50
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["hit", "analog", "sar", "lead"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  hit:    { label: "HIT · IC₅₀ 5 µM",  sub: "scaffold confirmed", duration: 2400 },
  analog: { label: "ANALOGS",          sub: "R-group variations", duration: 2800 },
  sar:    { label: "SAR MAP",          sub: "potency vs structure", duration: 3000 },
  lead:   { label: "LEAD · IC₅₀ 12 nM", sub: "advance to ADME",   duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function MedChemSAR({ size = 180, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  const showAnalogs = stage === "analog" || stage === "sar" || stage === "lead";
  const showBars = stage === "sar" || stage === "lead";
  const showLead = stage === "lead";

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
        aria-label={`Med chem SAR — ${info.label}`}
      >
        {/* Core scaffold — benzene ring + linker + carbonyl-N */}
        <g>
          {/* Benzene */}
          <polygon points="30,46 42,40 54,46 54,60 42,66 30,60" />
          <polygon points="32,48 42,43 52,48 52,58 42,63 32,58" strokeWidth="0.5" opacity="0.5" />
          {/* Linker */}
          <line x1="54" y1="53" x2="68" y2="53" />
          {/* Carbonyl */}
          <line x1="68" y1="53" x2="74" y2="47" />
          <line x1="74" y1="47" x2="74" y2="41" strokeWidth="0.55" />
          <text
            x="73" y="38"
            fontSize="5"
            fill="currentColor" stroke="none"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            opacity="0.75"
          >O</text>
          {/* Amide N */}
          <line x1="68" y1="53" x2="74" y2="59" />
          <text
            x="76" y="62"
            fontSize="5"
            fill="currentColor" stroke="none"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            opacity="0.75"
          >N</text>
          {/* R substituent point */}
          <line x1="42" y1="40" x2="42" y2="32" />
          <text
            x="42" y="28"
            fontSize="5"
            textAnchor="middle"
            fill="currentColor" stroke="none"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            opacity="0.8"
          >R</text>
        </g>

        {/* Analogs — three R-group variants drawn next to the scaffold */}
        <g
          opacity={showAnalogs ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}
        >
          {/* R₁ — methyl */}
          <g transform="translate(96 30)">
            <line x1="0" y1="0" x2="8" y2="0" strokeWidth="0.7" />
            <text x="10" y="2" fontSize="5" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.75">CH₃</text>
          </g>
          {/* R₂ — F */}
          <g transform="translate(96 50)">
            <line x1="0" y1="0" x2="8" y2="0" strokeWidth="0.7" />
            <text x="10" y="2" fontSize="5" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.75">F</text>
          </g>
          {/* R₃ — cyclopropyl */}
          <g transform="translate(96 70)">
            <line x1="0" y1="0" x2="8" y2="0" strokeWidth="0.7" />
            <polygon points="12,-3 17,0 12,3" strokeWidth="0.7" />
          </g>
          {/* R₄ — OMe */}
          <g transform="translate(96 90)">
            <line x1="0" y1="0" x2="8" y2="0" strokeWidth="0.7" />
            <text x="10" y="2" fontSize="5" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.75">OMe</text>
          </g>
        </g>

        {/* SAR bar chart — appears at SAR. Bar 3 (cyclopropyl) grows tallest. */}
        <g
          opacity={showBars ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}
        >
          {/* Axis */}
          <line x1="130" y1="100" x2="170" y2="100" strokeWidth="0.55" opacity="0.6" />
          <line x1="130" y1="100" x2="130" y2="34" strokeWidth="0.55" opacity="0.6" />
          {[
            { x: 134, h: 16, label: "1" },
            { x: 144, h: 24, label: "2" },
            { x: 154, h: 48, label: "3", lead: true },
            { x: 164, h: 28, label: "4" },
          ].map((b) => (
            <g key={b.label}>
              <rect
                x={b.x - 3} y={100 - b.h} width="6" height={b.h}
                stroke="currentColor" strokeWidth="0.5"
                fill={b.lead ? "#86efac" : "currentColor"}
                fillOpacity={b.lead ? 0.45 : 0.18}
                style={{ transition: noTransition ?? "fill 500ms ease, fill-opacity 500ms ease" }}
              />
              <text
                x={b.x} y="108"
                fontSize="4.6"
                textAnchor="middle"
                fill="currentColor" stroke="none"
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                opacity="0.65"
              >R{b.label}</text>
            </g>
          ))}
          <text
            x="124" y="50"
            fontSize="4.6"
            fill="currentColor" stroke="none"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            opacity="0.6"
            transform="rotate(-90 124 50)"
            textAnchor="middle"
          >pIC₅₀</text>
        </g>

        {/* Lead annotation */}
        <g
          opacity={showLead ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}
        >
          <circle cx="154" cy="50" r="8" stroke="#86efac" strokeWidth="0.9" opacity="0.85" />
          <text
            x="154" y="42"
            fontSize="5" textAnchor="middle"
            fill="#86efac" stroke="none"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          >R3</text>
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
