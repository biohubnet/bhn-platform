"use client";

/**
 * SingleCellRnaSeq — four-stage looping animation of single-cell
 * RNA sequencing. Cells flow into droplets, get barcoded, are
 * projected into a UMAP embedding, and clusters get annotated.
 *
 * Stages:
 *   1. CELLS     — a cell suspension; many dots in a stream
 *   2. DROPLETS  — droplet-forming microfluidic junction; each cell
 *                  pairs with a barcoded bead
 *   3. UMAP      — points scatter into a UMAP-ish embedding
 *   4. ANNOTATE  — three clusters get colored + label callouts
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["cells", "droplets", "umap", "annotate"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  cells:    { label: "SUSPENSION",   sub: "10⁴ cells",            duration: 2400 },
  droplets: { label: "DROPLET · 10x", sub: "barcoded beads",      duration: 2600 },
  umap:     { label: "UMAP",         sub: "n=10,000",             duration: 2800 },
  annotate: { label: "CELL TYPES",   sub: "annotated · 3 clusters", duration: 3000 },
};

const UMAP_POINTS = (() => {
  const pts: Array<{ x: number; y: number; cluster: 0 | 1 | 2 }> = [];
  // Cluster 0 — top-left
  for (let i = 0; i < 18; i++) {
    pts.push({ x: 40 + ((i * 13) % 22), y: 36 + ((i * 7) % 18), cluster: 0 });
  }
  // Cluster 1 — middle-right
  for (let i = 0; i < 18; i++) {
    pts.push({ x: 86 + ((i * 11) % 24), y: 56 + ((i * 5) % 18), cluster: 1 });
  }
  // Cluster 2 — bottom-left
  for (let i = 0; i < 14; i++) {
    pts.push({ x: 46 + ((i * 9) % 18), y: 82 + ((i * 5) % 16), cluster: 2 });
  }
  return pts;
})();

const CLUSTER_COLOR = ["#7dd3fc", "#86efac", "#fbbf24"];

interface Props { size?: number; className?: string; }

export function SingleCellRnaSeq({ size = 180, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  const showSuspension = stage === "cells";
  const showDroplet = stage === "droplets";
  const showUmap = stage === "umap" || stage === "annotate";
  const showLabels = stage === "annotate";

  return (
    <div className={className}>
      <svg width={size} height={size * (170 / 180)} viewBox="0 0 180 170" fill="none" stroke="currentColor"
        strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round"
        role="img" aria-label={`scRNA-seq — ${info.label}`}>
        {/* Cell suspension stream */}
        <g opacity={showSuspension ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <path d="M 24 60 Q 100 50, 156 60" strokeWidth="0.6" opacity="0.55" strokeDasharray="2 2" />
          {Array.from({ length: 18 }).map((_, i) => (
            <circle key={i} cx={24 + i * 8} cy={60 + (i % 3 - 1) * 4} r="2" fill="currentColor" stroke="none" opacity="0.7" />
          ))}
        </g>

        {/* Droplet junction */}
        <g opacity={showDroplet ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          {/* Channels — cells (left) + beads (right) + oil (top/bottom) merge */}
          <line x1="20" y1="60" x2="90" y2="60" strokeWidth="0.6" opacity="0.6" />
          <line x1="20" y1="74" x2="90" y2="74" strokeWidth="0.6" opacity="0.6" />
          <line x1="56" y1="36" x2="76" y2="56" strokeWidth="0.6" opacity="0.6" />
          <line x1="56" y1="98" x2="76" y2="78" strokeWidth="0.6" opacity="0.6" />
          <line x1="90" y1="67" x2="156" y2="67" strokeWidth="0.7" />
          {/* Droplets */}
          {[
            { x: 102, c1: "#7dd3fc", c2: "#fbbf24" },
            { x: 118, c1: "#86efac", c2: "#7dd3fc" },
            { x: 134, c1: "#fbbf24", c2: "#86efac" },
            { x: 150, c1: "#7dd3fc", c2: "#fbbf24" },
          ].map((d, i) => (
            <g key={i}>
              <circle cx={d.x} cy={67} r="4.2" stroke-width="0.55" />
              <circle cx={d.x - 1.5} cy={67 - 0.6} r="1.1" fill={d.c1} stroke="none" opacity="0.85" />
              <circle cx={d.x + 1.6} cy={67 + 0.6} r="1" fill={d.c2} stroke="none" opacity="0.85" />
            </g>
          ))}
          <text x="20" y="52" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.65">cells</text>
          <text x="20" y="84" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.65">beads</text>
        </g>

        {/* UMAP */}
        <g opacity={showUmap ? 1 : 0} style={{ transition: noTransition ?? "opacity 600ms ease" }}>
          {/* Axes */}
          <line x1="34" y1="106" x2="146" y2="106" strokeWidth="0.55" opacity="0.55" />
          <line x1="34" y1="106" x2="34" y2="22" strokeWidth="0.55" opacity="0.55" />
          <text x="142" y="116" fontSize="4.4" textAnchor="end" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.6">UMAP1</text>
          <text x="28" y="26" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.6" textAnchor="end">UMAP2</text>
          {UMAP_POINTS.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="1.3"
              fill={showLabels ? CLUSTER_COLOR[p.cluster] : "currentColor"}
              opacity={showLabels ? 0.95 : 0.7}
              stroke="none"
              style={{ transition: noTransition ?? "fill 500ms ease, opacity 500ms ease" }} />
          ))}
        </g>

        {/* Cluster labels */}
        <g opacity={showLabels ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <text x="48" y="32" fontSize="4.6" fill={CLUSTER_COLOR[0]} stroke="none" fontFamily="ui-monospace,monospace" letterSpacing="0.4">T cells</text>
          <text x="118" y="52" fontSize="4.6" fill={CLUSTER_COLOR[1]} stroke="none" fontFamily="ui-monospace,monospace" letterSpacing="0.4">Macroph</text>
          <text x="48" y="100" fontSize="4.6" fill={CLUSTER_COLOR[2]} stroke="none" fontFamily="ui-monospace,monospace" letterSpacing="0.4">B cells</text>
        </g>

        <g fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
          <text x="90" y="134" textAnchor="middle" fontSize="6.8" fontWeight="700" letterSpacing="1.3">{info.label}</text>
          <text x="90" y="146" textAnchor="middle" fontSize="5.6" opacity="0.55" letterSpacing="0.4">{info.sub}</text>
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
