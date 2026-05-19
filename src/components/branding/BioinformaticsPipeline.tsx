"use client";

/**
 * BioinformaticsPipeline — five-stage looping animation of a
 * variant-calling pipeline. Reads come in as FASTQ, get QC'd,
 * aligned to a reference, variants called, then annotated and
 * one variant highlights as the takeaway.
 *
 * Stages:
 *   1. FASTQ    — short read bars (lanes of A/C/G/T blocks) arriving
 *   2. QC       — a couple of low-quality reads grey out / get
 *                 trimmed (shortened bars + trim ticks).
 *   3. ALIGN    — reads stack against a reference line (the genome).
 *   4. CALL     — pileup column at one position spikes; vertical
 *                 caller arrow points up at it.
 *   5. ANNOTATE — the called variant gets a lozenge label
 *                 ("p.V600E") above the locus.
 *
 * Reads as: raw reads → cleaned → aligned → variant → annotated
 * The everyday work of a bioinformatician.
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["fastq", "qc", "align", "call", "annotate"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  fastq:    { label: "FASTQ INTAKE", sub: "raw reads",        duration: 2400 },
  qc:       { label: "QC · TRIM",    sub: "Q30 filtering",    duration: 2600 },
  align:    { label: "ALIGN",        sub: "BWA · reference",  duration: 2800 },
  call:     { label: "VARIANT CALL", sub: "GATK · HC",        duration: 2800 },
  annotate: { label: "ANNOTATE",     sub: "p.V600E · BRAF",   duration: 3000 },
};

// Reads — six lanes. Each row has a start x and a length.
const READS: Array<{ x: number; w: number; quality: "high" | "low" }> = [
  { x: 28,  w: 36, quality: "high" },
  { x: 44,  w: 30, quality: "low"  },
  { x: 32,  w: 40, quality: "high" },
  { x: 50,  w: 34, quality: "high" },
  { x: 26,  w: 32, quality: "low"  },
  { x: 56,  w: 28, quality: "high" },
];

interface Props {
  size?: number;
  className?: string;
}

export function BioinformaticsPipeline({ size = 200, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  // After QC, low-quality reads either get trimmed (shorter w) or
  // greyed out. After ALIGN, all reads snap to align under a
  // reference line. After CALL, the variant column highlights.
  const aligned = stage === "align" || stage === "call" || stage === "annotate";
  const trimmed = stage === "qc" || aligned;
  const showRefLine = aligned;
  const showVariant = stage === "call" || stage === "annotate";
  const showAnnotation = stage === "annotate";

  // Reference line y.
  const REF_Y = 36;
  // Variant locus x.
  const VAR_X = 110;

  return (
    <div className={className}>
      <svg
        width={size}
        height={size * (170 / 200)}
        viewBox="0 0 200 170"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        role="img"
        aria-label={`Bioinformatics pipeline — ${info.label}`}
      >
        {/* ── Reference line + tick marks (visible at ALIGN+) */}
        <g
          opacity={showRefLine ? 0.7 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}
        >
          <line x1="18" y1={REF_Y} x2="186" y2={REF_Y} />
          {/* ticks every 8px */}
          {Array.from({ length: 22 }).map((_, i) => (
            <line
              key={i}
              x1={18 + i * 8} y1={REF_Y - 2}
              x2={18 + i * 8} y2={REF_Y + 2}
              strokeWidth="0.7"
              opacity="0.5"
            />
          ))}
          <text
            x="18" y={REF_Y - 6}
            fontSize="5.2"
            fill="currentColor" stroke="none"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            opacity="0.6"
          >
            ref · chr7
          </text>
        </g>

        {/* ── Reads — each row is a small bar. */}
        <g>
          {READS.map((r, i) => {
            // Vertical positions.
            // Before align: each read sits in its own row.
            // After align: reads stack as a pileup over the variant
            // locus VAR_X, centered above REF_Y.
            const preY = 56 + i * 8;
            const postY = REF_Y - 8 - i * 4;
            const y = aligned ? postY : preY;
            // Width: low-quality reads get trimmed after QC.
            const isLow = r.quality === "low";
            const w = isLow && trimmed ? r.w * 0.55 : r.w;
            // Align x: pileup column centered at VAR_X.
            const x = aligned ? VAR_X - w / 2 : r.x;
            // Opacity dim for low-quality during QC (but not after align since they got trimmed).
            const opacity = isLow && stage === "qc" ? 0.4 : 0.85;

            return (
              <g
                key={`r-${i}`}
                style={{
                  transition:
                    noTransition ??
                    "transform 900ms cubic-bezier(.5,.1,.4,1), opacity 500ms ease",
                }}
              >
                <rect
                  x={x} y={y - 2}
                  width={w} height="4"
                  rx="1"
                  stroke="currentColor" strokeWidth="0.9"
                  fill="currentColor" fillOpacity="0.18"
                  opacity={opacity}
                  style={{ transition: noTransition ?? "x 900ms cubic-bezier(.5,.1,.4,1), y 900ms cubic-bezier(.5,.1,.4,1), width 500ms ease, opacity 500ms ease" }}
                />
                {/* Trim marks for low-quality reads during QC. */}
                {isLow && trimmed && (
                  <line
                    x1={x + w + 1} y1={y - 3}
                    x2={x + w + 3} y2={y + 3}
                    strokeWidth="0.8" opacity="0.6"
                  />
                )}
              </g>
            );
          })}
        </g>

        {/* ── Variant call column — vertical pile spike + arrow. */}
        <g
          opacity={showVariant ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}
        >
          <line
            x1={VAR_X} y1={REF_Y - 18}
            x2={VAR_X} y2={REF_Y - 26}
            strokeWidth="1.4"
            stroke="#fbbf24"
          />
          <path
            d={`M ${VAR_X - 3} ${REF_Y - 24} L ${VAR_X} ${REF_Y - 28} L ${VAR_X + 3} ${REF_Y - 24}`}
            stroke="#fbbf24" strokeWidth="1.4" fill="none"
          />
          {/* A small "T" letter at the variant locus on the reference */}
          <text
            x={VAR_X} y={REF_Y + 8}
            fontSize="5.4"
            textAnchor="middle"
            fill="#fbbf24" stroke="none"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            fontWeight="700"
          >
            T
          </text>
        </g>

        {/* ── Annotation lozenge — appears above the variant arrow. */}
        <g
          opacity={showAnnotation ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 600ms ease" }}
        >
          <rect
            x={VAR_X - 22} y="2" width="44" height="10" rx="5"
            stroke="#fbbf24" strokeWidth="1.1"
            fill="#fbbf24" fillOpacity="0.16"
          />
          <text
            x={VAR_X} y="9"
            textAnchor="middle"
            fontSize="5.8"
            fill="#fbbf24" stroke="none"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            letterSpacing="0.4"
            fontWeight="700"
          >
            p.V600E
          </text>
        </g>

        {/* ── Stage label */}
        <g
          fill="currentColor" stroke="none"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        >
          <text x="100" y="138" textAnchor="middle" fontSize="7" fontWeight="700" letterSpacing="1.3">
            {info.label}
          </text>
          <text x="100" y="150" textAnchor="middle" fontSize="5.8" opacity="0.55" letterSpacing="0.4">
            {info.sub}
          </text>
        </g>

        {/* ── Stage dots */}
        <g
          transform="translate(76 162)"
          role="progressbar"
          aria-label={`Cycle stage ${stageIdx + 1} of ${STAGES.length}: ${info.label}`}
          aria-valuenow={stageIdx + 1}
          aria-valuemin={1}
          aria-valuemax={STAGES.length}
        >
          {STAGES.map((_, i) => (
            <circle
              key={i}
              cx={i * 12}
              cy={0}
              r="1.6"
              fill={i === stageIdx ? "#86efac" : "currentColor"}
              opacity={i === stageIdx ? 1 : 0.3}
              stroke="none"
              style={{ transition: noTransition ?? "opacity 300ms ease, fill 300ms ease" }}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
