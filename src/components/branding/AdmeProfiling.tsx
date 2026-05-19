"use client";

/**
 * AdmeProfiling — four-stage looping animation of an ADME panel
 * (solubility, microsomal stability, permeability, DDI) run on a
 * compound. A small dashboard fills row-by-row with checks.
 *
 * Stages:
 *   1. SOLUBILITY    — solubility row gauge fills
 *   2. MICROSOMAL    — stability bar fills (red if low CLint)
 *   3. PERMEABILITY  — Caco-2 Papp value chips
 *   4. DDI           — CYP inhibition heatmap colors in
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["sol", "mlm", "perm", "ddi"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  sol:  { label: "SOLUBILITY",    sub: "kinetic · pH 7.4",      duration: 2400 },
  mlm:  { label: "MICROSOMAL",    sub: "human + rat",           duration: 2600 },
  perm: { label: "PERMEABILITY",  sub: "Caco-2 · A→B",          duration: 2800 },
  ddi:  { label: "DDI · CYP",     sub: "3A4 · 2D6 · others",    duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function AdmeProfiling({ size = 180, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  return (
    <div className={className}>
      <svg width={size} height={size * (170 / 180)} viewBox="0 0 180 170" fill="none" stroke="currentColor"
        strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round"
        role="img" aria-label={`ADME profiling — ${info.label}`}>
        {/* Compound chip on the left */}
        <g>
          <rect x="20" y="22" width="34" height="18" rx="3" />
          <text x="37" y="34" textAnchor="middle" fontSize="5" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" letterSpacing="0.4">CMPD-118</text>
        </g>

        {/* Rows */}
        {[
          { y: 22, label: "SOL",  stages: ["sol", "mlm", "perm", "ddi"], color: "#86efac", value: "112 µM" },
          { y: 40, label: "MLM",  stages: ["mlm", "perm", "ddi"],         color: "#fbbf24", value: "CLint 42" },
          { y: 58, label: "Papp", stages: ["perm", "ddi"],                color: "#7dd3fc", value: "18 ×10⁻⁶" },
          { y: 76, label: "CYP",  stages: ["ddi"],                        color: "#fb7185", value: "no 3A4" },
        ].map((row, ri) => {
          const visible = row.stages.includes(stage);
          return (
            <g key={ri} opacity={visible ? 1 : 0.25}
              style={{ transition: noTransition ?? "opacity 500ms ease" }}>
              {/* Row label */}
              <text x="60" y={row.y + 12} fontSize="5" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" letterSpacing="0.4">{row.label}</text>
              {/* Bar */}
              <rect x="82" y={row.y + 5} width="60" height="6" rx="2" stroke-width="0.55" opacity="0.55" />
              {visible && (
                <rect x="82" y={row.y + 5} width={ri === 3 ? 12 : 38 + ri * 4} height="6" rx="2" fill={row.color} fillOpacity="0.55" stroke="none" />
              )}
              {/* Value chip */}
              <text x="146" y={row.y + 11} fontSize="4.6" fill={row.color} stroke="none" fontFamily="ui-monospace,monospace" letterSpacing="0.3">{visible ? row.value : ""}</text>
            </g>
          );
        })}

        {/* DDI heatmap */}
        <g opacity={stage === "ddi" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <text x="60" y="106" fontSize="4.6" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.65">CYP panel</text>
          {[
            { x: 82,  c: "#86efac" }, { x: 94, c: "#86efac" },
            { x: 106, c: "#fbbf24" }, { x: 118, c: "#86efac" },
            { x: 130, c: "#fb7185" }, { x: 142, c: "#86efac" },
          ].map((b, i) => (
            <rect key={i} x={b.x} y="100" width="10" height="8" fill={b.c} fillOpacity="0.7" stroke="none" />
          ))}
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
