"use client";

/**
 * ValidationIQOQPQ — four-stage looping animation of a validation
 * engineer working through IQ/OQ/PQ on a piece of equipment. Three
 * checkboxes fill in sequence, ending in a Released state.
 *
 * Stages:
 *   1. IQ        — installation qualification check fills
 *   2. OQ        — operational qualification check fills
 *   3. PQ        — performance qualification check fills
 *   4. RELEASED  — green release seal lands
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["iq", "oq", "pq", "released"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  iq:       { label: "IQ",        sub: "installed per spec",      duration: 2600 },
  oq:       { label: "OQ",        sub: "operates · ranges OK",    duration: 2600 },
  pq:       { label: "PQ",        sub: "performs · 3 runs",       duration: 2800 },
  released: { label: "RELEASED",  sub: "GMP equipment · in use",  duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function ValidationIQOQPQ({ size = 180, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  // Track which rows are completed at each stage.
  const completed: Record<Stage, ("iq" | "oq" | "pq")[]> = {
    iq: ["iq"],
    oq: ["iq", "oq"],
    pq: ["iq", "oq", "pq"],
    released: ["iq", "oq", "pq"],
  };

  return (
    <div className={className}>
      <svg width={size} height={size * (170 / 180)} viewBox="0 0 180 170" fill="none" stroke="currentColor"
        strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round"
        role="img" aria-label={`Validation IQ/OQ/PQ — ${info.label}`}>
        {/* Equipment silhouette — a small skid */}
        <g>
          <rect x="22" y="40" width="40" height="56" rx="2" />
          {/* Vessel */}
          <ellipse cx="42" cy="58" rx="10" ry="6" stroke-width="0.7" />
          <line x1="42" y1="54" x2="42" y2="80" strokeWidth="0.5" opacity="0.6" />
          {/* Control panel */}
          <rect x="28" y="80" width="28" height="10" stroke-width="0.55" opacity="0.55" />
          <circle cx="32" cy="85" r="1.4" fill="#86efac" stroke="none" opacity="0.85" />
          <circle cx="38" cy="85" r="1.4" fill="#fbbf24" stroke="none" opacity="0.65" />
          <text x="42" y="104" textAnchor="middle" fontSize="4.6" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.65">SKID-12</text>
        </g>

        {/* Validation rows */}
        {[
          { key: "iq", y: 36, label: "IQ · INSTALL" },
          { key: "oq", y: 60, label: "OQ · OPERATE" },
          { key: "pq", y: 84, label: "PQ · PERFORM" },
        ].map((row) => {
          const done = completed[stage].includes(row.key as "iq" | "oq" | "pq");
          return (
            <g key={row.key}>
              <rect x="72" y={row.y - 8} width="92" height="14" rx="2" stroke-width="0.55" opacity="0.6" />
              <text x="78" y={row.y} fontSize="5" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" letterSpacing="0.4">{row.label}</text>
              <g opacity={done ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
                <circle cx="154" cy={row.y - 1.5} r="4" stroke="#86efac" strokeWidth="0.85" fill="#86efac" fillOpacity="0.18" />
                <path d={`M 151 ${row.y - 1.5} L 153 ${row.y + 0.5} L 157 ${row.y - 3.5}`} stroke="#86efac" strokeWidth="0.85" fill="none" />
              </g>
            </g>
          );
        })}

        {/* Release seal */}
        <g opacity={stage === "released" ? 1 : 0}
          style={{
            transition: noTransition ?? "opacity 500ms ease, transform 600ms cubic-bezier(.4,.1,.4,1)",
            transform: stage === "released" ? "rotate(-10deg) translate(0,0)" : "rotate(-10deg) translate(-6px,6px)",
            transformOrigin: "118px 116px",
          }}>
          <ellipse cx="118" cy="116" rx="22" ry="9" stroke="#86efac" strokeWidth="0.95" fill="#86efac" fillOpacity="0.18" />
          <text x="118" y="118" textAnchor="middle" fontSize="5.4" fill="#86efac" stroke="none" fontFamily="ui-monospace,monospace" fontWeight="700" letterSpacing="0.5">RELEASED</text>
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
