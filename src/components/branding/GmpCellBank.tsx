"use client";

/**
 * GmpCellBank — five-stage looping animation of GMP cell-bank
 * creation. A vial of cells is expanded to a Master Cell Bank
 * (MCB), aliquoted, characterized (sterility / mycoplasma /
 * identity), and Working Cell Banks (WCB) are derived.
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["expand", "aliquot", "freeze", "qc", "wcb"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  expand:  { label: "EXPAND",        sub: "research vial → MCB",  duration: 2600 },
  aliquot: { label: "ALIQUOT · MCB", sub: "100 vials · 1 mL",     duration: 2600 },
  freeze:  { label: "FREEZE",        sub: "controlled-rate · LN₂", duration: 2400 },
  qc:      { label: "QC PANEL",      sub: "ID · myco · steril",   duration: 2800 },
  wcb:     { label: "WCB DERIVED",   sub: "200 vials · ready",    duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function GmpCellBank({ size = 180, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  const showExpand = stage === "expand";
  const showAliquot = stage === "aliquot" || stage === "freeze" || stage === "qc" || stage === "wcb";
  const showFreeze = stage === "freeze" || stage === "qc" || stage === "wcb";
  const showQc = stage === "qc" || stage === "wcb";
  const showWcb = stage === "wcb";

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
        aria-label={`GMP cell bank — ${info.label}`}
      >
        {/* Research vial (left) */}
        <g>
          <rect x="22" y="38" width="10" height="22" rx="1" />
          <rect x="21" y="34" width="12" height="4" rx="1" strokeWidth="0.6" />
          <text x="27" y="72" textAnchor="middle" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.6">PreMCB</text>
        </g>

        {/* Expansion flask → MCB tank */}
        <g opacity={showExpand ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <path d="M 60 38 L 64 38 L 64 52 L 76 78 L 44 78 L 56 52 L 56 38 L 60 38 Z" strokeWidth="0.9" />
          <line x1="50" y1="68" x2="70" y2="68" strokeWidth="0.5" opacity="0.55" />
        </g>

        {/* Aliquot vial rack */}
        <g opacity={showAliquot ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <rect x="56" y="34" width="76" height="50" rx="2" strokeWidth="0.55" opacity="0.55" fill="currentColor" fillOpacity="0.04" />
          {Array.from({ length: 5 }).map((_, c) => (
            Array.from({ length: 4 }).map((_, r) => (
              <g key={`${c}-${r}`}>
                <rect x={60 + c * 14} y={38 + r * 11} width="6" height="9" rx="0.5" strokeWidth="0.5" opacity="0.8" />
              </g>
            ))
          ))}
          <text x="94" y="92" textAnchor="middle" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" letterSpacing="0.4" opacity="0.75">MCB · 20 vials shown of 100</text>
        </g>

        {/* Liquid N2 indicator */}
        <g opacity={showFreeze ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <text x="142" y="40" fontSize="4.6" fill="#7dd3fc" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" letterSpacing="0.4">−196 °C · LN₂</text>
          {Array.from({ length: 5 }).map((_, i) => (
            <circle key={i} cx={140 + i * 4} cy="50" r="0.9" fill="#7dd3fc" stroke="none" opacity={0.4 + i * 0.1} />
          ))}
        </g>

        {/* QC panel chips */}
        <g opacity={showQc ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          {[
            { y: 102, lbl: "ID", color: "#86efac" },
            { y: 102, lbl: "STERILE", color: "#86efac", x: 76 },
            { y: 102, lbl: "MYCO", color: "#86efac", x: 122 },
          ].map((c, i) => {
            const x = c.x ?? 30 + i * 46;
            return (
              <g key={i}>
                <rect x={x} y={c.y - 7} width="36" height="11" rx="5" stroke={c.color} strokeWidth="0.7" fill={c.color} fillOpacity="0.16" />
                <text x={x + 18} y={c.y} textAnchor="middle" fontSize="4.6" fill={c.color} stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" letterSpacing="0.5" fontWeight="700">{c.lbl}</text>
              </g>
            );
          })}
        </g>

        {/* WCB ribbon */}
        <g opacity={showWcb ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <rect x="48" y="34" width="92" height="14" rx="7" stroke="#86efac" strokeWidth="0.95" fill="#86efac" fillOpacity="0.16" />
          <text x="94" y="42" textAnchor="middle" fontSize="5.4" fill="#86efac" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontWeight="700" letterSpacing="0.4">WCB · 200 vials</text>
        </g>

        {/* Stage label */}
        <g fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
          <text x="90" y="132" textAnchor="middle" fontSize="6.8" fontWeight="700" letterSpacing="1.3">{info.label}</text>
          <text x="90" y="144" textAnchor="middle" fontSize="5.6" opacity="0.55" letterSpacing="0.4">{info.sub}</text>
        </g>

        <g
          transform="translate(66 158)"
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
