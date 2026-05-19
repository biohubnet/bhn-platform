"use client";

/**
 * BatchReleaseQA — four-stage looping animation of QA batch release.
 * A batch record gets reviewed; a deviation is flagged; CAPA closes
 * it; the batch is dispositioned.
 *
 * Stages:
 *   1. RECORD     — batch record document on screen
 *   2. DEVIATION  — a rose flag appears on one entry
 *   3. CAPA       — corrective action arrow descends; flag turns amber
 *   4. RELEASE    — disposition stamp lands green
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["record", "deviation", "capa", "release"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  record:    { label: "BATCH RECORD",  sub: "MBR review",         duration: 2400 },
  deviation: { label: "DEVIATION",     sub: "OOS · investigate",  duration: 2800 },
  capa:      { label: "CAPA · CLOSED", sub: "root cause known",   duration: 2800 },
  release:   { label: "DISPOSITION",   sub: "released for use",   duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function BatchReleaseQA({ size = 170, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  const showDev = stage === "deviation" || stage === "capa";
  const showCapa = stage === "capa";
  const showRls = stage === "release";

  // Entry rows in the batch record
  const ROWS = [
    { y: 36, label: "L1" },
    { y: 48, label: "L2" },
    { y: 60, label: "L3" },
    { y: 72, label: "L4" },
    { y: 84, label: "L5" },
    { y: 96, label: "L6" },
  ];

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
        aria-label={`Batch release QA — ${info.label}`}
      >
        {/* Document */}
        <rect x="28" y="20" width="114" height="92" rx="2" />
        <line x1="34" y1="28" x2="118" y2="28" strokeWidth="0.55" opacity="0.55" />
        <text x="34" y="28" fontSize="4.6" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" letter-spacing="0.4" opacity="0.7">MBR · LOT 24-118</text>
        {ROWS.map((r) => (
          <g key={r.y}>
            <text x="36" y={r.y + 1} fontSize="4.6" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.65">{r.label}</text>
            <line x1="44" y1={r.y - 1} x2="118" y2={r.y - 1} strokeWidth="0.5" opacity="0.55" />
          </g>
        ))}

        {/* Deviation flag on row L4 (y=72) */}
        <g
          opacity={showDev ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}
        >
          <path
            d="M 122 68 L 132 68 L 130 72 L 132 76 L 122 76 Z"
            fill={showCapa ? "#fbbf24" : "#fb7185"}
            fillOpacity="0.5"
            stroke={showCapa ? "#fbbf24" : "#fb7185"}
            strokeWidth="0.75"
            style={{ transition: noTransition ?? "fill 500ms ease, stroke 500ms ease" }}
          />
          <line x1="122" y1="68" x2="122" y2="80" strokeWidth="0.5" opacity="0.65" />
        </g>

        {/* CAPA arrow — descends from the side during CAPA */}
        <g
          opacity={showCapa ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}
        >
          <path
            d="M 148 50 Q 156 60, 136 70"
            stroke="#fbbf24" strokeWidth="0.85"
            strokeDasharray="2 2" fill="none"
          />
          <path d="M 134 68 L 136 70 L 134 72" stroke="#fbbf24" strokeWidth="0.85" fill="none" />
          <text x="142" y="44" fontSize="4.6" fill="#fbbf24" stroke="none" fontFamily="ui-monospace,monospace" letter-spacing="0.4">CAPA</text>
        </g>

        {/* Release stamp */}
        <g
          opacity={showRls ? 1 : 0}
          style={{
            transition: noTransition ?? "opacity 500ms ease, transform 600ms cubic-bezier(.4,.1,.4,1)",
            transform: showRls ? "rotate(-10deg) translate(0,0)" : "rotate(-10deg) translate(-6px,6px)",
            transformOrigin: "100px 60px",
          }}
        >
          <ellipse cx="100" cy="60" rx="20" ry="11" stroke="#86efac" strokeWidth="0.95" fill="#86efac" fillOpacity="0.16" />
          <text x="100" y="63" textAnchor="middle" fontSize="6" fill="#86efac" stroke="none" fontFamily="ui-monospace,monospace" fontWeight="700" letterSpacing="0.5">RELEASE</text>
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
