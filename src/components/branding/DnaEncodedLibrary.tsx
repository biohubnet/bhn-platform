"use client";

/**
 * DnaEncodedLibrary — four-stage looping animation of a DNA-encoded
 * library (DEL) screen. A pool of small molecules each tagged with a
 * unique DNA barcode → exposed to immobilised target → unbound
 * molecules wash away → bound molecules amplified and sequenced to
 * identify hits.
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["pool", "bind", "wash", "decode"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  pool:   { label: "POOL",    sub: "10⁹ tagged molecules",  duration: 2400 },
  bind:   { label: "BIND",    sub: "target · immobilised",  duration: 2600 },
  wash:   { label: "WASH",    sub: "non-binders out",       duration: 2400 },
  decode: { label: "DECODE",  sub: "NGS · barcodes → hits", duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function DnaEncodedLibrary({ size = 180, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  // 14 molecule-tag pairs scattered in the well
  const molecules = [
    [38, 58], [54, 50], [70, 60], [86, 52], [102, 64], [118, 54], [134, 60],
    [44, 76], [60, 82], [78, 74], [94, 80], [110, 78], [126, 84], [144, 74],
  ];

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
        aria-label={`DNA-encoded library — ${info.label}`}
      >
        {/* Well */}
        <rect x="22" y="36" width="136" height="64" rx="3" strokeWidth="0.65" />

        {/* Immobilised target band — bottom of well */}
        {(stage === "bind" || stage === "wash" || stage === "decode") && (
          <rect x="24" y="92" width="132" height="6" fill="#fbbf24" fillOpacity="0.25" stroke="#fbbf24" strokeWidth="0.45" />
        )}

        {/* Molecules + DNA tags */}
        {molecules.map(([x, y], i) => {
          const isBinder = i === 2 || i === 9;
          const survives =
            stage === "wash" || stage === "decode" ? isBinder : true;
          const tint =
            stage === "decode" && isBinder ? "#86efac" :
            isBinder && (stage === "bind" || stage === "wash") ? "#86efac" :
            "currentColor";
          return (
            <g key={i} opacity={survives ? 1 : 0.08} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
              <circle cx={x} cy={y} r="2.4" fill={tint} fillOpacity="0.85" stroke="none" />
              {/* DNA tag — wavy line below the molecule */}
              <path d={`M ${x - 4} ${y + 4} q 2 -2 4 0 t 4 0`} stroke={tint} strokeWidth="0.55" fill="none" opacity="0.65" />
            </g>
          );
        })}

        {/* Stage 4 — NGS read-out (top) */}
        <g opacity={stage === "decode" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <text x="158" y="32" textAnchor="end" fontSize="3.6" fill="#86efac" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">ATCG·GTAA·CGTT</text>
        </g>

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
