"use client";

/**
 * EnvironmentalMonitoring — four-stage looping animation of an
 * aseptic environmental monitoring cycle. Settle plates are
 * deployed, incubated, colony counts taken, then trended.
 *
 * Stages:
 *   1. DEPLOY    — three settle plates placed in cleanroom map
 *   2. INCUBATE  — 5-day incubator clock
 *   3. COUNT     — one plate has a colony (red dot); others clear
 *   4. TREND     — small trending chart with one excursion marker
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["deploy", "incubate", "count", "trend"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  deploy:   { label: "DEPLOY · EM",     sub: "3 settle plates",       duration: 2400 },
  incubate: { label: "INCUBATE",        sub: "30 °C · 5 d / 22 °C · 5 d", duration: 2600 },
  count:    { label: "ENUMERATE",       sub: "1 CFU · plate 2",       duration: 2600 },
  trend:    { label: "TREND",           sub: "1 excursion · alert",   duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function EnvironmentalMonitoring({ size = 180, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  const showIncubator = stage === "incubate";
  const showCount = stage === "count" || stage === "trend";
  const showTrend = stage === "trend";

  return (
    <div className={className}>
      <svg width={size} height={size * (170 / 180)} viewBox="0 0 180 170" fill="none" stroke="currentColor"
        strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round"
        role="img" aria-label={`Environmental monitoring — ${info.label}`}>
        {/* Cleanroom map */}
        <rect x="20" y="22" width="140" height="56" rx="3" stroke-width="0.85" />
        <text x="22" y="18" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.6">FILL ROOM · ISO 5</text>

        {/* Settle plates positions */}
        {[
          { cx: 50, cy: 44, id: 1 },
          { cx: 90, cy: 56, id: 2, hot: true },
          { cx: 130, cy: 44, id: 3 },
        ].map((p) => (
          <g key={p.id}>
            <circle cx={p.cx} cy={p.cy} r="7" stroke-width="0.85" fill="currentColor" fillOpacity="0.06" />
            <text x={p.cx} y={p.cy - 9} textAnchor="middle" fontSize="3.8" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.65">P{p.id}</text>
            {/* Colony dot if hot + count stage */}
            {showCount && p.hot && (
              <circle cx={p.cx + 1.5} cy={p.cy - 1} r="1.4" fill="#fb7185" stroke="none" />
            )}
          </g>
        ))}

        {/* Incubator card */}
        <g opacity={showIncubator ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <rect x="60" y="32" width="60" height="36" rx="3" fill="currentColor" fillOpacity="0.08" stroke-width="0.85" />
          <text x="90" y="46" textAnchor="middle" fontSize="5" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" letterSpacing="0.4">INCUBATE</text>
          <text x="90" y="56" textAnchor="middle" fontSize="4.6" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.7">30°C · 5d → 22°C · 5d</text>
          {/* Mini clock */}
          <circle cx="78" cy="62" r="3" stroke-width="0.55" opacity="0.7" />
          <line x1="78" y1="62" x2="78" y2="60" strokeWidth="0.5" opacity="0.7" />
          <line x1="78" y1="62" x2="80" y2="62" strokeWidth="0.5" opacity="0.7" />
        </g>

        {/* Trend chart */}
        <g opacity={showTrend ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <line x1="22" y1="108" x2="158" y2="108" strokeWidth="0.55" opacity="0.6" />
          <line x1="22" y1="108" x2="22" y2="86" strokeWidth="0.55" opacity="0.6" />
          {/* Alert limit */}
          <line x1="22" y1="92" x2="158" y2="92" strokeWidth="0.5" strokeDasharray="2 2" stroke="#fbbf24" opacity="0.65" />
          <text x="158" y="92" textAnchor="end" fontSize="4.2" fill="#fbbf24" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.85">alert · 3 CFU</text>
          {/* Bars */}
          {[
            { x: 30, h: 4 },
            { x: 44, h: 2 },
            { x: 58, h: 6 },
            { x: 72, h: 4 },
            { x: 86, h: 14, hot: true },
            { x: 100, h: 4 },
            { x: 114, h: 6 },
            { x: 128, h: 2 },
            { x: 142, h: 4 },
          ].map((b, i) => (
            <rect key={i} x={b.x - 3} y={108 - b.h} width="6" height={b.h}
              fill={b.hot ? "#fb7185" : "currentColor"} fillOpacity={b.hot ? 0.7 : 0.3} stroke="none" />
          ))}
        </g>

        <g fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
          <text x="90" y="136" textAnchor="middle" fontSize="6.8" fontWeight="700" letterSpacing="1.3">{info.label}</text>
          <text x="90" y="148" textAnchor="middle" fontSize="5.6" opacity="0.55" letterSpacing="0.4">{info.sub}</text>
        </g>
        <g transform="translate(72 160)" role="progressbar"
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
