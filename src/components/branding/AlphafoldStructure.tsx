"use client";

/**
 * AlphafoldStructure — four-stage looping animation of AlphaFold /
 * deep-learning protein structure prediction. Amino-acid sequence
 * input → embedded into a representation matrix → 3D fold emerges →
 * pLDDT confidence map highlights well-modelled vs. uncertain
 * regions.
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["sequence", "embed", "fold", "confidence"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  sequence:   { label: "SEQUENCE",   sub: "200 aa input",       duration: 2400 },
  embed:      { label: "EMBED",      sub: "MSA · pair repr.",   duration: 2600 },
  fold:       { label: "FOLD",       sub: "3D backbone",        duration: 2800 },
  confidence: { label: "CONFIDENCE", sub: "pLDDT · 88 mean",    duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function AlphafoldStructure({ size = 180, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

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
        aria-label={`AlphaFold structure — ${info.label}`}
      >
        {/* Stage 1 — sequence as letter strip */}
        <g opacity={stage === "sequence" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <text x="90" y="68" textAnchor="middle" fontSize="6.5" fill="#7dd3fc" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" letterSpacing="1.2">
            MKVL · GAIT · DQRP · SVKK
          </text>
          <text x="90" y="80" textAnchor="middle" fontSize="6.5" fill="#7dd3fc" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" letterSpacing="1.2" opacity="0.65">
            LEAF · TIVL · GHHE · QAGA
          </text>
        </g>

        {/* Stage 2 — MSA-style matrix */}
        <g opacity={stage === "embed" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          {Array.from({ length: 84 }).map((_, i) => {
            const r = Math.floor(i / 14);
            const c = i % 14;
            const v = (i * 37) % 100 / 100;
            return (
              <rect
                key={i}
                x={36 + c * 8} y={40 + r * 8}
                width="6" height="6"
                fill="#a78bfa" fillOpacity={0.2 + v * 0.6}
                stroke="none"
              />
            );
          })}
        </g>

        {/* Stage 3 — 3D backbone */}
        <g opacity={stage === "fold" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <path d="M 40 90 q 8 -22 22 -14 q 18 8 6 24 q -14 18 6 22 q 22 4 24 -18 q 2 -22 22 -14 q 16 6 20 -10" stroke="#86efac" strokeWidth="1.4" fill="none" />
          {/* Helix coils — small ellipses dotted along the path */}
          {[
            [50, 80], [62, 70], [76, 82], [88, 96], [104, 90],
            [120, 76], [136, 68], [148, 76],
          ].map(([x, y], i) => (
            <ellipse key={i} cx={x} cy={y} rx="3" ry="2" fill="#86efac" fillOpacity="0.6" stroke="none" />
          ))}
        </g>

        {/* Stage 4 — pLDDT confidence heatmap */}
        <g opacity={stage === "confidence" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <path d="M 40 90 q 8 -22 22 -14 q 18 8 6 24 q -14 18 6 22 q 22 4 24 -18 q 2 -22 22 -14 q 16 6 20 -10" stroke="#86efac" strokeWidth="0.6" fill="none" opacity="0.55" />
          {/* Confidence colours along the chain — blue high → green → yellow → red low */}
          {[
            { x: 50, y: 80, c: "#3b82f6" },
            { x: 62, y: 70, c: "#3b82f6" },
            { x: 76, y: 82, c: "#10b981" },
            { x: 88, y: 96, c: "#10b981" },
            { x: 104, y: 90, c: "#fbbf24" },
            { x: 120, y: 76, c: "#fbbf24" },
            { x: 136, y: 68, c: "#fb7185" },
            { x: 148, y: 76, c: "#fb7185" },
          ].map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="3.5" fill={p.c} stroke="none" />
          ))}
          <text x="158" y="104" textAnchor="end" fontSize="3.6" fill="#86efac" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">pLDDT 88</text>
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
