"use client";

/**
 * DsmbReview — four-stage looping animation of a Data Safety
 * Monitoring Board (DSMB) review meeting. Unblinded safety + efficacy
 * package is prepared → independent committee meets → discusses /
 * deliberates → recommends continue / pause / stop / modify.
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["package", "convene", "deliberate", "recommend"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  package:    { label: "PACKAGE",    sub: "unblinded brief",       duration: 2400 },
  convene:    { label: "CONVENE",    sub: "5 members · closed",    duration: 2600 },
  deliberate: { label: "DELIBERATE", sub: "safety · efficacy",     duration: 2800 },
  recommend:  { label: "RECOMMEND",  sub: "CONTINUE · no changes", duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function DsmbReview({ size = 180, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  // 5 committee members around a closed-door oval
  const members = [0, 1, 2, 3, 4].map((i) => {
    const angle = (i / 5) * 2 * Math.PI - Math.PI / 2;
    return {
      x: 90 + Math.cos(angle) * 42,
      y: 68 + Math.sin(angle) * 20,
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
        aria-label={`DSMB review — ${info.label}`}
      >
        {/* Closed-door oval table */}
        <ellipse cx="90" cy="68" rx="34" ry="14" strokeWidth="0.7" opacity="0.6" />

        {/* Committee members */}
        {members.map((m, i) => (
          <g key={i} transform={`translate(${m.x} ${m.y})`} opacity={stage === "package" ? 0.3 : 1} style={{ transition: noTransition ?? "opacity 400ms ease" }}>
            <circle cx="0" cy="-4" r="2.2" stroke={stage === "recommend" ? "#86efac" : "currentColor"} strokeWidth="0.65" />
            <path d="M -3.2 4 L -3.2 0 Q 0 -3 3.2 0 L 3.2 4" stroke={stage === "recommend" ? "#86efac" : "currentColor"} strokeWidth="0.65" fill="none" />
          </g>
        ))}

        {/* Stage 1 — package document */}
        <g opacity={stage === "package" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <rect x="78" y="60" width="24" height="18" stroke="#7dd3fc" strokeWidth="0.75" />
          <line x1="80" y1="64" x2="100" y2="64" stroke="#7dd3fc" strokeWidth="0.4" />
          <line x1="80" y1="68" x2="100" y2="68" stroke="#7dd3fc" strokeWidth="0.4" opacity="0.7" />
          <line x1="80" y1="72" x2="96" y2="72" stroke="#7dd3fc" strokeWidth="0.4" opacity="0.55" />
          <text x="104" y="64" fontSize="3" fill="#7dd3fc" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">SAE</text>
          <text x="104" y="70" fontSize="3" fill="#7dd3fc" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.85">AE</text>
          <text x="104" y="76" fontSize="3" fill="#7dd3fc" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.7">eff.</text>
        </g>

        {/* Stage 3 — deliberation speech bubbles */}
        <g opacity={stage === "deliberate" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          {members.map((m, i) => (
            <path
              key={i}
              d={`M ${m.x} ${m.y - 9} q -2.5 -4 0 -7 q 2.5 2.5 0 7`}
              stroke="#fbbf24"
              strokeWidth="0.45"
              fill="none"
              opacity={i % 2 === 0 ? 0.85 : 0.5}
            />
          ))}
        </g>

        {/* Stage 4 — recommendation banner */}
        <g opacity={stage === "recommend" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <rect x="48" y="98" width="84" height="10" rx="1.5" stroke="#86efac" strokeWidth="0.7" fill="#86efac" fillOpacity="0.2" />
          <text x="90" y="106" textAnchor="middle" fontSize="4.6" fill="#86efac" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontWeight="700">CONTINUE · no changes</text>
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
