"use client";

/**
 * EfficacyXenograftModel — four-stage looping animation of a mouse
 * tumour-xenograft efficacy study (oncology preclinical). Tumour
 * cells implanted → tumour grows to dosing volume → drug dosed →
 * tumour volume regresses on the treatment arm.
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["implant", "grow", "treat", "regress"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  implant: { label: "IMPLANT",  sub: "5e6 cells · flank",      duration: 2400 },
  grow:    { label: "GROW",     sub: "200 mm³ · D14",          duration: 2600 },
  treat:   { label: "TREAT",    sub: "drug · q3d × 4",         duration: 2400 },
  regress: { label: "REGRESS",  sub: "TGI 78 % · D28",         duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function EfficacyXenograftModel({ size = 180, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  // Tumour size by stage (radius)
  const tumourR =
    stage === "implant" ? 1.5 :
    stage === "grow"    ? 9 :
    stage === "treat"   ? 8 :
                          3.5;
  const tumourFill =
    stage === "regress" ? "#86efac" :
    stage === "treat"   ? "#fbbf24" :
                          "#fb7185";

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
        aria-label={`Xenograft efficacy — ${info.label}`}
      >
        {/* Mouse silhouette */}
        <g transform="translate(30 56)">
          <ellipse cx="30" cy="14" rx="32" ry="12" strokeWidth="0.8" />
          <circle cx="60" cy="14" r="6" strokeWidth="0.7" />
          <circle cx="63" cy="12" r="0.6" fill="currentColor" stroke="none" />
          <path d="M 56 8 L 60 4" strokeWidth="0.55" />
          <path d="M 60 9 L 64 6" strokeWidth="0.55" />
          <path d="M 2 22 L 2 30" strokeWidth="0.55" />
          <path d="M 14 26 L 14 32" strokeWidth="0.55" />
          <path d="M 44 26 L 44 32" strokeWidth="0.55" />
          <path d="M 56 24 L 56 30" strokeWidth="0.55" />
          <path d="M -2 14 Q -10 12 -14 8" strokeWidth="0.55" />
        </g>

        {/* Tumour (on flank) — grows / shrinks by stage */}
        <g transform="translate(54 70)">
          <circle
            cx="0" cy="0" r={tumourR}
            fill={tumourFill} fillOpacity="0.35"
            stroke={tumourFill} strokeWidth="0.7"
            style={{ transition: noTransition ?? "r 600ms ease, fill 500ms ease, stroke 500ms ease" }}
          />
        </g>

        {/* Syringe — visible during treat */}
        <g opacity={stage === "treat" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <g transform="translate(80 48) rotate(35)">
            <rect x="0" y="0" width="22" height="5" stroke="#fbbf24" strokeWidth="0.65" />
            <rect x="22" y="-2" width="6" height="9" stroke="#fbbf24" strokeWidth="0.65" />
            <line x1="28" y1="2.5" x2="34" y2="2.5" stroke="#fbbf24" strokeWidth="0.8" />
            <text x="-2" y="14" fontSize="3.4" fill="#fbbf24" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">q3d × 4</text>
          </g>
        </g>

        {/* Tumour-volume mini chart */}
        <g transform="translate(96 102)" opacity={stage === "grow" || stage === "treat" || stage === "regress" ? 0.85 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <line x1="0" y1="0" x2="0" y2="-24" strokeWidth="0.55" opacity="0.6" />
          <line x1="0" y1="0" x2="46" y2="0" strokeWidth="0.55" opacity="0.6" />
          {/* Control arm (red, keeps growing) */}
          <path d="M 0 0 Q 14 -8 24 -16 Q 36 -22 46 -22" stroke="#fb7185" strokeWidth="0.7" fill="none" opacity={stage === "regress" ? 0.7 : 0.85} />
          {/* Treatment arm — only visible after treat */}
          {(stage === "treat" || stage === "regress") && (
            <path d="M 0 0 Q 14 -8 24 -12 Q 36 -7 46 -3" stroke="#86efac" strokeWidth="0.85" fill="none" />
          )}
          <text x="46" y="-26" textAnchor="end" fontSize="3.4" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.55">mm³</text>
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
