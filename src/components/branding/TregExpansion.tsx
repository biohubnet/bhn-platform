"use client";

/**
 * TregExpansion — four-stage looping animation of regulatory T-cell
 * (Treg) expansion for autoimmune / GvHD cell therapy. PBMCs sorted
 * for CD4+CD25+ → activated with anti-CD3/CD28 beads and IL-2 → cell
 * count expands log-fold → product cryopreserved as therapy doses.
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["isolate", "activate", "expand", "cryopreserve"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  isolate:      { label: "ISOLATE",      sub: "CD4⁺CD25⁺ · sort",   duration: 2400 },
  activate:     { label: "ACTIVATE",     sub: "αCD3/CD28 + IL-2",   duration: 2400 },
  expand:       { label: "EXPAND",       sub: "300× · 14 days",     duration: 2800 },
  cryopreserve: { label: "CRYOPRESERVE", sub: "−196 °C · vials",    duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function TregExpansion({ size = 180, className }: Props) {
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
        aria-label={`Treg expansion — ${info.label}`}
      >
        {/* Stage 1 — sort gate */}
        <g opacity={stage === "isolate" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <g transform="translate(40 38)">
            <rect x="0" y="0" width="100" height="58" strokeWidth="0.65" />
            <line x1="0" y1="29" x2="100" y2="29" strokeWidth="0.4" opacity="0.5" strokeDasharray="2 2" />
            <line x1="50" y1="0" x2="50" y2="58" strokeWidth="0.4" opacity="0.5" strokeDasharray="2 2" />
            {/* Quadrant clouds */}
            {/* Q1 — low/low */}
            {Array.from({ length: 14 }).map((_, i) => (
              <circle key={`q1-${i}`} cx={6 + (i % 5) * 8} cy={36 + Math.floor(i / 5) * 6} r="1" fill="currentColor" stroke="none" opacity="0.4" />
            ))}
            {/* Q2 — CD4+CD25- (some) */}
            {Array.from({ length: 10 }).map((_, i) => (
              <circle key={`q2-${i}`} cx={56 + (i % 5) * 8} cy={36 + Math.floor(i / 5) * 6} r="1" fill="currentColor" stroke="none" opacity="0.55" />
            ))}
            {/* Q3 — empty */}
            {/* Q4 — Treg (CD4+CD25+) — highlighted */}
            {Array.from({ length: 8 }).map((_, i) => (
              <circle key={`q4-${i}`} cx={56 + (i % 4) * 8} cy={6 + Math.floor(i / 4) * 6} r="1.6" fill="#86efac" stroke="none" />
            ))}
            <rect x="52" y="3" width="40" height="22" stroke="#86efac" strokeWidth="0.7" strokeDasharray="3 2" />
            <text x="148" y="20" textAnchor="end" fontSize="3.8" fill="#86efac" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">Treg gate</text>
          </g>
        </g>

        {/* Stage 2 — activation (cells + beads) */}
        <g opacity={stage === "activate" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <g transform="translate(60 38)">
            <rect x="0" y="0" width="60" height="56" rx="2" strokeWidth="0.7" />
            {/* Cells (green) */}
            {[
              [12, 16], [22, 20], [32, 14], [42, 22], [50, 16],
              [14, 36], [26, 40], [38, 34], [48, 38],
            ].map(([x, y], i) => (
              <circle key={`c-${i}`} cx={x} cy={y} r="3" fill="#86efac" fillOpacity="0.4" stroke="#86efac" strokeWidth="0.55" />
            ))}
            {/* Beads (gold) */}
            {[
              [18, 14], [28, 24], [44, 16], [22, 32], [40, 30], [50, 42],
            ].map(([x, y], i) => (
              <circle key={`b-${i}`} cx={x} cy={y} r="1.4" fill="#fbbf24" stroke="none" />
            ))}
            <text x="30" y="68" textAnchor="middle" fontSize="3.4" fill="#fbbf24" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">IL-2 · 300 IU/mL</text>
          </g>
        </g>

        {/* Stage 3 — expansion log chart */}
        <g opacity={stage === "expand" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <g transform="translate(34 42)">
            <line x1="0" y1="0" x2="0" y2="54" strokeWidth="0.55" />
            <line x1="0" y1="54" x2="116" y2="54" strokeWidth="0.55" />
            <path d="M 0 50 Q 30 48 50 38 Q 80 18 116 6" stroke="#86efac" strokeWidth="0.9" fill="none" />
            {[0, 4, 8, 12, 16].map((d) => (
              <line key={d} x1={(d / 16) * 116} y1="54" x2={(d / 16) * 116} y2="56" strokeWidth="0.45" opacity="0.5" />
            ))}
            <text x="-3" y="8" fontSize="3.4" fill="#86efac" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.85">300×</text>
            <text x="116" y="62" textAnchor="end" fontSize="3.4" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.55">day 14</text>
          </g>
        </g>

        {/* Stage 4 — cryovials */}
        <g opacity={stage === "cryopreserve" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i} transform={`translate(${36 + i * 22} 42)`}>
              <rect x="0" y="0" width="12" height="36" rx="1.5" stroke="#7dd3fc" strokeWidth="0.7" fill="#7dd3fc" fillOpacity="0.18" />
              <rect x="0" y="0" width="12" height="4" stroke="#7dd3fc" strokeWidth="0.7" />
              <text x="6" y="26" textAnchor="middle" fontSize="3" fill="#7dd3fc" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">D{i + 1}</text>
            </g>
          ))}
          <text x="90" y="92" textAnchor="middle" fontSize="3.6" fill="#7dd3fc" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">−196 °C · 5 doses</text>
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
