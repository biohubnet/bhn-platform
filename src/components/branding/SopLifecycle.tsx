"use client";

/**
 * SopLifecycle — five-stage looping animation of a Standard
 * Operating Procedure lifecycle (BHN Regulatory Affairs · SOPs
 * explicitly named). Draft → SME review → QA approval →
 * training/effective → periodic revision.
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["draft", "review", "approve", "effective", "revise"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  draft:     { label: "DRAFT",          sub: "author · SME",         duration: 2400 },
  review:    { label: "REVIEW",         sub: "redlines · comments",  duration: 2400 },
  approve:   { label: "APPROVE · QA",   sub: "signed · controlled",  duration: 2400 },
  effective: { label: "EFFECTIVE",      sub: "training · roster",    duration: 2800 },
  revise:    { label: "PERIODIC REVISE", sub: "every 2 yr",          duration: 2800 },
};

interface Props { size?: number; className?: string; }

export function SopLifecycle({ size = 180, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  const showRedlines = stage === "review";
  const showStamp = stage === "approve" || stage === "effective" || stage === "revise";
  const showRoster = stage === "effective";
  const showRevise = stage === "revise";

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
        aria-label={`SOP lifecycle — ${info.label}`}
      >
        {/* SOP document */}
        <g>
          <rect x="40" y="22" width="100" height="80" rx="2" />
          <text x="46" y="32" fontSize="4.6" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" letterSpacing="0.5" opacity="0.85">SOP · QM-018 · v{showRevise ? "4" : "3"}</text>
          <line x1="46" y1="36" x2="134" y2="36" strokeWidth="0.5" opacity="0.55" />
          {[44, 50, 56, 62, 68, 74, 80, 86, 92].map((y, i) => (
            <line
              key={y}
              x1="46"
              y1={y}
              x2={46 + [56, 64, 60, 70, 58, 66, 50, 60, 44][i]}
              y2={y}
              strokeWidth="0.5"
              opacity="0.55"
            />
          ))}
        </g>

        {/* Redlines on review */}
        <g opacity={showRedlines ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <line x1="46" y1="56" x2="106" y2="56" stroke="#fb7185" strokeWidth="0.85" opacity="0.8" />
          <line x1="46" y1="74" x2="112" y2="74" stroke="#fb7185" strokeWidth="0.85" opacity="0.8" />
          <text x="142" y="58" fontSize="4" fill="#fb7185" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">rev</text>
          <text x="142" y="76" fontSize="4" fill="#fb7185" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">rev</text>
        </g>

        {/* Approval stamp */}
        <g opacity={showStamp ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease, transform 600ms cubic-bezier(.4,.1,.4,1)", transform: showStamp ? "rotate(-8deg)" : "rotate(-8deg) translate(-6px,6px)", transformOrigin: "120px 84px" }}>
          <ellipse cx="120" cy="84" rx="20" ry="11" stroke="#86efac" strokeWidth="0.95" fill="#86efac" fillOpacity="0.16" transform="rotate(-8 120 84)" />
          <text x="120" y="82" textAnchor="middle" fontSize="5" fill="#86efac" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontWeight="700" transform="rotate(-8 120 84)">APPROVED</text>
          <text x="120" y="89" textAnchor="middle" fontSize="4" fill="#86efac" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.85" transform="rotate(-8 120 84)">QA · {showRevise ? "v4" : "v3"}</text>
        </g>

        {/* Training roster */}
        <g opacity={showRoster ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <rect x="20" y="106" width="140" height="20" rx="3" strokeWidth="0.7" />
          <text x="26" y="116" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" letterSpacing="0.4" opacity="0.75">TRAINING ROSTER</text>
          {[80, 96, 112, 128, 144].map((x) => (
            <g key={x}>
              <circle cx={x} cy="116" r="3" stroke="#86efac" strokeWidth="0.65" fill="#86efac" fillOpacity="0.2" />
              <path d={`M ${x - 1.8} 116 L ${x - 0.5} 117.5 L ${x + 2} 114.5`} stroke="#86efac" strokeWidth="0.6" fill="none" />
            </g>
          ))}
        </g>

        {/* Revise arrow */}
        <g opacity={showRevise ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <path d="M 22 38 Q 18 68, 36 86" stroke="#fbbf24" strokeWidth="0.85" strokeDasharray="2 2" fill="none" />
          <path d="M 36 86 L 38 84 M 36 86 L 38 88" strokeWidth="0.85" fill="none" stroke="#fbbf24" />
          <text x="18" y="58" fontSize="4.4" fill="#fbbf24" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" letterSpacing="0.3">revise</text>
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
