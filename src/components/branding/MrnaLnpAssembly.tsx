"use client";

/**
 * MrnaLnpAssembly — four-stage looping animation of mRNA-LNP
 * (lipid nanoparticle) drug substance assembly. A linear mRNA
 * sequence is capped, then encapsulated in a lipid bilayer via
 * a microfluidic mix step.
 *
 * Stages:
 *   1. IVT      — linear mRNA emerges from a polymerase region
 *   2. CAP      — 5' cap appears at the leading end
 *   3. MIX      — mRNA + lipid streams converge in a T-junction
 *   4. LNP      — finished LNP sphere with mRNA payload inside
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["ivt", "cap", "mix", "lnp"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  ivt: { label: "IVT",          sub: "T7 polymerase",   duration: 2400 },
  cap: { label: "5' CAP",       sub: "m⁷G · methylated", duration: 2400 },
  mix: { label: "MICROFLUIDIC", sub: "T-junction · 4:1", duration: 2800 },
  lnp: { label: "LNP",          sub: "PDI < 0.2 · 80 nm", duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function MrnaLnpAssembly({ size = 180, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  const showCap = stage === "cap" || stage === "mix" || stage === "lnp";
  const showMixStream = stage === "mix";
  const showLnp = stage === "lnp";

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
        aria-label={`mRNA-LNP assembly — ${info.label}`}
      >
        {/* IVT region — a "polymerase" lobe with mRNA emerging */}
        <g
          opacity={stage === "ivt" || stage === "cap" ? 1 : 0.25}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}
        >
          <ellipse cx="36" cy="56" rx="14" ry="11" />
          <text
            x="36" y="58.5"
            fontSize="5" textAnchor="middle"
            fill="currentColor" stroke="none"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            opacity="0.7"
          >T7</text>
        </g>

        {/* mRNA strand — wavy line drawn rightward from the polymerase */}
        <g
          opacity={showLnp ? 0 : 1}
          style={{ transition: noTransition ?? "opacity 600ms ease" }}
        >
          <path
            d="M 50 56 Q 60 50, 70 56 T 90 56 T 110 56 T 130 56 T 150 56"
            strokeWidth="0.85"
          />
          {/* poly-A tail dots */}
          {[156, 162, 168].map((x, i) => (
            <circle key={x} cx={x} cy="56" r="1.0" fill="currentColor" stroke="none" opacity={0.55 - i * 0.15} />
          ))}

          {/* 5' cap — appears at the leading end (which is the LEFT side: x=50). */}
          <g
            opacity={showCap ? 1 : 0}
            style={{ transition: noTransition ?? "opacity 500ms ease" }}
          >
            <circle cx="50" cy="56" r="2.6" fill="#86efac" fillOpacity="0.55" stroke="#86efac" strokeWidth="0.7" />
            <text
              x="50" y="48"
              fontSize="4.4" textAnchor="middle"
              fill="#86efac" stroke="none"
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            >m⁷G</text>
          </g>
        </g>

        {/* Microfluidic T-junction — appears at MIX. Two streams (lipid + mRNA) merge. */}
        <g
          opacity={showMixStream ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}
        >
          {/* Lipid stream channel (top) */}
          <line x1="60" y1="86" x2="100" y2="86" strokeWidth="0.55" strokeDasharray="2 2" />
          <text x="60" y="82" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.7">lipid (EtOH)</text>
          {/* mRNA stream channel (bottom — but redirected for visual) */}
          <line x1="60" y1="98" x2="100" y2="98" strokeWidth="0.55" strokeDasharray="2 2" />
          <text x="60" y="108" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.7">mRNA (aq)</text>
          {/* Merge */}
          <line x1="100" y1="86" x2="120" y2="92" strokeWidth="0.55" strokeDasharray="2 2" />
          <line x1="100" y1="98" x2="120" y2="92" strokeWidth="0.55" strokeDasharray="2 2" />
          <line x1="120" y1="92" x2="150" y2="92" strokeWidth="0.55" />
          <circle cx="138" cy="92" r="1.2" fill="#86efac" stroke="none" />
        </g>

        {/* Finished LNP — sphere with concentric bilayer + mRNA inside */}
        <g
          opacity={showLnp ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 600ms ease" }}
        >
          <circle cx="90" cy="56" r="22" stroke="currentColor" strokeWidth="0.95" />
          <circle cx="90" cy="56" r="17" stroke="currentColor" strokeWidth="0.55" strokeDasharray="2 1.6" opacity="0.65" />
          {/* lipid headgroups around outer */}
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i / 12) * Math.PI * 2;
            const x = 90 + Math.cos(a) * 22;
            const y = 56 + Math.sin(a) * 22;
            return <circle key={i} cx={x} cy={y} r="1.1" fill="currentColor" stroke="none" opacity="0.55" />;
          })}
          {/* mRNA cargo inside — figure-eight */}
          <path
            d="M 80 52 Q 84 46, 90 50 T 100 52 Q 96 60, 90 58 T 80 56 Z"
            strokeWidth="0.7"
            fill="none"
            opacity="0.85"
          />
          <circle cx="80" cy="52" r="1.6" fill="#86efac" stroke="none" />
        </g>

        {/* Stage label */}
        <g fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
          <text x="90" y="138" textAnchor="middle" fontSize="6.8" fontWeight="700" letterSpacing="1.3">{info.label}</text>
          <text x="90" y="150" textAnchor="middle" fontSize="5.6" opacity="0.55" letterSpacing="0.4">{info.sub}</text>
        </g>

        <g
          transform="translate(72 162)"
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
