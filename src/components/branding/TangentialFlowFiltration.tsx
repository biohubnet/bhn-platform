"use client";

/**
 * TangentialFlowFiltration — four-stage looping animation of TFF
 * (tangential-flow filtration) used downstream of bioreactor harvest.
 * Feed loaded → tangential flow across the membrane recirculates the
 * retentate → buffer is exchanged via diafiltration → product is
 * concentrated to the target volume.
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["load", "recirculate", "diafilter", "concentrate"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  load:        { label: "LOAD",        sub: "feed → tank",          duration: 2400 },
  recirculate: { label: "RECIRCULATE", sub: "tangential · 30 LMH",  duration: 2800 },
  diafilter:   { label: "DIAFILTER",   sub: "buffer exchange · 7×", duration: 2600 },
  concentrate: { label: "CONCENTRATE", sub: "10× · pooled",         duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function TangentialFlowFiltration({ size = 180, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

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
        aria-label={`TFF — ${info.label}`}
      >
        {/* Feed tank (left) */}
        <rect x="22" y="50" width="28" height="48" rx="1.5" strokeWidth="0.85" />
        <rect
          x="24" y={stage === "concentrate" ? 80 : stage === "load" ? 56 : 60}
          width="24"
          height={stage === "concentrate" ? 16 : stage === "load" ? 40 : 36}
          fill="#7dd3fc"
          fillOpacity="0.35"
          stroke="none"
          style={{ transition: noTransition ?? "y 700ms ease, height 700ms ease" }}
        />
        <text x="36" y="106" textAnchor="middle" fontSize="3.4" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.6">FEED</text>

        {/* TFF cassette (centre) — vertical stack of plates */}
        <g transform="translate(74 54)">
          <rect x="0" y="0" width="32" height="40" rx="1.5" strokeWidth="0.85" />
          {[0, 1, 2, 3, 4].map((i) => (
            <line key={i} x1="2" y1={6 + i * 7} x2="30" y2={6 + i * 7} strokeWidth="0.4" opacity="0.55" />
          ))}
          <text x="16" y="52" textAnchor="middle" fontSize="3.4" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.6">CASSETTE</text>
        </g>

        {/* Tangential flow arrows (recirculate + diafilter) */}
        <g opacity={stage === "recirculate" || stage === "diafilter" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <path d="M 50 64 L 74 64" stroke="#86efac" strokeWidth="0.85" />
          <path d="M 70 61 L 74 64 L 70 67" stroke="#86efac" strokeWidth="0.85" fill="none" />
          <path d="M 106 74 L 50 74" stroke="#86efac" strokeWidth="0.85" />
          <path d="M 54 71 L 50 74 L 54 77" stroke="#86efac" strokeWidth="0.85" fill="none" />
        </g>

        {/* Permeate (out the bottom — discarded buffer) */}
        <g opacity={stage === "recirculate" || stage === "diafilter" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <line x1="90" y1="94" x2="90" y2="106" stroke="#fb7185" strokeWidth="0.85" />
          <path d="M 87 102 L 90 106 L 93 102" stroke="#fb7185" strokeWidth="0.85" fill="none" />
          <text x="90" y="116" textAnchor="middle" fontSize="3.2" fill="#fb7185" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.85">permeate</text>
        </g>

        {/* Fresh buffer in (diafiltration only) */}
        <g opacity={stage === "diafilter" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <line x1="36" y1="34" x2="36" y2="50" stroke="#fbbf24" strokeWidth="0.85" />
          <path d="M 33 38 L 36 34 L 39 38" stroke="#fbbf24" strokeWidth="0.85" fill="none" transform="rotate(180 36 36)" />
          <text x="36" y="32" textAnchor="middle" fontSize="3.2" fill="#fbbf24" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">buffer · 7×</text>
        </g>

        {/* Concentration callout */}
        <g opacity={stage === "concentrate" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <text x="118" y="74" fontSize="5.8" fill="#86efac" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontWeight="700">10×</text>
          <text x="120" y="84" fontSize="3.4" fill="#86efac" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">final pool</text>
        </g>

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
