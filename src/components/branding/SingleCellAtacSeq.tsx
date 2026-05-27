"use client";

/**
 * SingleCellAtacSeq — four-stage looping animation of single-cell
 * ATAC-seq, the chromatin-accessibility companion to scRNA-seq.
 * Nuclei isolated from a tissue → Tn5 transposase cuts open chromatin
 * and adds adapters → libraries sequenced → accessibility peaks
 * called along the genome.
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["nuclei", "tagment", "sequence", "peaks"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  nuclei:   { label: "NUCLEI",   sub: "tissue → nuclei",         duration: 2400 },
  tagment:  { label: "TAGMENT",  sub: "Tn5 · open chromatin",    duration: 2600 },
  sequence: { label: "SEQUENCE", sub: "paired-end · 50k cells",  duration: 2400 },
  peaks:    { label: "PEAKS",    sub: "MACS2 · 124 k peaks",     duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function SingleCellAtacSeq({ size = 180, className }: Props) {
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
        aria-label={`scATAC-seq — ${info.label}`}
      >
        {/* Stage 1 — nuclei in suspension */}
        <g opacity={stage === "nuclei" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <rect x="42" y="36" width="96" height="58" rx="3" strokeWidth="0.7" />
          {/* Nuclei dots — bigger circles with smaller inner dot */}
          {[
            [60, 56], [80, 50], [100, 60], [120, 54],
            [62, 78], [82, 84], [102, 78], [122, 82],
            [70, 66], [95, 72], [115, 68],
          ].map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r="4" stroke="#7dd3fc" strokeWidth="0.55" fill="#7dd3fc" fillOpacity="0.18" />
              <circle cx={x} cy={y} r="1.2" fill="#7dd3fc" stroke="none" />
            </g>
          ))}
        </g>

        {/* Stage 2 — chromatin with Tn5 cutting */}
        <g opacity={stage === "tagment" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          {/* Chromatin wave */}
          <path d="M 24 70 Q 36 50 50 70 Q 64 90 78 70 Q 92 50 106 70 Q 120 90 134 70 Q 148 50 162 70" stroke="#86efac" strokeWidth="1.1" fill="none" />
          {/* Beads on the chromatin */}
          {[36, 50, 64, 78, 92, 106, 120, 134, 148].map((x, i) => (
            <circle key={i} cx={x} cy={70 + (i % 2 === 0 ? -16 : 16)} r="3" stroke="#86efac" strokeWidth="0.6" fill="#86efac" fillOpacity="0.25" />
          ))}
          {/* Tn5 scissors */}
          <g transform="translate(78 44)">
            <circle cx="-3" cy="0" r="2" stroke="#fb7185" strokeWidth="0.6" />
            <circle cx="3" cy="0" r="2" stroke="#fb7185" strokeWidth="0.6" />
            <path d="M -2 1.5 L 4 8" stroke="#fb7185" strokeWidth="0.7" />
            <path d="M 2 1.5 L -4 8" stroke="#fb7185" strokeWidth="0.7" />
          </g>
          <text x="78" y="58" textAnchor="middle" fontSize="3.4" fill="#fb7185" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">Tn5</text>
        </g>

        {/* Stage 3 — sequencing reads */}
        <g opacity={stage === "sequence" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          {Array.from({ length: 12 }).map((_, i) => {
            const y = 40 + (i % 6) * 9;
            const x = 30 + Math.floor(i / 6) * 76;
            const width = 24 + ((i * 7) % 18);
            return (
              <g key={i}>
                <rect x={x} y={y} width={width} height="3" fill="#a78bfa" fillOpacity="0.85" stroke="none" />
                <rect x={x + width + 4} y={y} width={20 - (i % 5) * 2} height="3" fill="#a78bfa" fillOpacity="0.55" stroke="none" />
              </g>
            );
          })}
          <text x="90" y="100" textAnchor="middle" fontSize="3.6" fill="#a78bfa" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">paired-end 2 × 50 bp</text>
        </g>

        {/* Stage 4 — peak track over genome */}
        <g opacity={stage === "peaks" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          {/* Genome line */}
          <line x1="22" y1="80" x2="158" y2="80" strokeWidth="0.7" opacity="0.55" />
          {/* Peaks */}
          {[
            [28, 18], [40, 8], [50, 22], [60, 6], [74, 12], [86, 28], [98, 14],
            [110, 22], [122, 6], [134, 18], [146, 10], [156, 14],
          ].map(([x, h], i) => (
            <path
              key={i}
              d={`M ${x - 3} 80 L ${x} ${80 - h} L ${x + 3} 80 Z`}
              fill="#86efac"
              fillOpacity="0.7"
              stroke="#86efac"
              strokeWidth="0.4"
            />
          ))}
          <text x="158" y="98" textAnchor="end" fontSize="3.6" fill="#86efac" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">124,318 peaks</text>
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
