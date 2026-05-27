"use client";

/**
 * MedicalLiteratureSurveillance — four-stage looping animation of
 * a Medical Affairs literature-surveillance cycle. Search runs
 * pull new publications → titles screened against eligibility →
 * relevant papers tagged with topics → product-team alert sent.
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["search", "screen", "tag", "alert"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  search: { label: "SEARCH",  sub: "PubMed · auto run",   duration: 2400 },
  screen: { label: "SCREEN",  sub: "188 → 14 · titles",   duration: 2600 },
  tag:    { label: "TAG",     sub: "MoA · safety · pop",  duration: 2600 },
  alert:  { label: "ALERT",   sub: "team digest sent",    duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function MedicalLiteratureSurveillance({ size = 180, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  // 7 papers stacked
  const papers = [0, 1, 2, 3, 4, 5, 6];

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
        aria-label={`Literature surveillance — ${info.label}`}
      >
        {/* Search bar — top */}
        <g transform="translate(30 30)">
          <rect x="0" y="0" width="120" height="12" rx="6" strokeWidth="0.65" />
          <circle cx="8" cy="6" r="2.5" strokeWidth="0.55" />
          <line x1="10" y1="8" x2="13" y2="11" strokeWidth="0.55" />
          <text x="22" y="8" fontSize="3.6" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.75">"MoA + safety + 2025"</text>
        </g>

        {/* Paper stack */}
        {papers.map((i) => {
          const x = 38 + (i % 4) * 28;
          const y = 56 + Math.floor(i / 4) * 24;
          // Which papers stay visible at each stage
          const survives =
            stage === "search" ? true :
            stage === "screen" ? i < 5 :
            i < 3;
          const tint =
            stage === "tag" && i < 3 ? "#86efac" :
            stage === "alert" && i < 3 ? "#a78bfa" :
            "currentColor";
          return (
            <g key={i} transform={`translate(${x} ${y})`} opacity={survives ? 1 : 0.18} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
              <rect x="0" y="0" width="20" height="18" stroke={tint} strokeWidth="0.55" />
              <line x1="2" y1="4" x2="18" y2="4" stroke={tint} strokeWidth="0.4" />
              <line x1="2" y1="8" x2="18" y2="8" stroke={tint} strokeWidth="0.4" opacity="0.7" />
              <line x1="2" y1="12" x2="14" y2="12" stroke={tint} strokeWidth="0.4" opacity="0.55" />
              {/* Strike-through for screened-out papers */}
              {stage === "screen" && i >= 5 && (
                <line x1="-2" y1="2" x2="22" y2="16" stroke="#fb7185" strokeWidth="0.7" opacity="0.85" />
              )}
              {/* Topic chip on top */}
              {stage === "tag" && i < 3 && (
                <rect x="2" y="-3" width="8" height="3" fill="#86efac" fillOpacity="0.85" stroke="none" />
              )}
            </g>
          );
        })}

        {/* Stage decorations */}
        <g opacity={stage === "search" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <text x="158" y="50" textAnchor="end" fontSize="3.6" fill="#7dd3fc" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">188 hits</text>
        </g>

        <g opacity={stage === "alert" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <g transform="translate(140 102)">
            <path d="M 0 0 L 14 0 L 14 10 L 0 10 Z" stroke="#a78bfa" strokeWidth="0.65" />
            <path d="M 0 0 L 7 6 L 14 0" stroke="#a78bfa" strokeWidth="0.55" fill="none" />
            <text x="7" y="18" textAnchor="middle" fontSize="3.4" fill="#a78bfa" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">digest</text>
          </g>
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
