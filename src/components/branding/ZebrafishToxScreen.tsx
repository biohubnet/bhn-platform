"use client";

/**
 * ZebrafishToxScreen — four-stage looping animation of a zebrafish
 * embryo developmental-toxicity screen (early preclinical hazard
 * triage). Embryos are plated → compound dosed → 5-day development
 * observed → phenotype scoring rolls up to a tox call.
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["plate", "dose", "observe", "score"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  plate:   { label: "PLATE",    sub: "24-well · 1 embryo / well", duration: 2400 },
  dose:    { label: "DOSE",     sub: "log-titration · 7 conc.",  duration: 2400 },
  observe: { label: "OBSERVE",  sub: "5 dpf · imaging",          duration: 2800 },
  score:   { label: "SCORE",    sub: "LC50 = 12 µM",             duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function ZebrafishToxScreen({ size = 180, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  // 4 × 6 well grid (24 wells)
  const wells: { cx: number; cy: number }[] = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 6; c++) {
      wells.push({ cx: 30 + c * 20, cy: 44 + r * 14 });
    }
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
        aria-label={`Zebrafish tox — ${info.label}`}
      >
        {/* Plate frame */}
        <rect x="22" y="36" width="136" height="68" rx="2.5" strokeWidth="0.7" />

        {/* Wells */}
        {wells.map((w, i) => {
          // dose concentration increases left-to-right per row.
          const col = i % 6;
          const concentrationHue = stage === "dose" || stage === "observe" || stage === "score"
            ? (col >= 4 ? "#fb7185" : col >= 2 ? "#fbbf24" : "#86efac")
            : "currentColor";
          const fillOp = stage === "dose" ? 0.25 + col * 0.06 : stage === "observe" || stage === "score" ? 0.3 : 0;
          return (
            <g key={i}>
              <circle cx={w.cx} cy={w.cy} r="6" strokeWidth="0.55" />
              <circle
                cx={w.cx} cy={w.cy} r="5"
                fill={concentrationHue}
                fillOpacity={fillOp}
                stroke="none"
                style={{ transition: noTransition ?? "fill 350ms ease, fill-opacity 350ms ease" }}
              />
              {/* Embryo dot — visible during plate / observe / score */}
              {(stage === "plate" || stage === "observe" || stage === "score") && (
                <circle
                  cx={w.cx} cy={w.cy} r="1.2"
                  fill={stage === "score" && col >= 4 ? "#fb7185" : "currentColor"}
                  stroke="none"
                  opacity={stage === "score" && col >= 4 ? 0.85 : 0.7}
                />
              )}
            </g>
          );
        })}

        {/* Stage-specific decorations */}
        <g opacity={stage === "dose" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <path d="M 24 28 L 30 40" stroke="#fbbf24" strokeWidth="0.7" />
          <path d="M 26 38 L 32 36" stroke="#fbbf24" strokeWidth="0.5" />
          <text x="158" y="32" textAnchor="end" fontSize="3.6" fill="#fbbf24" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.85">↘ µM grad</text>
        </g>

        <g opacity={stage === "observe" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <circle cx="22" cy="22" r="6" stroke="#7dd3fc" strokeWidth="0.7" />
          <path d="M 26.5 26.5 L 32 32" stroke="#7dd3fc" strokeWidth="0.7" />
          <text x="36" y="26" fontSize="4" fill="#7dd3fc" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">5 dpf</text>
        </g>

        <g opacity={stage === "score" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <text x="158" y="32" textAnchor="end" fontSize="4.6" fill="#fb7185" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontWeight="700">LC50 12 µM</text>
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
