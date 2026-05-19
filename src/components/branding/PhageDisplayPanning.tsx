"use client";

/**
 * PhageDisplayPanning — four-stage looping animation of antibody
 * discovery by phage display. A diverse phage library binds an
 * immobilized target, low-affinity binders wash off, the survivor
 * pool elutes, and the winning clone is identified.
 *
 * Stages:
 *   1. LIBRARY   — many phage particles drift above a target line
 *   2. BIND      — particles attach to the target
 *   3. WASH      — most particles wash away; a few high-affinity remain
 *   4. ELUTE     — the winners are pulled off and one clone highlights
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["library", "bind", "wash", "elute"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  library: { label: "PHAGE LIBRARY",  sub: "10⁹ clones",         duration: 2600 },
  bind:    { label: "PANNING · BIND", sub: "immobilized target", duration: 2800 },
  wash:    { label: "STRINGENT WASH", sub: "off-rate selection", duration: 2800 },
  elute:   { label: "ELUTE · WINNER", sub: "high-affinity clone", duration: 3000 },
};

// Phage positions; some are "high affinity" and survive the wash.
const PHAGES = [
  { x: 26, dy: -16, hi: false }, { x: 38, dy: -22, hi: true },
  { x: 50, dy: -18, hi: false }, { x: 62, dy: -28, hi: false },
  { x: 74, dy: -14, hi: true  }, { x: 86, dy: -24, hi: false },
  { x: 98, dy: -20, hi: false }, { x: 110, dy: -16, hi: true },
  { x: 122, dy: -26, hi: false }, { x: 134, dy: -18, hi: false },
];

const WINNER_IDX = 4; // arbitrary clone that "wins" — the one we highlight

interface Props { size?: number; className?: string; }

export function PhageDisplayPanning({ size = 170, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  // Y offset per stage — phages drift down at BIND, washed away at WASH, lifted at ELUTE
  const baseLine = 90;

  function phageY(idx: number, hi: boolean) {
    if (stage === "library") return baseLine + PHAGES[idx].dy;
    if (stage === "bind") return baseLine - 8;
    if (stage === "wash") return hi ? baseLine - 8 : baseLine - 50;
    // elute
    return hi ? baseLine - 30 : baseLine - 80;
  }
  function phageOpacity(idx: number, hi: boolean) {
    if (stage === "library") return 0.7;
    if (stage === "bind") return 0.85;
    if (stage === "wash") return hi ? 0.9 : 0.18;
    return hi ? 1 : 0;
  }

  return (
    <div className={className}>
      <svg
        width={size}
        height={size * (170 / 170)}
        viewBox="0 0 170 170"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        role="img"
        aria-label={`Phage display panning — ${info.label}`}
      >
        {/* Immobilized target line — bottom */}
        <line x1="14" y1={baseLine} x2="156" y2={baseLine} />
        {/* Target receptor handles */}
        {[22, 38, 54, 70, 86, 102, 118, 134, 150].map((x) => (
          <g key={x}>
            <line x1={x} y1={baseLine} x2={x} y2={baseLine + 6} strokeWidth="0.55" opacity="0.6" />
            <circle cx={x} cy={baseLine + 7} r="1.4" fill="currentColor" stroke="none" opacity="0.6" />
          </g>
        ))}
        <text
          x="14" y={baseLine + 22}
          fontSize="5"
          fill="currentColor" stroke="none"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          opacity="0.55"
          letterSpacing="0.3"
        >
          immobilized antigen
        </text>

        {/* Phages — long elongated bodies with tail fibers + scFv tip */}
        {PHAGES.map((p, i) => {
          const y = phageY(i, p.hi);
          const op = phageOpacity(i, p.hi);
          const winner = stage === "elute" && i === WINNER_IDX;
          return (
            <g
              key={`ph-${i}`}
              opacity={op}
              style={{
                transition: noTransition ?? "opacity 700ms ease, transform 1100ms cubic-bezier(.5,.1,.4,1)",
                transform: `translate(${p.x}px, ${y}px)`,
              }}
            >
              {/* Body */}
              <rect x="-1.4" y="-12" width="2.8" height="12" rx="1" stroke="currentColor" strokeWidth="0.55" />
              {/* scFv tip (the antibody fragment being displayed) */}
              <path d="M -2 0 L 0 4 L 2 0 Z" fill={winner ? "#86efac" : "currentColor"} fillOpacity={winner ? 1 : 0.55} stroke="none" />
              {/* Winner aura */}
              {winner && (
                <circle cx="0" cy="0" r="6" stroke="#86efac" strokeWidth="0.7" opacity="0.6" fill="none" />
              )}
            </g>
          );
        })}

        {/* Wash arrows during WASH stage */}
        <g
          opacity={stage === "wash" ? 0.7 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}
        >
          <path d="M 12 50 L 158 50" strokeWidth="0.55" strokeDasharray="2 2" />
          <path d="M 154 47 L 158 50 L 154 53" strokeWidth="0.55" fill="none" />
          <text
            x="86" y="46"
            fontSize="5" textAnchor="middle"
            fill="currentColor" stroke="none"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            opacity="0.7"
          >wash buffer →</text>
        </g>

        {/* Elute label */}
        <g
          opacity={stage === "elute" ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}
        >
          <text
            x="120" y={baseLine - 50}
            fontSize="5" textAnchor="middle"
            fill="#86efac" stroke="none"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            letterSpacing="0.4"
          >Kd ≈ 0.8 nM</text>
        </g>

        {/* Stage label */}
        <g fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
          <text x="85" y="136" textAnchor="middle" fontSize="6.8" fontWeight="700" letterSpacing="1.3">{info.label}</text>
          <text x="85" y="148" textAnchor="middle" fontSize="5.6" opacity="0.55" letterSpacing="0.4">{info.sub}</text>
        </g>

        <g
          transform="translate(67 162)"
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
