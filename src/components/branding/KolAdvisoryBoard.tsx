"use client";

/**
 * KolAdvisoryBoard — four-stage looping animation of a Medical
 * Affairs KOL (key-opinion-leader) advisory board cycle. KOLs are
 * recruited from a candidate pool → briefed on the topic → discuss
 * around the table → outputs synthesised into a strategic report.
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["recruit", "brief", "discuss", "synthesise"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  recruit:    { label: "RECRUIT",    sub: "global · n = 8",         duration: 2400 },
  brief:      { label: "BRIEF",      sub: "pre-read + agenda",      duration: 2400 },
  discuss:    { label: "DISCUSS",    sub: "round table · 90 min",   duration: 2800 },
  synthesise: { label: "SYNTHESISE", sub: "insights · 4 themes",    duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function KolAdvisoryBoard({ size = 180, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  // 6 KOL positions around an oval table
  const kols = [0, 1, 2, 3, 4, 5].map((i) => {
    const angle = (i / 6) * 2 * Math.PI - Math.PI / 2;
    return {
      x: 90 + Math.cos(angle) * 44,
      y: 70 + Math.sin(angle) * 22,
    };
  });

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
        aria-label={`KOL advisory board — ${info.label}`}
      >
        {/* Conference table */}
        <ellipse cx="90" cy="70" rx="36" ry="14" strokeWidth="0.7" opacity="0.65" />

        {/* KOL figures around the table */}
        {kols.map((k, i) => {
          const visible =
            stage === "recruit" ? i < 6 :
            true;
          const tint =
            stage === "discuss" && (i === 0 || i === 3) ? "#7dd3fc" :
            stage === "synthesise" ? "#86efac" :
            "currentColor";
          return (
            <g key={i} transform={`translate(${k.x} ${k.y})`} opacity={visible ? 1 : 0} style={{ transition: noTransition ?? "opacity 400ms ease" }}>
              <circle cx="0" cy="-4" r="2.4" stroke={tint} strokeWidth="0.65" />
              <path d="M -3.5 4 L -3.5 0 Q 0 -3 3.5 0 L 3.5 4" stroke={tint} strokeWidth="0.65" fill="none" />
            </g>
          );
        })}

        {/* Stage decorations */}
        <g opacity={stage === "recruit" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <text x="90" y="38" textAnchor="middle" fontSize="4" fill="#fbbf24" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" letterSpacing="0.3">screening · 24 → 8</text>
          {kols.map((k, i) => (
            <circle key={i} cx={k.x} cy={k.y} r="6" stroke="#fbbf24" strokeWidth="0.4" opacity="0.5" strokeDasharray="2 2" />
          ))}
        </g>

        <g opacity={stage === "brief" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <rect x="78" y="62" width="24" height="16" stroke="#7dd3fc" strokeWidth="0.65" />
          <line x1="80" y1="66" x2="100" y2="66" stroke="#7dd3fc" strokeWidth="0.4" />
          <line x1="80" y1="69" x2="100" y2="69" stroke="#7dd3fc" strokeWidth="0.4" opacity="0.7" />
          <line x1="80" y1="72" x2="96" y2="72" stroke="#7dd3fc" strokeWidth="0.4" opacity="0.55" />
          <line x1="80" y1="75" x2="98" y2="75" stroke="#7dd3fc" strokeWidth="0.4" opacity="0.4" />
        </g>

        <g opacity={stage === "discuss" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          {kols.map((k, i) => (
            <path key={i} d={`M ${k.x} ${k.y - 8} q -3 -5 0 -8 q 3 3 0 8`} stroke="#7dd3fc" strokeWidth="0.4" fill="none" opacity={i % 2 === 0 ? 0.85 : 0.5} />
          ))}
        </g>

        <g opacity={stage === "synthesise" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          {[0, 1, 2, 3].map((i) => (
            <g key={i} transform={`translate(${44 + i * 24} 102)`}>
              <rect x="0" y="0" width="20" height="6" stroke="#86efac" strokeWidth="0.55" fill="#86efac" fillOpacity="0.18" />
              <text x="10" y="4.5" textAnchor="middle" fontSize="3.4" fill="#86efac" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">T{i + 1}</text>
            </g>
          ))}
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
