"use client";

/**
 * RadiologyImagingBiomarker — four-stage looping animation of an
 * imaging biomarker workflow. A scan is acquired, a lesion is
 * segmented, a quantitative metric (RECIST sum) is computed, and
 * the value is reported.
 *
 * Stages:
 *   1. ACQUIRE   — body-outline placeholder with a "scan window"
 *   2. SEGMENT   — a lesion contour appears inside the scan
 *   3. MEASURE   — a diameter line + tick marks across the lesion
 *   4. REPORT    — a small report panel with RECIST sum chip
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["acquire", "segment", "measure", "report"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  acquire: { label: "CT · ACQUIRE",   sub: "thorax · contrast",       duration: 2400 },
  segment: { label: "SEGMENT",        sub: "auto · radiologist QC",  duration: 2600 },
  measure: { label: "MEASURE · LD",   sub: "longest diameter",       duration: 2400 },
  report:  { label: "REPORT · RECIST", sub: "Σ LDs = 84 mm · -22%",   duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function RadiologyImagingBiomarker({ size = 180, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  return (
    <div className={className}>
      <svg width={size} height={size * (170 / 180)} viewBox="0 0 180 170" fill="none" stroke="currentColor"
        strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round"
        role="img" aria-label={`Imaging biomarker — ${info.label}`}>
        {/* Scan frame */}
        <rect x="22" y="20" width="100" height="84" rx="3" stroke-width="0.85" />
        {/* Corner ticks */}
        {[
          { x: 22, y: 20 }, { x: 122, y: 20 }, { x: 22, y: 104 }, { x: 122, y: 104 },
        ].map((c, i) => (
          <g key={i}>
            <line x1={c.x} y1={c.y} x2={c.x + (i % 2 === 0 ? 6 : -6)} y2={c.y} strokeWidth="0.55" opacity="0.6" />
            <line x1={c.x} y1={c.y} x2={c.x} y2={c.y + (i < 2 ? 6 : -6)} strokeWidth="0.55" opacity="0.6" />
          </g>
        ))}
        {/* Body silhouette */}
        <ellipse cx="72" cy="62" rx="42" ry="32" stroke-width="0.65" opacity="0.65" />
        {/* Ribcage hints */}
        <path d="M 40 50 Q 72 36, 104 50" strokeWidth="0.5" opacity="0.45" />
        <path d="M 40 76 Q 72 90, 104 76" strokeWidth="0.5" opacity="0.45" />
        <text x="22" y="14" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.65" letterSpacing="0.3">SLICE 087</text>

        {/* Lesion outline */}
        <g opacity={stage === "segment" || stage === "measure" || stage === "report" ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <path d="M 64 56 Q 60 50, 70 48 Q 82 50, 84 60 Q 80 70, 72 70 Q 62 68, 64 56 Z"
            stroke="#fbbf24" strokeWidth="1" strokeDasharray="2 1.5" fill="#fbbf24" fillOpacity="0.18" />
        </g>

        {/* Measurement diameter line */}
        <g opacity={stage === "measure" || stage === "report" ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <line x1="60" y1="58" x2="86" y2="62" stroke="#86efac" strokeWidth="0.95" />
          <line x1="60" y1="55" x2="60" y2="61" strokeWidth="0.7" stroke="#86efac" />
          <line x1="86" y1="59" x2="86" y2="65" strokeWidth="0.7" stroke="#86efac" />
          <text x="73" y="50" textAnchor="middle" fontSize="4.6" fill="#86efac" stroke="none" fontFamily="ui-monospace,monospace" letterSpacing="0.3">28 mm</text>
        </g>

        {/* Report panel — visible at REPORT */}
        <g opacity={stage === "report" ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <rect x="130" y="22" width="40" height="80" rx="2" />
          <line x1="134" y1="30" x2="166" y2="30" strokeWidth="0.55" opacity="0.55" />
          <text x="134" y="30" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.7">RECIST</text>
          {/* Sum of LDs */}
          <text x="150" y="46" textAnchor="middle" fontSize="5.6" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" fontWeight="700">84 mm</text>
          <text x="150" y="54" textAnchor="middle" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.65">Σ LDs</text>
          {/* Delta chip */}
          <rect x="138" y="62" width="24" height="10" rx="5" fill="#86efac" fillOpacity="0.2" stroke="#86efac" strokeWidth="0.7" />
          <text x="150" y="69" textAnchor="middle" fontSize="5" fill="#86efac" stroke="none" fontFamily="ui-monospace,monospace" fontWeight="700">-22%</text>
          {/* Response chip */}
          <rect x="134" y="80" width="32" height="10" rx="5" stroke-width="0.55" opacity="0.55" />
          <text x="150" y="87" textAnchor="middle" fontSize="4.6" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.85">PR · part. resp</text>
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
