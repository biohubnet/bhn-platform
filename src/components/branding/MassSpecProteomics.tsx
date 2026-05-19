"use client";

/**
 * MassSpecProteomics — four-stage looping animation of LC-MS/MS
 * proteomics. A protein is digested, peptides separate on a column,
 * a mass spectrum is recorded, and peptide IDs annotate.
 *
 * Stages:
 *   1. DIGEST    — protein chain → trypsin-cut peptide fragments
 *   2. LC        — peptides resolve down a capillary column
 *   3. MS        — peaks appear on a mass spectrum
 *   4. ID        — top peaks get peptide labels
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["digest", "lc", "ms", "id"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  digest: { label: "TRYPSIN DIGEST", sub: "cleave K/R",            duration: 2600 },
  lc:     { label: "LC SEPARATION",  sub: "C18 · 90 min gradient", duration: 2800 },
  ms:     { label: "MS/MS",          sub: "Orbitrap · HCD",        duration: 2800 },
  id:     { label: "PEPTIDE ID",     sub: "Mascot · 1% FDR",       duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function MassSpecProteomics({ size = 180, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  const showProtein = stage === "digest";
  const showLc = stage === "lc";
  const showMs = stage === "ms" || stage === "id";
  const showLabels = stage === "id";

  return (
    <div className={className}>
      <svg width={size} height={size * (170 / 180)} viewBox="0 0 180 170" fill="none" stroke="currentColor"
        strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round"
        role="img" aria-label={`Mass spec proteomics — ${info.label}`}>
        {/* Protein digestion */}
        <g opacity={showProtein ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          {/* Protein backbone with K/R cut sites */}
          <path d="M 20 56 Q 32 50, 44 56 T 68 56 T 92 56 T 116 56 T 140 56 T 160 56" strokeWidth="0.9" />
          {[44, 68, 92, 116, 140].map((x) => (
            <g key={x}>
              <line x1={x} y1={48} x2={x} y2={64} strokeWidth="0.6" strokeDasharray="1.5 1.5" stroke="#fb7185" />
            </g>
          ))}
          {/* Peptide chunks below the cut */}
          {[
            { x1: 22, x2: 42 }, { x1: 46, x2: 66 }, { x1: 70, x2: 90 },
            { x1: 94, x2: 114 }, { x1: 118, x2: 138 }, { x1: 142, x2: 160 },
          ].map((p, i) => (
            <line key={i} x1={p.x1} y1={82 + i % 2 * 8} x2={p.x2} y2={82 + i % 2 * 8} strokeWidth="1.05" />
          ))}
          <text x="20" y="44" fontSize="4.6" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.65">protein</text>
        </g>

        {/* LC column with bands separating down */}
        <g opacity={showLc ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <rect x="80" y="22" width="20" height="80" rx="2" />
          {/* Bands at different positions to show separation */}
          {[
            { y: 28, c: "#7dd3fc" },
            { y: 42, c: "#86efac" },
            { y: 60, c: "#fbbf24" },
            { y: 82, c: "#f0abfc" },
          ].map((b, i) => (
            <rect key={i} x="82" y={b.y} width="16" height="4" rx="1" fill={b.c} fillOpacity="0.55" stroke="none" />
          ))}
          {/* Bottom drip into mass spec */}
          <line x1="90" y1="102" x2="90" y2="114" strokeWidth="0.85" />
          <path d="M 86 114 L 94 114 L 90 124 Z" strokeWidth="0.7" />
          <text x="60" y="50" fontSize="4.6" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.65">LC</text>
        </g>

        {/* Mass spectrum */}
        <g opacity={showMs ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <line x1="24" y1="100" x2="156" y2="100" strokeWidth="0.55" opacity="0.6" />
          <line x1="24" y1="100" x2="24" y2="26" strokeWidth="0.55" opacity="0.6" />
          <text x="156" y="110" fontSize="4.4" textAnchor="end" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.6">m/z</text>
          <text x="20" y="30" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.6" textAnchor="end">I</text>
          {[
            { x: 36,  h: 12, label: "" },
            { x: 50,  h: 28, label: "GLN" },
            { x: 62,  h: 18, label: "" },
            { x: 76,  h: 46, label: "ELT" },
            { x: 88,  h: 10, label: "" },
            { x: 100, h: 38, label: "AAR" },
            { x: 116, h: 22, label: "" },
            { x: 130, h: 56, label: "VPK" },
            { x: 146, h: 16, label: "" },
          ].map((p, i) => (
            <g key={i}>
              <line x1={p.x} y1="100" x2={p.x} y2={100 - p.h} strokeWidth="0.95" />
              {p.label && showLabels && (
                <text x={p.x} y={100 - p.h - 4} fontSize="4.2" textAnchor="middle" fill="#86efac" stroke="none" fontFamily="ui-monospace,monospace">{p.label}</text>
              )}
            </g>
          ))}
        </g>

        <g fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
          <text x="90" y="132" textAnchor="middle" fontSize="6.8" fontWeight="700" letterSpacing="1.3">{info.label}</text>
          <text x="90" y="144" textAnchor="middle" fontSize="5.6" opacity="0.55" letterSpacing="0.4">{info.sub}</text>
        </g>
        <g transform="translate(72 158)" role="progressbar"
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
