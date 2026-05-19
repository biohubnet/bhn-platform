"use client";

/**
 * MolecularDocking — four-stage looping animation of computational
 * docking. A target binding pocket sits on the left; a ligand
 * approaches, samples poses, and one pose locks into place.
 *
 * Stages:
 *   1. POCKET   — protein binding pocket sketched, ligand off-screen
 *   2. POSES    — multiple translucent ligand "pose ghosts" overlap
 *                 around the pocket
 *   3. SCORE    — a small score bar appears; one pose brightens
 *   4. BIND     — the winning pose locks in solid + a Kd label appears
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["pocket", "poses", "score", "bind"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  pocket: { label: "POCKET",       sub: "protein prep",       duration: 2400 },
  poses:  { label: "POSE SAMPLING", sub: "Glide · 100 poses", duration: 2800 },
  score:  { label: "SCORE",         sub: "MM-GBSA",           duration: 2600 },
  bind:   { label: "BIND POSE",     sub: "Kd ≈ 4 nM",         duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function MolecularDocking({ size = 180, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];
  const showPoses = stage === "poses" || stage === "score";
  const showScore = stage === "score" || stage === "bind";
  const showBind = stage === "bind";

  return (
    <div className={className}>
      <svg width={size} height={size * (170 / 180)} viewBox="0 0 180 170" fill="none" stroke="currentColor"
        strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round"
        role="img" aria-label={`Molecular docking — ${info.label}`}>
        {/* Protein pocket — cupped shape with two helix accents */}
        <path d="M 28 56 Q 22 90, 50 96 Q 84 98, 96 82 Q 102 68, 96 54 Q 84 40, 56 42 Q 36 44, 28 56 Z"
          fill="currentColor" fillOpacity="0.06" />
        {/* Pocket cavity */}
        <path d="M 56 60 Q 50 80, 72 84 Q 86 84, 88 70 Q 86 58, 72 56 Q 58 56, 56 60 Z"
          fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="0.7" strokeDasharray="2 1.5" opacity="0.7" />
        {/* Two helix barrels (hint) */}
        <ellipse cx="40" cy="70" rx="3.5" ry="9" stroke-width="0.6" opacity="0.55" />
        <ellipse cx="98" cy="70" rx="3.5" ry="9" stroke-width="0.6" opacity="0.55" />

        {/* Pose ghosts — multiple translucent ligands around the pocket */}
        <g opacity={showPoses ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          {[
            { x: 70, y: 68, op: 0.35, r: -10 },
            { x: 74, y: 72, op: 0.45, r: 15 },
            { x: 68, y: 74, op: 0.30, r: 30 },
            { x: 76, y: 66, op: 0.40, r: -22 },
            { x: 72, y: 70, op: 0.55, r: 5  },
          ].map((p, i) => (
            <g key={i} opacity={p.op} transform={`rotate(${p.r} ${p.x} ${p.y})`}>
              <line x1={p.x - 6} y1={p.y} x2={p.x + 6} y2={p.y} strokeWidth="0.7" />
              <circle cx={p.x - 6} cy={p.y} r="1.4" fill="currentColor" stroke="none" />
              <circle cx={p.x + 6} cy={p.y} r="1.4" fill="currentColor" stroke="none" />
              <line x1={p.x} y1={p.y} x2={p.x} y2={p.y - 4} strokeWidth="0.7" />
              <circle cx={p.x} cy={p.y - 4} r="1.2" fill="currentColor" stroke="none" />
            </g>
          ))}
        </g>

        {/* Winning bound ligand — solid */}
        <g opacity={showBind ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }} transform="translate(72 70)">
          <line x1="-6" y1="0" x2="6" y2="0" stroke="#86efac" strokeWidth="1.05" />
          <circle cx="-6" cy="0" r="1.7" fill="#86efac" stroke="none" />
          <circle cx="6" cy="0" r="1.7" fill="#86efac" stroke="none" />
          <line x1="0" y1="0" x2="0" y2="-4" stroke="#86efac" strokeWidth="1.05" />
          <circle cx="0" cy="-4" r="1.5" fill="#86efac" stroke="none" />
        </g>

        {/* Score bar */}
        <g opacity={showScore ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <text x="120" y="50" fontSize="4.6" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.7">score</text>
          {[
            { y: 56, w: 30, top: false },
            { y: 64, w: 38, top: false },
            { y: 72, w: 50, top: true  },
            { y: 80, w: 24, top: false },
            { y: 88, w: 32, top: false },
          ].map((b, i) => (
            <rect key={i} x="120" y={b.y - 2} width={b.w} height="4" rx="1" stroke="currentColor" strokeWidth="0.55"
              fill={b.top ? "#86efac" : "currentColor"} fillOpacity={b.top ? 0.5 : 0.18} />
          ))}
        </g>

        {/* Kd label */}
        <g opacity={showBind ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <text x="142" y="72" textAnchor="middle" fontSize="5" fill="#86efac" stroke="none" fontFamily="ui-monospace,monospace" letterSpacing="0.4">Kd 4 nM</text>
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
