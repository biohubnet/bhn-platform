"use client";

/**
 * MscCultureCycle — an eight-stage looping animation that tells
 * the full MSC passaging story in one corner of the login
 * backdrop. Stages follow the standard wet-lab passaging protocol:
 *
 *   1. SEED       — a few cells in fresh media (P0 · seeded)
 *   2. GROW       — proliferating, "+1" dividing indicators
 *   3. CONFLUENT  — 80 % confluent monolayer, ready to passage
 *   4. PBS WASH   — old media aspirated; PBS rinse removes
 *                   residual serum (FBS would inactivate trypsin)
 *   5. TRYPSIN    — protease cuts adhesion proteins; cells round
 *                   up (they go from flat-and-spread to compact
 *                   spheres detached from the substrate)
 *   6. NEUTRALIZE — FBS-containing media added to stop the
 *                   digestion; dish wash switches green → pink
 *                   (phenol red in DMEM+FBS)
 *   7. ASPIRATE   — pipette descends and draws the cell suspension
 *                   up into it
 *   8. RE-SEED    — pipette pulls back, only a few cells remain
 *                   in the fresh flask (P1)
 *
 * Then the cycle loops back to SEED.
 *
 * No external lib — pure React `useState` + `setTimeout`, with CSS
 * transitions on the SVG attributes so each stage hand-off looks
 * smooth instead of cut. Stage timing is in `STAGE_INFO`.
 */

import { useEffect, useState } from "react";

/** Read the user's prefers-reduced-motion preference. Returns the
 *  current value AND subscribes to changes so the component reacts
 *  if the OS setting flips mid-session. SSR-safe — returns false
 *  during the initial render and updates after mount. */
function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

const STAGES = [
  "seed",
  "grow",
  "confluent",
  "pbsWash",
  "trypsin",
  "neutralize",
  "aspirate",
  "reseed",
] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  seed:       { label: "P0 · SEEDED",     sub: "5×10³ cells/cm²",       duration: 3400 },
  grow:       { label: "PROLIFERATING",   sub: "doubling…",              duration: 3600 },
  confluent:  { label: "80% CONFLUENT",   sub: "ready to passage",       duration: 3800 },
  pbsWash:    { label: "PBS WASH",        sub: "rinse off residual FBS", duration: 2600 },
  trypsin:    { label: "TRYPSIN · 0.25%", sub: "3-5 min @ 37°C",         duration: 3400 },
  neutralize: { label: "NEUTRALIZE",      sub: "+ FBS media stops it",   duration: 2600 },
  aspirate:   { label: "ASPIRATE",        sub: "pipette out cells",      duration: 3600 },
  reseed:     { label: "RE-SEED · P1",    sub: "fresh flask",            duration: 2800 },
};

/** Cell positions inside the dish ellipse (cx=90, cy=140, rx=78,
 *  ry=62 in the 180×260 viewBox). Layered so cells appear in
 *  passage order: 0–3 at SEED, 4–8 at GROW, 9–27 at CONFLUENT
 *  (the latter 19 fill out the dish into a tight monolayer).
 *  The denser packing makes 80% confluent actually read as a
 *  monolayer instead of scattered dots. */
const CELL_POSITIONS: Array<{ x: number; y: number }> = [
  // SEED (first 4) — sparse founders
  { x: 60, y: 116 }, { x: 110, y: 108 }, { x: 78, y: 148 }, { x: 124, y: 142 },
  // GROW (positions 4-8) — first round of division
  { x: 92, y: 122 }, { x: 50, y: 138 }, { x: 100, y: 156 }, { x: 70, y: 130 },
  { x: 130, y: 124 },
  // CONFLUENT (positions 9-27) — fill out into a tight packed
  // monolayer. Roughly grid-aligned with ~16-18 px spacing so
  // they almost touch at the new flat-cell radius (r=3.2).
  { x: 44, y: 110 },  { x: 86, y: 134 },  { x: 116, y: 130 }, { x: 58, y: 162 },
  { x: 90, y: 168 },  { x: 122, y: 162 }, { x: 38, y: 152 },  { x: 100, y: 138 },
  { x: 138, y: 144 }, { x: 76, y: 168 },  { x: 64, y: 100 },  { x: 96, y: 100 },
  { x: 108, y: 174 }, { x: 30, y: 134 },  { x: 144, y: 124 }, { x: 70, y: 178 },
  { x: 130, y: 178 }, { x: 50, y: 172 },  { x: 86, y: 184 },
];

interface Props {
  size?: number;
  className?: string;
}

export function MscCultureCycle({ size = 200, className }: Props) {
  const [stageIdx, setStageIdx] = useState(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    // Respect prefers-reduced-motion — freeze on the first stage
    // ("seed") so motion-sensitive users see a static depiction of
    // the cycle instead of an animated one.
    if (reducedMotion) return;
    const stage = STAGES[stageIdx];
    const t = window.setTimeout(() => {
      setStageIdx((i) => (i + 1) % STAGES.length);
    }, STAGE_INFO[stage].duration);
    return () => window.clearTimeout(t);
  }, [stageIdx, reducedMotion]);

  // When reduced motion is on, nullify the SVG attribute transitions
  // below so attribute changes (which CAN still happen if a user
  // interacts with the cycle) snap rather than animate.
  const noTransition = reducedMotion ? "none" : undefined;

  const stage = STAGES[stageIdx];
  const info = STAGE_INFO[stage];

  // How many cells to render this stage. Fades nicely thanks to
  // the per-cell opacity transition below.
  const visibleCount =
    stage === "seed" ? 4 :
    stage === "grow" ? 9 :
    stage === "reseed" ? 3 :
    // confluent, pbsWash, trypsin, neutralize, aspirate — all show
    // the full packed monolayer
    CELL_POSITIONS.length;

  // Detached state — cells are spherical (compact) during trypsin
  // through aspirate. NOTE the radius logic is FLIPPED vs. before:
  // flat MSCs are SPREAD (visually larger, r=3.2) and detached
  // spheres are COMPACT (visually smaller, r=2.4). That's how real
  // MSCs look — spread + adhered cells take up more dish area than
  // the same cells rolled into spheres after digestion.
  const isDetaching =
    stage === "trypsin" ||
    stage === "neutralize" ||
    stage === "aspirate";
  const cellR = isDetaching ? 2.4 : 3.2;
  const cellFill = isDetaching ? "#86efac" : "#7dd3fc";
  const cellFillOpacity = isDetaching ? 0.7 : 0.55;
  const cellStrokeOpacity = isDetaching ? 0.85 : 0.78;

  // Three colour washes for the dish — fade in / out per stage.
  // Real wet-lab vocabulary: green (trypsin), pink (FBS media,
  // pinker than DMEM alone because of phenol red), pale cyan (PBS).
  const trypsinOpacity =
    stage === "trypsin" || stage === "aspirate" ? 0.18 : 0;
  const neutralizeOpacity = stage === "neutralize" ? 0.22 : 0;
  const pbsOpacity = stage === "pbsWash" ? 0.20 : 0;

  // Pipette descends from above. Off-screen when not in use, lower
  // and inside the dish when aspirating/reseeding.
  const pipetteVisible = stage === "aspirate" || stage === "reseed";
  const pipetteY =
    stage === "aspirate" ? 8 :
    stage === "reseed" ? -8 :
    -90;

  // Cell stream being drawn up into the pipette.
  const streamOpacity = stage === "aspirate" ? 0.85 : 0;
  // Fresh-cell droplet falling out of the pipette during reseed.
  const dropletOpacity = stage === "reseed" ? 0.85 : 0;

  return (
    <div className={className}>
      <svg
        width={size}
        height={size * (260 / 180)}
        viewBox="0 0 180 260"
        fill="none"
        role="img"
        aria-label={`MSC passaging cycle — ${info.label}`}
      >
        {/* ── Dish outline ──────────────────────────────────────── */}
        <ellipse
          cx="90" cy="140" rx="78" ry="62"
          stroke="currentColor" strokeWidth="1.2"
          opacity="0.7"
        />
        {/* Inner media line — dashed */}
        <ellipse
          cx="90" cy="140" rx="72" ry="56"
          stroke="currentColor" strokeWidth="0.7"
          strokeDasharray="2 3" opacity="0.35"
        />

        {/* ── PBS wash — pale cyan rinse, fades in just before
              trypsin to flag the "rinse off residual FBS" step. */}
        <ellipse
          cx="90" cy="140" rx="74" ry="58"
          fill="#bae6fd" fillOpacity={pbsOpacity}
          style={{ transition: noTransition ?? "fill-opacity 700ms ease" }}
        />

        {/* ── Trypsin green wash ────────────────────────────────── */}
        <ellipse
          cx="90" cy="140" rx="74" ry="58"
          fill="#86efac" fillOpacity={trypsinOpacity}
          style={{ transition: noTransition ?? "fill-opacity 700ms ease" }}
        />

        {/* ── Neutralize pink wash — DMEM + FBS (phenol red). Fades
              over the green wash once trypsin is neutralised. */}
        <ellipse
          cx="90" cy="140" rx="74" ry="58"
          fill="#f9a8d4" fillOpacity={neutralizeOpacity}
          style={{ transition: noTransition ?? "fill-opacity 700ms ease" }}
        />

        {/* ── Cells ─────────────────────────────────────────────── */}
        <g style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          {CELL_POSITIONS.map((c, i) => {
            const visible = i < visibleCount;
            return (
              <circle
                key={i}
                cx={c.x} cy={c.y}
                r={cellR}
                fill={cellFill}
                fillOpacity={visible ? cellFillOpacity : 0}
                stroke={cellFill}
                strokeWidth="0.8"
                strokeOpacity={visible ? cellStrokeOpacity : 0}
                style={{
                  transition:
                    noTransition ??
                    "r 500ms ease, fill 500ms ease, stroke 500ms ease, fill-opacity 500ms ease, stroke-opacity 500ms ease",
                }}
              />
            );
          })}
        </g>

        {/* ── "+1" dividing indicators (seed + grow only) ───────── */}
        {(stage === "seed" || stage === "grow") &&
          CELL_POSITIONS.slice(0, 2).map((c, i) => (
            <text
              key={`div-${i}`}
              x={c.x + 5}
              y={c.y - 4}
              fontSize="6"
              fill="#7dd3fc"
              stroke="none"
              opacity="0.75"
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            >
              +1
            </text>
          ))}

        {/* ── Pipette ───────────────────────────────────────────── */}
        <g
          style={{
            transform: `translateY(${pipetteY}px)`,
            transition: noTransition ?? "transform 1100ms cubic-bezier(.5,.1,.4,1), opacity 300ms ease",
            opacity: pipetteVisible ? 1 : 0,
          }}
        >
          {/* Body */}
          <rect
            x="78" y="0" width="24" height="62"
            rx="2"
            stroke="currentColor" strokeWidth="1.2"
          />
          {/* Tapered tip pointing down to the dish */}
          <path
            d="M 78 62 L 90 118 L 102 62 Z"
            stroke="currentColor" strokeWidth="1.2"
          />
          {/* Volume marks */}
          <g stroke="currentColor" strokeWidth="0.7" opacity="0.55">
            <line x1="78" y1="14" x2="84" y2="14" />
            <line x1="78" y1="24" x2="84" y2="24" />
            <line x1="78" y1="34" x2="84" y2="34" />
            <line x1="78" y1="44" x2="84" y2="44" />
            <line x1="78" y1="54" x2="84" y2="54" />
          </g>
          {/* Liquid column inside the pipette body when aspirating */}
          {stage === "aspirate" && (
            <rect
              x="80" y="40" width="20" height="22"
              fill="#86efac" fillOpacity="0.35"
            />
          )}
        </g>

        {/* ── Aspirate stream — column of cells being drawn up ──── */}
        <g
          opacity={streamOpacity}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}
        >
          <path
            d="M 90 118 Q 88 130, 90 140"
            stroke="#86efac" strokeWidth="1.4"
            strokeLinecap="round" fill="none" opacity="0.6"
          />
          <circle cx="90" cy="122" r="1.3" fill="#86efac" opacity="0.8" />
          <circle cx="89" cy="128" r="1.2" fill="#86efac" opacity="0.7" />
          <circle cx="91" cy="134" r="1.1" fill="#86efac" opacity="0.6" />
        </g>

        {/* ── Re-seed droplet — fresh cells falling out the tip ─── */}
        <g
          opacity={dropletOpacity}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}
        >
          <path
            d="M 90 110 L 90 132"
            stroke="#7dd3fc" strokeWidth="1.4"
            strokeLinecap="round" opacity="0.55"
          />
          <circle cx="90" cy="124" r="1.4" fill="#7dd3fc" opacity="0.85" />
          <circle cx="91" cy="130" r="1.1" fill="#7dd3fc" opacity="0.7" />
        </g>

        {/* ── Stage label ───────────────────────────────────────── */}
        <g
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          fill="currentColor" stroke="none"
        >
          <text
            x="90" y="232"
            textAnchor="middle"
            fontSize="7.5" fontWeight="700"
            letterSpacing="1.3"
          >
            {info.label}
          </text>
          <text
            x="90" y="246"
            textAnchor="middle"
            fontSize="6"
            opacity="0.55"
            letterSpacing="0.4"
          >
            {info.sub}
          </text>
        </g>

        {/* ── Stage dots — progress along the cycle. Carries
              proper progress-bar semantics for screen readers
              (role + valuenow / valuemax / aria-label) so the dots
              aren't just decorative. */}
        <g
          transform="translate(60 256)"
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
