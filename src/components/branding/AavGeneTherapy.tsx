"use client";

/**
 * AavGeneTherapy — four-stage looping animation of an AAV gene
 * therapy lifecycle. The capsid is engineered, payload packed,
 * transduces a target cell, and durable expression begins.
 *
 * Stages:
 *   1. CAPSID       — empty AAV capsid icosahedron
 *   2. PACKAGE      — gene-of-interest cassette goes inside
 *   3. TRANSDUCE    — capsid docks on a target cell membrane
 *   4. EXPRESS      — therapeutic protein emerges from the cell;
 *                     "durable" timeline arrow
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["capsid", "package", "transduce", "express"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  capsid:    { label: "AAV CAPSID",    sub: "serotype 9",          duration: 2400 },
  package:   { label: "PACKAGE",       sub: "GOI · ITR-flanked",   duration: 2600 },
  transduce: { label: "TRANSDUCE",     sub: "target cell entry",   duration: 2600 },
  express:   { label: "EXPRESS",       sub: "durable · 1 dose",    duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function AavGeneTherapy({ size = 180, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  // Capsid X position — moves right at transduce/express
  const capsidX = stage === "transduce" || stage === "express" ? 60 : 50;

  return (
    <div className={className}>
      <svg width={size} height={size * (170 / 180)} viewBox="0 0 180 170" fill="none" stroke="currentColor"
        strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round"
        role="img" aria-label={`AAV gene therapy — ${info.label}`}>
        {/* AAV capsid */}
        <g style={{
          transition: noTransition ?? "transform 800ms cubic-bezier(.4,.1,.4,1)",
          transform: `translateX(${capsidX - 50}px)`,
        }}>
          {/* Icosahedron face */}
          <polygon points="50,30 64,38 64,54 50,62 36,54 36,38" stroke-width="0.85" fill="currentColor" fillOpacity="0.06" />
          <polygon points="50,30 64,38 50,46 36,38" strokeWidth="0.55" opacity="0.5" />
          <polygon points="50,46 64,38 64,54 50,62" strokeWidth="0.55" opacity="0.5" />
          <polygon points="50,46 36,38 36,54 50,62" strokeWidth="0.55" opacity="0.5" />

          {/* Payload inside (visible from PACKAGE onwards) */}
          <g opacity={stage === "capsid" ? 0 : 1} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
            <path d="M 42 46 Q 50 42, 58 46" strokeWidth="0.7" stroke="#86efac" />
            <text x="50" y="52" textAnchor="middle" fontSize="4" fill="#86efac" stroke="none" fontFamily="ui-monospace,monospace" letterSpacing="0.3">GOI</text>
          </g>
        </g>

        {/* Target cell — membrane segment with receptors */}
        <g opacity={stage === "transduce" || stage === "express" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <path d="M 90 80 Q 120 56, 156 80 Q 156 100, 90 100 Z" stroke-width="0.85" fill="currentColor" fillOpacity="0.08" />
          {/* Receptors */}
          {[100, 116, 132, 148].map((x) => (
            <g key={x}>
              <line x1={x} y1="76" x2={x} y2="68" strokeWidth="0.55" opacity="0.7" />
              <path d={`M ${x - 2} 64 L ${x + 2} 64 L ${x} 66 Z`} stroke="currentColor" strokeWidth="0.55" />
            </g>
          ))}
        </g>

        {/* Therapeutic protein emerging — at EXPRESS */}
        <g opacity={stage === "express" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          {/* Mini Y antibody shape representing therapeutic protein */}
          <g transform="translate(120 50)">
            <line x1="0" y1="0" x2="0" y2="8" strokeWidth="0.85" stroke="#86efac" />
            <line x1="0" y1="0" x2="-5" y2="-6" strokeWidth="0.85" stroke="#86efac" />
            <line x1="0" y1="0" x2="5" y2="-6" strokeWidth="0.85" stroke="#86efac" />
            <circle cx="-5" cy="-6" r="1.3" fill="#86efac" stroke="none" />
            <circle cx="5" cy="-6" r="1.3" fill="#86efac" stroke="none" />
          </g>
          {/* Durable arrow timeline */}
          <line x1="22" y1="116" x2="158" y2="116" strokeWidth="0.7" stroke="#86efac" />
          <path d="M 154 113 L 158 116 L 154 119" strokeWidth="0.7" stroke="#86efac" fill="none" />
          <text x="22" y="112" fontSize="4.4" fill="#86efac" stroke="none" fontFamily="ui-monospace,monospace" letterSpacing="0.4">single dose · durable</text>
        </g>

        <g fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
          <text x="90" y="134" textAnchor="middle" fontSize="6.8" fontWeight="700" letterSpacing="1.3">{info.label}</text>
          <text x="90" y="146" textAnchor="middle" fontSize="5.6" opacity="0.55" letterSpacing="0.4">{info.sub}</text>
        </g>
        <g transform="translate(72 158)" role="progressbar"
          aria-label={`Cycle stage ${stageIdx + 1} of ${STAGES.length}: ${info.label}`}
          aria-valuenow={stageIdx + 1} aria-valuemin={1} aria-valuemax={STAGES.length}>
          {STAGES.map((_, i) => (
            <circle key={i} cx={i * 12} cy={0} r="1.6" fill={i === stageIdx ? "#86efac" : "currentColor"}
              opacity={i === stageIdx ? 1 : 0.3} stroke="none"
              style={{ transition: noTransition ?? "opacity 300ms ease, fill 300ms ease" }} />
          ))}
        </g>
      </svg>
    </div>
  );
}
