"use client";

/**
 * FlowCytometryGating — four-stage looping animation of a flow
 * cytometry analysis. Cells are acquired, compensated, gated into
 * a population of interest, and population stats land.
 *
 * Stages:
 *   1. ACQUIRE     — raw scatter plot fills with dots
 *   2. COMPENSATE  — spillover line straightens; smearing reduces
 *   3. GATE        — polygon gate is drawn around the population
 *   4. POPULATION  — gated %, MFI annotation appears
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["acquire", "compensate", "gate", "population"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  acquire:    { label: "ACQUIRE",     sub: "50k events",         duration: 2600 },
  compensate: { label: "COMPENSATE",  sub: "single-stains · OK", duration: 2400 },
  gate:       { label: "GATE",        sub: "polygon · CD3+CD8+", duration: 2800 },
  population: { label: "POPULATION",  sub: "22.4% · MFI 4530",   duration: 3000 },
};

const POINTS = (() => {
  const pts: Array<{ x: number; y: number; pop: boolean }> = [];
  // Main cluster (CD3+CD8+) — top-right
  for (let i = 0; i < 30; i++) {
    const a = (i / 30) * 6.28;
    pts.push({ x: 96 + Math.cos(a) * (4 + (i % 5)), y: 48 + Math.sin(a) * (4 + (i % 5)), pop: true });
  }
  // Off-cluster background
  for (let i = 0; i < 20; i++) {
    pts.push({ x: 40 + ((i * 13) % 40), y: 60 + ((i * 7) % 30), pop: false });
  }
  return pts;
})();

interface Props { size?: number; className?: string; }

export function FlowCytometryGating({ size = 180, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  const isCompensated = stage !== "acquire";
  const showGate = stage === "gate" || stage === "population";
  const showStats = stage === "population";

  return (
    <div className={className}>
      <svg width={size} height={size * (170 / 180)} viewBox="0 0 180 170" fill="none" stroke="currentColor"
        strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round"
        role="img" aria-label={`Flow cytometry — ${info.label}`}>
        {/* Axes */}
        <line x1="30" y1="100" x2="150" y2="100" strokeWidth="0.55" opacity="0.6" />
        <line x1="30" y1="100" x2="30" y2="20" strokeWidth="0.55" opacity="0.6" />
        <text x="148" y="110" fontSize="4.4" textAnchor="end" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.6">CD3 →</text>
        <text x="22" y="24" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.6" textAnchor="end">CD8</text>

        {/* Scatter points — compensation shifts the main cluster from a smear to a tight circle */}
        {POINTS.map((p, i) => {
          const dx = isCompensated ? 0 : (p.pop ? -6 + ((i * 3) % 8) : 0);
          const dy = isCompensated ? 0 : (p.pop ? 6 - ((i * 5) % 9) : 0);
          return (
            <circle key={i} cx={p.x + dx} cy={p.y + dy} r="1.3"
              fill={showStats && p.pop ? "#86efac" : "currentColor"}
              opacity={p.pop ? 0.85 : 0.55} stroke="none"
              style={{ transition: noTransition ?? "cx 800ms ease, cy 800ms ease, fill 500ms ease" }} />
          );
        })}

        {/* Gate polygon */}
        <path d="M 84 32 L 110 32 L 116 50 L 108 64 L 86 64 L 80 50 Z"
          stroke="#86efac" strokeWidth="0.95" strokeDasharray="2.5 2"
          fill="#86efac" fillOpacity="0.08"
          opacity={showGate ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }} />

        {/* Population stats */}
        <g opacity={showStats ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <text x="120" y="26" fontSize="5.6" fill="#86efac" stroke="none" fontFamily="ui-monospace,monospace" fontWeight="700">22.4%</text>
          <text x="120" y="34" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.65">MFI 4530</text>
        </g>

        <g fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
          <text x="90" y="128" textAnchor="middle" fontSize="6.8" fontWeight="700" letterSpacing="1.3">{info.label}</text>
          <text x="90" y="140" textAnchor="middle" fontSize="5.6" opacity="0.55" letterSpacing="0.4">{info.sub}</text>
        </g>
        <g transform="translate(72 154)" role="progressbar"
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
