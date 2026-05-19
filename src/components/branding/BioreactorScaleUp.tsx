"use client";

/**
 * BioreactorScaleUp — five-stage looping animation of an upstream
 * scale-up train. Cells move through a shake flask, then four
 * progressively larger stirred-tank bioreactors. At each stage
 * the active vessel "fills" with cells (bubble dots), the cell
 * density grows, and the volume label updates.
 *
 * Stages:
 *   1. SHAKE   — shake flask (250 mL) seed culture
 *   2. N-3     — 5 L stirred-tank
 *   3. N-2     — 50 L
 *   4. N-1     — 500 L
 *   5. N       — 2000 L production bioreactor
 *
 * Five vessels stay on screen; the active one lights up. This is
 * exactly how a process-dev whiteboard looks.
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["shake", "n3", "n2", "n1", "n"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  shake: { label: "SHAKE FLASK", sub: "250 mL · seed",   duration: 2400 },
  n3:    { label: "N-3 STR",     sub: "5 L · expansion", duration: 2400 },
  n2:    { label: "N-2 STR",     sub: "50 L",            duration: 2400 },
  n1:    { label: "N-1 STR",     sub: "500 L",           duration: 2400 },
  n:     { label: "N · PRODUCTION", sub: "2000 L · fed-batch", duration: 3200 },
};

// Vessel positions across the bottom of the SVG. Each gets bigger to suggest scale.
const VESSELS: Array<{ cx: number; cy: number; r: number; type: "flask" | "tank"; stage: Stage }> = [
  { cx: 22,  cy: 88, r: 6,  type: "flask", stage: "shake" },
  { cx: 50,  cy: 88, r: 8,  type: "tank",  stage: "n3" },
  { cx: 80,  cy: 86, r: 11, type: "tank",  stage: "n2" },
  { cx: 116, cy: 84, r: 14, type: "tank",  stage: "n1" },
  { cx: 156, cy: 80, r: 18, type: "tank",  stage: "n" },
];

interface Props {
  size?: number;
  className?: string;
}

export function BioreactorScaleUp({ size = 200, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  // Identify the active vessel index for highlighting + bubbles.
  const activeIdx = STAGES.indexOf(stage);

  return (
    <div className={className}>
      <svg
        width={size}
        height={size * (160 / 200)}
        viewBox="0 0 200 160"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.92"
        strokeLinecap="round"
        strokeLinejoin="round"
        role="img"
        aria-label={`Bioreactor scale-up — ${info.label}`}
      >
        {/* ── Floor line — implied bench */}
        <line x1="8" y1="106" x2="192" y2="106" opacity="0.4" />

        {/* ── Transfer arrows between vessels */}
        {[0, 1, 2, 3].map((i) => {
          const a = VESSELS[i];
          const b = VESSELS[i + 1];
          const x1 = a.cx + a.r + 2;
          const x2 = b.cx - b.r - 2;
          const y = (a.cy + b.cy) / 2 - 2;
          const past = activeIdx > i;
          return (
            <g
              key={`arr-${i}`}
              opacity={past ? 0.9 : 0.35}
              style={{ transition: noTransition ?? "opacity 500ms ease" }}
            >
              <line x1={x1} y1={y} x2={x2 - 3} y2={y} strokeWidth="0.72" strokeDasharray="2 2" />
              <path d={`M ${x2 - 4} ${y - 2.5} L ${x2} ${y} L ${x2 - 4} ${y + 2.5}`} strokeWidth="0.72" />
            </g>
          );
        })}

        {/* ── Vessels */}
        {VESSELS.map((v, i) => {
          const isActive = i === activeIdx;
          const isPast = i < activeIdx;
          const opacity = isActive ? 1 : isPast ? 0.6 : 0.45;
          return (
            <g
              key={`v-${i}`}
              opacity={opacity}
              style={{ transition: noTransition ?? "opacity 500ms ease" }}
            >
              {v.type === "flask" ? (
                // Shake flask — narrow neck + wide bottom
                <g>
                  <path
                    d={`
                      M ${v.cx - 2} ${v.cy - v.r - 6}
                      L ${v.cx + 2} ${v.cy - v.r - 6}
                      L ${v.cx + 2} ${v.cy - v.r}
                      L ${v.cx + v.r} ${v.cy}
                      L ${v.cx + v.r} ${v.cy + v.r - 2}
                      Q ${v.cx} ${v.cy + v.r + 3}, ${v.cx - v.r} ${v.cy + v.r - 2}
                      L ${v.cx - v.r} ${v.cy}
                      L ${v.cx - 2} ${v.cy - v.r}
                      Z
                    `}
                  />
                  {/* media line */}
                  <line
                    x1={v.cx - v.r + 1.5} y1={v.cy + 2}
                    x2={v.cx + v.r - 1.5} y2={v.cy + 2}
                    strokeWidth="0.5" opacity="0.55"
                  />
                </g>
              ) : (
                // Stirred-tank bioreactor — rounded rect with top dome
                <g>
                  <path
                    d={`
                      M ${v.cx - v.r} ${v.cy - v.r + 2}
                      Q ${v.cx} ${v.cy - v.r - 4}, ${v.cx + v.r} ${v.cy - v.r + 2}
                      L ${v.cx + v.r} ${v.cy + v.r - 2}
                      Q ${v.cx} ${v.cy + v.r + 3}, ${v.cx - v.r} ${v.cy + v.r - 2}
                      Z
                    `}
                  />
                  {/* impeller shaft */}
                  <line
                    x1={v.cx} y1={v.cy - v.r - 4}
                    x2={v.cx} y2={v.cy + v.r * 0.4}
                    strokeWidth="0.65" opacity="0.7"
                  />
                  {/* impeller blade */}
                  <line
                    x1={v.cx - v.r * 0.55} y1={v.cy + v.r * 0.4}
                    x2={v.cx + v.r * 0.55} y2={v.cy + v.r * 0.4}
                    strokeWidth="0.78" opacity="0.8"
                  />
                  {/* media line */}
                  <line
                    x1={v.cx - v.r * 0.78} y1={v.cy - v.r * 0.35}
                    x2={v.cx + v.r * 0.78} y2={v.cy - v.r * 0.35}
                    strokeWidth="0.5" opacity="0.5"
                  />
                </g>
              )}

              {/* Cell dots — only inside the active vessel + past vessels keep
                    a few "residual" dots to suggest the path. */}
              {(isActive || isPast) && (
                <g>
                  {/* Active: lots of bubbles; past: just a couple */}
                  {(isActive ? CELL_OFFSETS_DENSE : CELL_OFFSETS_SPARSE).map((o, j) => (
                    <circle
                      key={`c-${i}-${j}`}
                      cx={v.cx + o.dx * (v.r / 14)}
                      cy={v.cy + o.dy * (v.r / 14)}
                      r="1.1"
                      fill="#86efac"
                      stroke="none"
                      opacity={isActive ? 0.85 : 0.45}
                    />
                  ))}
                </g>
              )}
            </g>
          );
        })}

        {/* ── Stage label */}
        <g
          fill="currentColor" stroke="none"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        >
          <text x="100" y="130" textAnchor="middle" fontSize="7" fontWeight="700" letterSpacing="1.3">
            {info.label}
          </text>
          <text x="100" y="142" textAnchor="middle" fontSize="5.8" opacity="0.55" letterSpacing="0.4">
            {info.sub}
          </text>
        </g>

        {/* ── Stage dots */}
        <g
          transform="translate(78 154)"
          role="progressbar"
          aria-label={`Cycle stage ${stageIdx + 1} of ${STAGES.length}: ${info.label}`}
          aria-valuenow={stageIdx + 1}
          aria-valuemin={1}
          aria-valuemax={STAGES.length}
        >
          {STAGES.map((_, i) => (
            <circle
              key={i}
              cx={i * 12}
              cy={0}
              r="1.6"
              fill={i === stageIdx ? "#86efac" : "currentColor"}
              opacity={i === stageIdx ? 1 : 0.3}
              stroke="none"
              style={{ transition: noTransition ?? "opacity 300ms ease, fill 300ms ease" }}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}

// Cell-position offsets relative to the vessel centre. Scaled by
// (vessel.r / 14) so dots fit nicely in vessels of every size.
const CELL_OFFSETS_DENSE: Array<{ dx: number; dy: number }> = [
  { dx: -6, dy: -4 }, { dx: 4, dy: -5 }, { dx: -3, dy: 1 },
  { dx: 6, dy: 2 },   { dx: 0, dy: -2 }, { dx: -7, dy: 3 },
  { dx: 7, dy: 4 },   { dx: -2, dy: 6 }, { dx: 3, dy: 7 },
];

const CELL_OFFSETS_SPARSE: Array<{ dx: number; dy: number }> = [
  { dx: -3, dy: -1 }, { dx: 4, dy: 2 },
];
