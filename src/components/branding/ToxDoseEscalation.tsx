"use client";

/**
 * ToxDoseEscalation — four-stage looping animation of a preclinical
 * GLP toxicology dose-escalation. Three cohorts at increasing doses
 * are dosed in sequence; tox markers rise; NOAEL is identified.
 *
 * Stages:
 *   1. LOW    — cohort 1 at low dose; tox marker flat
 *   2. MID    — cohort 2 at mid dose; marker rises slightly
 *   3. HIGH   — cohort 3 at high dose; marker spikes (red)
 *   4. NOAEL  — NOAEL line lands between MID and HIGH
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["low", "mid", "high", "noael"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  low:   { label: "COHORT 1 · LOW",  sub: "10 mg/kg",          duration: 2400 },
  mid:   { label: "COHORT 2 · MID",  sub: "30 mg/kg",          duration: 2600 },
  high:  { label: "COHORT 3 · HIGH", sub: "100 mg/kg · tox",   duration: 2800 },
  noael: { label: "NOAEL · 30",      sub: "highest no-effect", duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function ToxDoseEscalation({ size = 180, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  // Bar heights — tox marker per cohort
  const lowH = 8;
  const midH = stage === "low" ? 0 : 14;
  const highH = stage === "low" || stage === "mid" ? 0 : 42;

  const showNoael = stage === "noael";

  return (
    <div className={className}>
      <svg width={size} height={size * (170 / 180)} viewBox="0 0 180 170" fill="none" stroke="currentColor"
        strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round"
        role="img" aria-label={`Tox dose escalation — ${info.label}`}>
        {/* Three mouse silhouettes for the cohorts */}
        {[42, 90, 138].map((cx, i) => (
          <g key={i} opacity={i <= STAGES.indexOf(stage) && stage !== "noael" ? 1 : (stage === "noael" ? 0.5 : 0.25)}
            style={{ transition: noTransition ?? "opacity 500ms ease" }}>
            <ellipse cx={cx} cy="36" rx="14" ry="8" />
            <circle cx={cx - 12} cy="32" r="4.4" />
            <circle cx={cx - 13} cy="29" r="1.6" />
            <circle cx={cx - 15} cy="32" r="0.6" fill="currentColor" stroke="none" />
            <line x1={cx + 14} y1="36" x2={cx + 22} y2="40" strokeWidth="0.6" />
            <text x={cx} y="58" textAnchor="middle" fontSize="4.6" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.7" letterSpacing="0.3">
              {["10", "30", "100"][i]} mg/kg
            </text>
          </g>
        ))}

        {/* Bar chart of tox marker */}
        <g>
          <line x1="20" y1="120" x2="160" y2="120" strokeWidth="0.55" opacity="0.6" />
          <line x1="20" y1="120" x2="20" y2="68" strokeWidth="0.55" opacity="0.6" />
          <text x="10" y="80" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.6" transform="rotate(-90 10 80)">ALT</text>
          {[
            { cx: 42, h: lowH,  col: "currentColor", fop: 0.45 },
            { cx: 90, h: midH,  col: "#fbbf24",      fop: 0.45 },
            { cx: 138, h: highH, col: "#fb7185",     fop: 0.55 },
          ].map((b, i) => (
            <rect key={i} x={b.cx - 7} y={120 - b.h} width="14" height={b.h}
              fill={b.col} fillOpacity={b.fop} stroke={b.col} strokeWidth="0.7"
              style={{ transition: noTransition ?? "y 700ms ease, height 700ms ease" }} />
          ))}
        </g>

        {/* NOAEL marker */}
        <g opacity={showNoael ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <line x1="20" y1="106" x2="160" y2="106" strokeWidth="0.7" strokeDasharray="2 2" stroke="#86efac" />
          <text x="166" y="108" fontSize="5" fill="#86efac" stroke="none" fontFamily="ui-monospace,monospace" letterSpacing="0.4">NOAEL</text>
        </g>

        <g fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
          <text x="90" y="138" textAnchor="middle" fontSize="6.8" fontWeight="700" letterSpacing="1.3">{info.label}</text>
          <text x="90" y="150" textAnchor="middle" fontSize="5.6" opacity="0.55" letterSpacing="0.4">{info.sub}</text>
        </g>
        <g transform="translate(72 162)" role="progressbar"
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
