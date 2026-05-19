"use client";

/**
 * CryoEMStructure — four-stage looping animation of single-particle
 * cryo-EM. Particles are picked from a micrograph, 2D classes
 * emerge, a 3D map is reconstructed, then atomic model fits in.
 *
 * Stages:
 *   1. MICROGRAPH — speckled field of particle dots
 *   2. 2D         — a small grid of 2D class averages appears
 *   3. 3D MAP     — a contoured volumetric blob appears
 *   4. MODEL      — helices fit into the 3D map
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["micrograph", "twod", "threed", "model"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  micrograph: { label: "MICROGRAPH",     sub: "particle picking",     duration: 2600 },
  twod:       { label: "2D CLASSES",     sub: "RELION · CryoSPARC",   duration: 2800 },
  threed:     { label: "3D MAP",         sub: "2.8 Å resolution",     duration: 2800 },
  model:      { label: "ATOMIC MODEL",   sub: "real-space refined",   duration: 3000 },
};

const PARTICLES = Array.from({ length: 18 }).map((_, i) => ({
  x: 20 + ((i * 41) % 120),
  y: 30 + Math.floor(i / 5) * 12 + ((i * 7) % 6),
}));

interface Props { size?: number; className?: string; }

export function CryoEMStructure({ size = 180, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  return (
    <div className={className}>
      <svg width={size} height={size * (170 / 180)} viewBox="0 0 180 170" fill="none" stroke="currentColor"
        strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round"
        role="img" aria-label={`Cryo-EM structure — ${info.label}`}>
        {/* Micrograph particles */}
        <g opacity={stage === "micrograph" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <rect x="16" y="20" width="148" height="80" rx="2" strokeWidth="0.6" opacity="0.55" />
          {PARTICLES.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="2" fill="currentColor" stroke="none" opacity="0.7" />
              {/* small box around particle */}
              <rect x={p.x - 4} y={p.y - 4} width="8" height="8" stroke-width="0.45" opacity="0.35" />
            </g>
          ))}
        </g>

        {/* 2D class averages */}
        <g opacity={stage === "twod" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          {[0, 1, 2, 3].map((c) => (
            [0, 1, 2].map((r) => (
              <g key={`${c}-${r}`} transform={`translate(${30 + c * 30} ${28 + r * 26})`}>
                <rect x="0" y="0" width="22" height="20" rx="1" stroke-width="0.55" />
                {/* Pseudo-class — radial spokes */}
                <circle cx="11" cy="10" r="6" fill="currentColor" fillOpacity="0.18" stroke-width="0.55" />
                {Array.from({ length: 6 }).map((_, k) => {
                  const a = (k / 6) * Math.PI * 2;
                  return <line key={k} x1={11 + Math.cos(a) * 3} y1={10 + Math.sin(a) * 3}
                    x2={11 + Math.cos(a) * 6} y2={10 + Math.sin(a) * 6} stroke-width="0.55" opacity="0.65" />;
                })}
              </g>
            ))
          ))}
        </g>

        {/* 3D map — concentric contoured shape */}
        <g opacity={stage === "threed" || stage === "model" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}
          transform="translate(90 60)">
          <path d="M -20 0 Q -22 -18, 0 -22 Q 22 -18, 22 0 Q 22 18, 0 22 Q -22 18, -22 0 Z" stroke-width="0.7" fill="currentColor" fillOpacity="0.12" />
          <path d="M -16 0 Q -18 -14, 0 -16 Q 18 -14, 18 0 Q 18 14, 0 16 Q -18 14, -18 0 Z" stroke-width="0.6" opacity="0.7" />
          <path d="M -10 0 Q -10 -8, 0 -8 Q 10 -8, 10 0 Q 10 8, 0 8 Q -10 8, -10 0 Z" stroke-width="0.5" opacity="0.55" />
        </g>

        {/* Atomic model fitting — helices */}
        <g opacity={stage === "model" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}
          transform="translate(90 60)">
          {/* Helix 1 — slanted cylinder with curls */}
          <g>
            {Array.from({ length: 8 }).map((_, k) => (
              <ellipse key={k} cx={-10 + k * 2.5} cy={-10 + k * 2.5} rx="2.4" ry="1.2" stroke="#86efac" strokeWidth="0.7" />
            ))}
          </g>
          {/* Helix 2 */}
          <g>
            {Array.from({ length: 8 }).map((_, k) => (
              <ellipse key={k} cx={10 - k * 2.4} cy={-10 + k * 2.4} rx="2.4" ry="1.2" stroke="#86efac" strokeWidth="0.7" />
            ))}
          </g>
        </g>

        {/* Resolution chip */}
        <g opacity={stage === "threed" || stage === "model" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <rect x="124" y="22" width="38" height="10" rx="5" stroke-width="0.75" />
          <text x="143" y="29" textAnchor="middle" fontSize="5.4" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" letterSpacing="0.4">2.8 Å</text>
        </g>

        <g fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
          <text x="90" y="130" textAnchor="middle" fontSize="6.8" fontWeight="700" letterSpacing="1.3">{info.label}</text>
          <text x="90" y="142" textAnchor="middle" fontSize="5.6" opacity="0.55" letterSpacing="0.4">{info.sub}</text>
        </g>
        <g transform="translate(72 156)" role="progressbar"
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
