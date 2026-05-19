"use client";

/**
 * HplcAnalyticalRun — four-stage looping animation of an
 * analytical HPLC run for QC release. A sample is injected, runs
 * down the column under gradient elution, peaks emerge on the
 * detector trace, and the chromatogram is integrated.
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["inject", "elute", "detect", "integrate"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  inject:    { label: "INJECT",       sub: "20 µL · autosampler",      duration: 2400 },
  elute:     { label: "GRADIENT",     sub: "5 → 95 % MeCN · 30 min",   duration: 2600 },
  detect:    { label: "UV · 280 nm",  sub: "PDA detector",             duration: 2800 },
  integrate: { label: "INTEGRATE",    sub: "% area · purity 99.4 %",   duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function HplcAnalyticalRun({ size = 180, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  const TRACE_LEN = 220;
  const traceOffset =
    stage === "inject" ? TRACE_LEN :
    stage === "elute"  ? TRACE_LEN * 0.55 :
    /* detect / integrate */ 0;

  const showIntegrate = stage === "integrate";

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
        aria-label={`HPLC analytical — ${info.label}`}
      >
        {/* Autosampler vial */}
        <g>
          <rect x="18" y="34" width="10" height="22" rx="1" />
          <rect x="17" y="30" width="12" height="4" rx="1" strokeWidth="0.6" />
          <text x="23" y="68" textAnchor="middle" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.6">AS-7</text>
        </g>

        {/* Column */}
        <rect x="40" y="32" width="22" height="60" rx="2" />
        <line x1="40" y1="38" x2="62" y2="38" strokeWidth="0.5" strokeDasharray="2 1.5" opacity="0.6" />
        <line x1="40" y1="86" x2="62" y2="86" strokeWidth="0.5" strokeDasharray="2 1.5" opacity="0.6" />
        {/* Resin lines */}
        <g opacity="0.3">
          {[44, 50, 56].map((x) => (
            <line key={x} x1={x} y1="40" x2={x} y2="84" strokeWidth="0.5" />
          ))}
        </g>

        {/* Injected band traveling through column */}
        <rect
          x="42"
          y={stage === "inject" ? 38 : stage === "elute" ? 60 : 86}
          width="18"
          height="4"
          fill="#86efac"
          fillOpacity={stage === "integrate" ? 0.4 : 0.85}
          stroke="none"
          style={{ transition: noTransition ?? "y 1100ms cubic-bezier(.5,.1,.4,1), opacity 600ms ease" }}
        />

        {/* Detector */}
        <g opacity={stage === "detect" || stage === "integrate" ? 1 : 0.4} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <rect x="68" y="58" width="14" height="12" rx="2" strokeWidth="0.7" />
          <text x="75" y="66" textAnchor="middle" fontSize="3.6" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.7">UV</text>
        </g>

        {/* Plot axes */}
        <g opacity="0.6">
          <line x1="90" y1="104" x2="170" y2="104" strokeWidth="0.55" />
          <line x1="90" y1="104" x2="90" y2="34" strokeWidth="0.55" />
          <text x="90" y="28" textAnchor="middle" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.65">mAU</text>
          <text x="170" y="114" textAnchor="end" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.65">RT (min)</text>
        </g>

        {/* Chromatogram trace */}
        <path
          d="M 90 102 L 100 102 L 108 100 L 116 92 L 122 70 L 128 42 L 134 36 L 140 42 L 146 72 L 152 96 L 162 102 L 170 102"
          stroke="currentColor"
          strokeWidth="1"
          fill="none"
          strokeDasharray={TRACE_LEN}
          strokeDashoffset={traceOffset}
          style={{ transition: noTransition ?? "stroke-dashoffset 1100ms cubic-bezier(.4,.1,.4,1)" }}
        />

        {/* Integration shading + label */}
        <g opacity={showIntegrate ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <path d="M 122 102 L 122 70 L 128 42 L 134 36 L 140 42 L 146 72 L 146 102 Z" fill="#86efac" fillOpacity="0.18" stroke="none" />
          <text x="134" y="32" textAnchor="middle" fontSize="4.4" fill="#86efac" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" letterSpacing="0.4">99.4 % main</text>
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
