"use client";

/**
 * DnaTranscription — five-stage looping animation of DNA being
 * transcribed into mRNA by RNA polymerase. The cell-biology
 * counterpart to MscCultureCycle on the login backdrop.
 *
 * Stages:
 *   1. CLOSED       — intact double helix, no activity
 *   2. UNWINDING    — a small bubble opens in the middle, strands
 *                     pull apart, rung lines vanish in the bubble
 *   3. POLYMERASE   — RNA pol (filled bead) docks on the bubble
 *   4. SYNTHESIS    — mRNA strand emerges from the polymerase,
 *                     grows longer
 *   5. RELEASE      — mRNA strand drifts off to the right; bubble
 *                     re-closes; DNA returns to its intact double
 *                     helix; cycle loops
 *
 * No external lib — `useStageCycle` + CSS transitions on the SVG
 * attribute values, same pattern as MscCultureCycle. Respects
 * prefers-reduced-motion (the hook freezes the cycle on CLOSED).
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["closed", "unwinding", "polymerase", "synthesis", "release"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  closed:     { label: "DNA · CLOSED",     sub: "double helix at rest",    duration: 3200 },
  unwinding:  { label: "UNWINDING",        sub: "strands separating",      duration: 2800 },
  polymerase: { label: "RNA POL II",       sub: "docks on the bubble",     duration: 2800 },
  synthesis:  { label: "TRANSCRIBING",     sub: "5′ → 3′ synthesis",       duration: 3600 },
  release:    { label: "mRNA · RELEASED",  sub: "ready for translation",   duration: 3000 },
};

interface Props {
  size?: number;
  className?: string;
}

export function DnaTranscription({ size = 200, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  // ── Per-stage visual parameters ──────────────────────────────
  // The transcription "bubble" — the region of the DNA where the
  // two strands are pulled apart. Width grows from 0 (closed) to
  // ~40 px (open during stages 3-5).
  const bubbleOpen = stage !== "closed";
  const bubbleAmp = bubbleOpen ? 11 : 0; // vertical separation of strands inside the bubble

  // RNA polymerase position — docked at the centre of the bubble
  // during stages 3-5, off-stage otherwise.
  const polVisible = stage === "polymerase" || stage === "synthesis" || stage === "release";

  // mRNA strand — grows during synthesis (length 0 → ~46 px),
  // detaches and drifts rightward during release.
  const mrnaLength =
    stage === "synthesis" ? 46 :
    stage === "release" ? 46 :
    stage === "polymerase" ? 6 : 0;
  const mrnaDriftX = stage === "release" ? 38 : 0;
  const mrnaOpacity =
    stage === "polymerase" || stage === "synthesis" ? 1 :
    stage === "release" ? 0.5 : 0;

  // Bubble bounds in the viewBox
  const BX_MIN = 86;
  const BX_MAX = 134;
  // Centerline y for the DNA
  const CY = 90;

  // Rung-line positions across the helix — those inside the
  // bubble vanish when the strands pull apart.
  const RUNGS = [22, 44, 66, 88, 110, 132, 154, 176, 198];

  return (
    <div className={className}>
      <svg
        width={size}
        height={size * (180 / 220)}
        viewBox="0 0 220 180"
        fill="none"
        role="img"
        aria-label={`DNA transcription — ${info.label}`}
      >
        {/* ── DNA backbone — two sinusoidal strands. Inside the
              bubble (x ∈ [BX_MIN, BX_MAX]), the strands deflect
              outward by `bubbleAmp` to open the transcription
              bubble. Outside the bubble they remain at the closed
              sinusoid. */}
        <path
          d={topStrandPath(BX_MIN, BX_MAX, bubbleAmp, CY)}
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          fill="none"
          style={{ transition: noTransition ?? "d 700ms ease" }}
        />
        <path
          d={bottomStrandPath(BX_MIN, BX_MAX, bubbleAmp, CY)}
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          fill="none"
          style={{ transition: noTransition ?? "d 700ms ease" }}
        />

        {/* ── Rung lines connecting the two strands. Vanish for
              rungs whose x falls inside the bubble. */}
        {RUNGS.map((x) => {
          const inBubble = bubbleOpen && x >= BX_MIN - 2 && x <= BX_MAX + 2;
          return (
            <line
              key={`rung-${x}`}
              x1={x} y1={CY - 22}
              x2={x} y2={CY + 22}
              stroke="currentColor"
              strokeWidth="0.9"
              opacity={inBubble ? 0 : 0.55}
              style={{ transition: noTransition ?? "opacity 500ms ease" }}
            />
          );
        })}

        {/* ── RNA polymerase — a filled bead with a slight ring,
              sitting at the centre of the bubble. */}
        <g
          style={{
            transition: noTransition ?? "opacity 500ms ease",
            opacity: polVisible ? 1 : 0,
          }}
        >
          <circle cx="110" cy={CY} r="11" fill="currentColor" fillOpacity="0.32" stroke="none" />
          <circle cx="110" cy={CY} r="11" stroke="currentColor" strokeWidth="1.1" fill="none" opacity="0.7" />
          <circle cx="110" cy={CY} r="3.2" fill="currentColor" fillOpacity="0.85" stroke="none" />
        </g>

        {/* ── Nascent mRNA strand — emerges from the polymerase,
              grows during SYNTHESIS, drifts off to the right
              during RELEASE. */}
        <g
          style={{
            transition: noTransition ?? "transform 800ms ease, opacity 700ms ease",
            transform: `translate3d(${mrnaDriftX}px, 0, 0)`,
            opacity: mrnaOpacity,
          }}
        >
          <path
            d={mrnaPath(mrnaLength)}
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            fill="none"
            style={{ transition: noTransition ?? "d 800ms ease" }}
          />
          {/* 5′ cap dot at the polymerase end */}
          <circle cx="110" cy={CY - 26} r="2.4" fill="currentColor" fillOpacity="0.7" stroke="none" />
        </g>

        {/* ── Stage label + sub-label */}
        <g fill="currentColor" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
          <text x="110" y="148" textAnchor="middle" fontSize="7.5" fontWeight="700" letterSpacing="1.3">
            {info.label}
          </text>
          <text x="110" y="160" textAnchor="middle" fontSize="6" opacity="0.55" letterSpacing="0.4">
            {info.sub}
          </text>
        </g>

        {/* ── Stage dots */}
        <g
          transform="translate(86 172)"
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
              style={{ transition: noTransition ?? "opacity 300ms ease, fill 300ms ease" }}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}

/** Path for the TOP DNA strand. Outside the bubble (x < bxMin or
 *  x > bxMax) it follows the closed sinusoid; inside the bubble
 *  it bows upward by `amp` so the two strands pull apart. */
function topStrandPath(bxMin: number, bxMax: number, amp: number, cy: number): string {
  // Closed helix: y = cy + 12 * sin(2π x / 44)  (period 44, amplitude 12)
  // We sample at a few control points and stitch with cubic Q segments.
  // Outside the bubble, use the closed curve; inside, use a bowed arc.
  const left =
    `M 4 ${cy} ` +
    `Q 15 ${cy - 22}, 26 ${cy} ` +
    `T 48 ${cy} ` +
    `T 70 ${cy} ` +
    `T ${bxMin} ${cy}`;
  const bubbleMid = (bxMin + bxMax) / 2;
  const inside =
    `Q ${bubbleMid} ${cy - 22 - amp}, ${bxMax} ${cy}`;
  const right =
    ` T ${bxMax + 22} ${cy}` +
    ` T ${bxMax + 44} ${cy}` +
    ` T ${bxMax + 66} ${cy}` +
    ` T 216 ${cy}`;
  return left + " " + inside + right;
}

function bottomStrandPath(bxMin: number, bxMax: number, amp: number, cy: number): string {
  const left =
    `M 4 ${cy} ` +
    `Q 15 ${cy + 22}, 26 ${cy} ` +
    `T 48 ${cy} ` +
    `T 70 ${cy} ` +
    `T ${bxMin} ${cy}`;
  const bubbleMid = (bxMin + bxMax) / 2;
  const inside =
    `Q ${bubbleMid} ${cy + 22 + amp}, ${bxMax} ${cy}`;
  const right =
    ` T ${bxMax + 22} ${cy}` +
    ` T ${bxMax + 44} ${cy}` +
    ` T ${bxMax + 66} ${cy}` +
    ` T 216 ${cy}`;
  return left + " " + inside + right;
}

/** Nascent mRNA strand — emerges upward from the polymerase
 *  (110, 90) and snakes off to the upper right. `length` controls
 *  how far the strand has been synthesised. */
function mrnaPath(length: number): string {
  // Start above the polymerase, then curve outward in a gentle arc.
  // Length 0 → invisible, 46 → full arc.
  if (length <= 0) return "M 110 64 L 110 64";
  const t = Math.min(length / 46, 1);
  const x1 = 110 + 6 * t;
  const y1 = 64 - 6 * t;
  const x2 = 110 + 20 * t;
  const y2 = 70 - 14 * t;
  const x3 = 110 + 36 * t;
  const y3 = 62 - 6 * t;
  return `M 110 64 Q ${x1} ${y1}, ${x2} ${y2} T ${x3} ${y3}`;
}
