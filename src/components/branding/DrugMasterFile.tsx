"use client";

/**
 * DrugMasterFile — four-stage looping animation of a Drug Master
 * File submission (BHN Regulatory Affairs · explicitly named).
 * A DMF is compiled, submitted to Health Canada / FDA, referenced
 * by a sponsor's CTA/NDA via Letter of Authorization, and
 * acknowledged with a DMF number.
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["compile", "submit", "loa", "ack"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  compile: { label: "COMPILE DMF",    sub: "Type II · API",         duration: 2600 },
  submit:  { label: "SUBMIT",         sub: "Health Canada · FDA",   duration: 2400 },
  loa:     { label: "LETTER OF AUTH", sub: "sponsor reference",     duration: 2800 },
  ack:     { label: "DMF · ACK",      sub: "number assigned",       duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function DrugMasterFile({ size = 180, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  const showSubmit = stage === "submit" || stage === "loa" || stage === "ack";
  const showLoa = stage === "loa" || stage === "ack";
  const showAck = stage === "ack";

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
        aria-label={`Drug Master File — ${info.label}`}
      >
        {/* Agency target */}
        <g opacity={showSubmit ? 0.6 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <path d="M 138 28 L 148 20 L 158 28" />
          <line x1="148" y1="20" x2="148" y2="36" />
          <text x="148" y="44" textAnchor="middle" fontSize="4.6" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" letterSpacing="0.4">HC / FDA</text>
        </g>

        {/* DMF document */}
        <g style={{ transition: noTransition ?? "transform 600ms cubic-bezier(.4,.1,.4,1)", transform: showSubmit ? "translateY(-6px)" : "translateY(0)" }}>
          <rect x="28" y="48" width="80" height="60" rx="2" />
          <text x="34" y="58" fontSize="4.6" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" letterSpacing="0.5" opacity="0.85">DMF · TYPE II</text>
          <line x1="34" y1="62" x2="100" y2="62" strokeWidth="0.5" opacity="0.55" />
          {[
            { y: 70, lbl: "S.1 General Info" },
            { y: 78, lbl: "S.2 Manufacture" },
            { y: 86, lbl: "S.3 Characterization" },
            { y: 94, lbl: "S.4 Control of DS" },
            { y: 102, lbl: "S.5 Reference Std" },
          ].map((s) => (
            <text key={s.y} x="34" y={s.y} fontSize="3.8" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.7">{s.lbl}</text>
          ))}
        </g>

        {/* LOA letter */}
        <g opacity={showLoa ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <rect x="118" y="58" width="50" height="42" rx="2" />
          <text x="124" y="68" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" letterSpacing="0.5" opacity="0.8">LOA</text>
          <line x1="124" y1="72" x2="162" y2="72" strokeWidth="0.5" opacity="0.55" />
          {[78, 84, 90].map((y) => (
            <line key={y} x1="124" y1={y} x2={158 - (y - 78) * 4} y2={y} strokeWidth="0.5" opacity="0.55" />
          ))}
          <line x1="118" y1="80" x2="108" y2="80" strokeWidth="0.55" strokeDasharray="2 2" opacity="0.6" />
        </g>

        {/* DMF number badge */}
        <g opacity={showAck ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease, transform 600ms cubic-bezier(.4,.1,.4,1)", transform: showAck ? "translateY(0)" : "translateY(6px)" }}>
          <rect x="46" y="116" width="88" height="14" rx="7" stroke="#86efac" strokeWidth="0.95" fill="#86efac" fillOpacity="0.18" />
          <text x="90" y="125" textAnchor="middle" fontSize="5.4" fill="#86efac" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontWeight="700" letterSpacing="0.5">DMF · 034 581</text>
        </g>

        {/* Stage label */}
        <g fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
          <text x="90" y="142" textAnchor="middle" fontSize="6.8" fontWeight="700" letterSpacing="1.3">{info.label}</text>
          <text x="90" y="154" textAnchor="middle" fontSize="5.6" opacity="0.55" letterSpacing="0.4">{info.sub}</text>
        </g>

        <g
          transform="translate(72 166)"
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
