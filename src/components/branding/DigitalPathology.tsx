"use client";

/**
 * DigitalPathology — four-stage looping animation of a digital
 * pathology workflow. A glass slide is scanned, AI annotates
 * regions of interest, a pathologist confirms, and a diagnosis
 * lozenge appears.
 *
 * Stages:
 *   1. SLIDE     — glass slide rectangle with a small tissue blob
 *   2. SCAN      — scanner gantry sweeps; whole-slide tile grid appears
 *   3. ANNOTATE  — AI bounding boxes drop around three tumor regions
 *   4. DIAGNOSE  — diagnosis lozenge ("Adenocarcinoma · grade 2")
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["slide", "scan", "annotate", "diagnose"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  slide:    { label: "GLASS SLIDE", sub: "H&E stain",          duration: 2400 },
  scan:     { label: "WSI SCAN",    sub: "40x · whole slide",  duration: 2800 },
  annotate: { label: "AI · ROI",    sub: "tumor regions",      duration: 2800 },
  diagnose: { label: "DIAGNOSIS",   sub: "adenocarcinoma G2",  duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function DigitalPathology({ size = 180, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  return (
    <div className={className}>
      <svg width={size} height={size * (170 / 180)} viewBox="0 0 180 170" fill="none" stroke="currentColor"
        strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round"
        role="img" aria-label={`Digital pathology — ${info.label}`}>
        {/* Glass slide */}
        <rect x="22" y="22" width="136" height="80" rx="2" />
        {/* Label area */}
        <rect x="22" y="22" width="34" height="80" stroke-width="0.55" opacity="0.5" />
        <text x="39" y="58" textAnchor="middle" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.6">CASE 24-118</text>
        <text x="39" y="68" textAnchor="middle" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.6">SECT 4</text>

        {/* Tissue blob */}
        <path d="M 80 50 Q 70 38, 90 36 Q 110 38, 122 50 Q 138 60, 132 78 Q 116 92, 92 88 Q 70 84, 76 70 Q 76 58, 80 50 Z"
          fill="#fb7185" fillOpacity="0.18" stroke="#fb7185" strokeWidth="0.55" opacity="0.85" />

        {/* WSI tile grid */}
        <g opacity={stage === "scan" || stage === "annotate" || stage === "diagnose" ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          {Array.from({ length: 7 }).map((_, c) =>
            Array.from({ length: 5 }).map((_, r) => (
              <rect key={`${c}-${r}`} x={62 + c * 14} y={28 + r * 14} width="14" height="14"
                strokeWidth="0.4" opacity="0.35" />
            )),
          )}
        </g>

        {/* Scanner gantry */}
        <g opacity={stage === "scan" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <line x1="80" y1="18" x2="160" y2="18" strokeWidth="0.7" opacity="0.55" />
          <rect x="120" y="14" width="12" height="92" rx="1" stroke-width="0.7" />
          <line x1="126" y1="14" x2="126" y2="106" strokeWidth="0.5" opacity="0.65" strokeDasharray="1.5 1.5" />
        </g>

        {/* AI annotation boxes */}
        <g opacity={stage === "annotate" || stage === "diagnose" ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          {[
            { x: 92, y: 50, w: 16, h: 12 },
            { x: 108, y: 70, w: 14, h: 14 },
            { x: 82, y: 70, w: 12, h: 10 },
          ].map((b, i) => (
            <g key={i}>
              <rect x={b.x} y={b.y} width={b.w} height={b.h} stroke="#86efac" strokeWidth="0.85" strokeDasharray="2 1.5" />
              <text x={b.x + b.w / 2} y={b.y - 1} textAnchor="middle" fontSize="3.6" fill="#86efac" stroke="none" fontFamily="ui-monospace,monospace">ROI{i + 1}</text>
            </g>
          ))}
        </g>

        {/* Diagnosis lozenge */}
        <g opacity={stage === "diagnose" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <rect x="62" y="108" width="96" height="14" rx="7" stroke-width="0.85" fill="currentColor" fillOpacity="0.08" />
          <text x="110" y="117" textAnchor="middle" fontSize="5.4" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" fontWeight="700" letterSpacing="0.5">ADENOCARCINOMA · G2</text>
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
