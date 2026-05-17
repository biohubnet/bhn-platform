"use client";
/**
 * Alien-neural visualisation of the AI matching engine.
 *
 * Compact (max-width column, ~280 px tall). The previous 5-variant
 * picker is gone — this is a single, deeply-textured organism.
 *
 * Why "alien-neural"
 *   The engine is a linear combination of weighted subscores. A neural
 *   net is the right metaphor; this rendering layers on biological /
 *   xenoform texture so the panel reads as a small living thing —
 *   bioluminescent nodes, curved axons, membrane rings, scan-line
 *   shimmer — instead of a plain SVG circuit.
 *
 * Texture passes
 *   1. <feTurbulence> noise on the background, masked at low opacity.
 *   2. Two layered radial halos (output node + upper-left vignette).
 *   3. Three concentric membrane rings on each hidden node, breathing
 *      out of phase.
 *   4. Cubic-bezier axons with gradient strokes — cyan from input,
 *      transitioning to the per-subscore hue at the hidden node.
 *   5. Pulses ride the axons via animateMotion, with a Gaussian-blur
 *      filter that gives each pulse a motion trail.
 *   6. Iridescent radial gradient on the output node (white-hot core,
 *      band-tinted mid, dark outer).
 *   7. Subtle horizontal scan-line shimmer on the top edge.
 *
 * Live interactivity
 *   Pipe stroke width, hidden-node radius, pulse density, and the
 *   output band colour all flow from the live MatchingConfig the
 *   parent shell controls. Drag a slider, the organism reshapes.
 *
 * Dynamic input + middle streams (rev May 2026)
 *   The left column was a static 5-row legend ("cell culture",
 *   "aseptic", "GMP doc", "bioreactor", "QA"). It now reads as a
 *   live feed — the row count breathes between 4 and 7, labels
 *   rotate from a biotech-skill pool every ~1.6 s, and each new
 *   label types in character-by-character so the panel reads
 *   like a scanner that's actively pulling features off a
 *   candidate. The 3 middle subscore nodes (DIRECT / SEMANTIC /
 *   PATHWAY — these are conceptually fixed; they ARE the
 *   algorithm) get a rotating "now matching" sub-label below
 *   each, also with the typing-in animation, so the middle
 *   column never sits still either.
 *
 *   prefers-reduced-motion → all rotation halts and the labels
 *   render fully resolved.
 */
import { useEffect, useState } from "react";
import { Cpu } from "lucide-react";
import { useSampleScore, SUBSCORE_HUES } from "@/components/admin/animations/shared";
import type { MatchingConfig } from "@/lib/matching/config";

interface Props { config: MatchingConfig }

// ── Geometry ─────────────────────────────────────────────────────
// Wider + shorter viewBox so the panel reads as a horizontal strip
// of bioluminescence sitting above the form. With preserveAspectRatio
// "meet" the SVG scales to its container; aspect ratio (6.5:1) gives
// the rendered height ~155 px inside the max-w-5xl page column.
const W = 1240;
const H = 200;
const PAD_X = 120;

// Vertical range the input column spreads over. The row count is
// dynamic (see useInputStream) so we compute y positions from these
// bounds per render instead of from a fixed array.
const INPUT_Y_TOP = 28;
const INPUT_Y_BOTTOM = 172;
const MIN_INPUTS = 4;
const MAX_INPUTS = 7;

/** Biotech-skill pool for the left-side feature feed. Same vocabulary
 *  the matching engine actually parses; the visual makes it feel
 *  like the scanner is pulling these features off a candidate live. */
const SKILL_POOL = [
  "cell culture", "aseptic", "GMP doc", "bioreactor", "QA",
  "fill-finish", "downstream", "upstream", "fermentation", "chromatography",
  "purification", "scale-up", "validation", "CMC", "stability",
  "PAT", "USP", "DSP", "qPCR", "ELISA",
  "viral clearance", "lyophilization", "buffer prep", "media prep",
  "in-process testing", "release testing", "audit trail", "deviation",
] as const;

/** Per-subscore rotating "now matching" caption pool. Each subscore
 *  has its own vocabulary that fits its semantic — direct matches
 *  look like single tokens, semantic looks like "≈" relationships,
 *  pathway looks like graph-style "X → Y" arrows. */
const MIDDLE_CAPTION_POOLS: Record<string, readonly string[]> = {
  direct: [
    "cell culture ✓",
    "GMP doc ✓",
    "fermentation ✓",
    "bioreactor ✓",
    "QA ✓",
    "aseptic ✓",
    "chromatography ✓",
    "validation ✓",
  ],
  semantic: [
    "fermentation ≈ bioreactor",
    "QA ≈ release testing",
    "aseptic ≈ GMP",
    "DSP ≈ downstream",
    "USP ≈ upstream",
    "CMC ≈ stability",
    "PAT ≈ in-process",
    "qPCR ≈ release testing",
  ],
  pathway: [
    "GMP → biomanufacturing",
    "fermentation → scale-up",
    "validation → release",
    "USP → DSP → fill",
    "aseptic → cleanroom",
    "QA → audit trail",
    "DSP → purification",
    "CMC → regulatory",
  ],
};

const HIDDEN_YS = [55, 100, 145];
const OUTPUT_Y = 100;
const HIDDEN_X = 600;
const OUTPUT_X = W - PAD_X;

/** Spread `count` y-positions evenly across [top, bottom]. Returns
 *  integers so the SVG snaps cleanly. */
function spreadY(count: number, top = INPUT_Y_TOP, bottom = INPUT_Y_BOTTOM): number[] {
  if (count <= 0) return [];
  if (count === 1) return [Math.round((top + bottom) / 2)];
  const step = (bottom - top) / (count - 1);
  return Array.from({ length: count }, (_, i) => Math.round(top + step * i));
}

interface InputRow {
  /** Stable React key — survives label swaps so the SVG can
   *  fade-tween node positions when the count changes. */
  key: string;
  /** Full label currently typing in (or fully typed). */
  fullLabel: string;
  /** Characters revealed so far. ≤ fullLabel.length. */
  visible: number;
  /** Y position in the SVG viewBox. */
  y: number;
}

function pickRandomSkill(): string {
  return SKILL_POOL[Math.floor(Math.random() * SKILL_POOL.length)];
}

function makeRow(y: number): InputRow {
  return {
    key: Math.random().toString(36).slice(2, 10),
    fullLabel: pickRandomSkill(),
    visible: 0,
    y,
  };
}

/** Custom hook: owns the live-feed state for the left column.
 *  Handles three concurrent timers:
 *    • TYPE — every 28 ms, advance visible chars on any row that
 *      hasn't fully typed yet.
 *    • ROTATE — every 1600 ms, pick a random row and swap its
 *      label for a new one from the pool (resets visible to 0).
 *    • RESIZE — every 9000 ms, change the row count to a new
 *      value in [MIN_INPUTS, MAX_INPUTS] (smoothly preserves
 *      existing rows where possible). */
function useInputStream(reducedMotion: boolean) {
  const [rows, setRows] = useState<InputRow[]>(() => spreadY(5).map(makeRow));

  // TYPE — character reveal.
  useEffect(() => {
    if (reducedMotion) {
      // Snap every label to its full length, no animation.
      setRows((r) => r.map((row) => ({ ...row, visible: row.fullLabel.length })));
      return;
    }
    const id = setInterval(() => {
      setRows((cur) => {
        let anyChanged = false;
        const next = cur.map((row) => {
          if (row.visible < row.fullLabel.length) {
            anyChanged = true;
            return { ...row, visible: row.visible + 1 };
          }
          return row;
        });
        return anyChanged ? next : cur;
      });
    }, 28);
    return () => clearInterval(id);
  }, [reducedMotion]);

  // ROTATE — randomly swap one row's label.
  useEffect(() => {
    if (reducedMotion) return;
    const id = setInterval(() => {
      setRows((cur) => {
        if (cur.length === 0) return cur;
        const idx = Math.floor(Math.random() * cur.length);
        const next = cur.slice();
        // Pick a new label that isn't already showing.
        const shown = new Set(cur.map((r) => r.fullLabel));
        let candidate = pickRandomSkill();
        let tries = 0;
        while (shown.has(candidate) && tries++ < 6) candidate = pickRandomSkill();
        next[idx] = { ...next[idx], fullLabel: candidate, visible: 0, key: Math.random().toString(36).slice(2, 10) };
        return next;
      });
    }, 1600);
    return () => clearInterval(id);
  }, [reducedMotion]);

  // RESIZE — change the row count.
  useEffect(() => {
    if (reducedMotion) return;
    const id = setInterval(() => {
      setRows((cur) => {
        // Pick a different count from current.
        let target = MIN_INPUTS + Math.floor(Math.random() * (MAX_INPUTS - MIN_INPUTS + 1));
        let tries = 0;
        while (target === cur.length && tries++ < 4) {
          target = MIN_INPUTS + Math.floor(Math.random() * (MAX_INPUTS - MIN_INPUTS + 1));
        }
        const ys = spreadY(target);
        if (target > cur.length) {
          // Grow — keep existing rows (re-spread their y), append new ones.
          const grown = cur.map((row, i) => ({ ...row, y: ys[i] }));
          for (let i = cur.length; i < target; i++) {
            grown.push({ ...makeRow(ys[i]) });
          }
          return grown;
        }
        // Shrink — drop the last (target → cur.length) rows.
        return cur.slice(0, target).map((row, i) => ({ ...row, y: ys[i] }));
      });
    }, 9000);
    return () => clearInterval(id);
  }, [reducedMotion]);

  return rows;
}

/** Hook for the rotating "now matching" caption beneath each
 *  middle (hidden) node. Each subscore has its own pool + its own
 *  typing state. */
function useMiddleCaptions(reducedMotion: boolean) {
  const [captions, setCaptions] = useState<Record<string, { full: string; visible: number }>>(() => ({
    direct:   { full: MIDDLE_CAPTION_POOLS.direct[0],   visible: 0 },
    semantic: { full: MIDDLE_CAPTION_POOLS.semantic[0], visible: 0 },
    pathway:  { full: MIDDLE_CAPTION_POOLS.pathway[0],  visible: 0 },
  }));

  // TYPE — same 28 ms interval as the inputs.
  useEffect(() => {
    if (reducedMotion) {
      setCaptions((c) => {
        const next: typeof c = { ...c };
        for (const k of Object.keys(next)) {
          next[k] = { ...next[k], visible: next[k].full.length };
        }
        return next;
      });
      return;
    }
    const id = setInterval(() => {
      setCaptions((cur) => {
        let anyChanged = false;
        const next: typeof cur = { ...cur };
        for (const k of Object.keys(cur)) {
          if (cur[k].visible < cur[k].full.length) {
            next[k] = { ...cur[k], visible: cur[k].visible + 1 };
            anyChanged = true;
          }
        }
        return anyChanged ? next : cur;
      });
    }, 28);
    return () => clearInterval(id);
  }, [reducedMotion]);

  // ROTATE — every 2200 ms swap one subscore's caption to a new
  // entry from its pool. Staggered slightly per subscore so all
  // three don't refresh in lockstep.
  useEffect(() => {
    if (reducedMotion) return;
    const ids: ReturnType<typeof setInterval>[] = [];
    const stagger = { direct: 0, semantic: 700, pathway: 1400 };
    for (const k of Object.keys(MIDDLE_CAPTION_POOLS)) {
      const offsetMs = stagger[k as keyof typeof stagger] ?? 0;
      const timeoutId = setTimeout(() => {
        const id = setInterval(() => {
          setCaptions((cur) => {
            const pool = MIDDLE_CAPTION_POOLS[k];
            let candidate = pool[Math.floor(Math.random() * pool.length)];
            let tries = 0;
            while (candidate === cur[k].full && tries++ < 4) {
              candidate = pool[Math.floor(Math.random() * pool.length)];
            }
            return { ...cur, [k]: { full: candidate, visible: 0 } };
          });
        }, 2200);
        ids.push(id);
      }, offsetMs);
      ids.push(timeoutId);
    }
    return () => ids.forEach((id) => clearInterval(id));
  }, [reducedMotion]);

  return captions;
}

/** Detect prefers-reduced-motion in a hydration-safe way. SSR
 *  defaults to "no preference" (animation on); after mount we
 *  flip if the user has reduced-motion set. Honours runtime
 *  changes too. */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

export function MatchingPipelineAnimation({ config }: Props) {
  const { score, tone, bandLabel } = useSampleScore(config);
  const reducedMotion = usePrefersReducedMotion();
  const inputs = useInputStream(reducedMotion);
  const middleCaptions = useMiddleCaptions(reducedMotion);

  const hiddens = [
    { id: "direct",   label: "DIRECT",   weight: config.weights.direct,   hue: SUBSCORE_HUES.direct },
    { id: "semantic", label: "SEMANTIC", weight: config.weights.semantic, hue: SUBSCORE_HUES.semantic },
    { id: "pathway",  label: "PATHWAY",  weight: config.weights.pathway,  hue: SUBSCORE_HUES.pathway },
  ];

  // Curved cubic-bezier axon between an input point and a hidden node.
  // The control points pull horizontally so each line bows like a
  // tendril, plus a small vertical jitter (seeded from indices) so the
  // mesh isn't perfectly symmetric.
  function axonPath(x1: number, y1: number, x2: number, y2: number, seed: number) {
    const dx = x2 - x1;
    const jitter = (seed % 5) * 4 - 8;
    const c1x = x1 + dx * 0.35;
    const c1y = y1 + jitter;
    const c2x = x1 + dx * 0.65;
    const c2y = y2 - jitter * 0.6;
    return `M ${x1} ${y1} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x2} ${y2}`;
  }

  return (
    <section className="relative overflow-hidden rounded-2xl ring-1 ring-inset ring-cyan-900/40 bg-[#0a0a14] mx-auto w-full">
      {/* Faint scan line top edge */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent animate-mpa-scan" aria-hidden />

      <header className="relative px-4 pt-3 pb-2 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[10px] uppercase tracking-[0.28em] font-bold text-cyan-300/80 inline-flex items-center gap-1.5 font-mono">
          <Cpu size={11} /> Live · matching engine
        </p>
        <div className="text-right">
          <p className="font-mono tabular-nums leading-none">
            <span
              className="text-2xl font-black"
              style={{ color: tone, textShadow: `0 0 16px ${tone}88` }}
            >
              {score}
            </span>
            <span className="text-slate-500 text-xs"> / 100</span>
          </p>
          <p className="text-[8.5px] font-bold tracking-[0.22em] mt-0.5" style={{ color: tone }}>
            {bandLabel}
          </p>
        </div>
      </header>

      <div className="relative px-2 pb-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet" aria-hidden>
          <defs>
            {/* ── Textures ──────────────────────────────────── */}
            {/* Slow-evolving organic noise. feTurbulence gives the
                bioform texture; tilt the seed each component mount so
                no two renders look pixel-identical. */}
            <filter id="mpa-noise">
              <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
              <feColorMatrix
                values="0 0 0 0 0.13
                        0 0 0 0 0.30
                        0 0 0 0 0.55
                        0 0 0 0.05 0"
              />
            </filter>
            {/* Glow primitive — used by pulses + halos. */}
            <filter id="mpa-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.4" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Stronger glow for the output halo. */}
            <filter id="mpa-glow-strong" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" />
            </filter>

            {/* ── Per-subscore gradients on the axons ───────── */}
            {hiddens.map((h) => (
              <linearGradient id={`mpa-axon-${h.id}`} x1="0" x2="1" key={h.id}>
                <stop offset="0%"  stopColor="#67e8f9" stopOpacity="0.95" />
                <stop offset="100%" stopColor={h.hue}  stopOpacity="0.9" />
              </linearGradient>
            ))}

            {/* Iridescent radial fill for the output node. */}
            <radialGradient id="mpa-output-fill">
              <stop offset="0%"  stopColor="#ffffff" />
              <stop offset="35%" stopColor={tone} />
              <stop offset="100%" stopColor={`${tone}11`} />
            </radialGradient>

            {/* Soft halo gradients (output + upper-left vignette). */}
            <radialGradient id="mpa-halo-output">
              <stop offset="0%"  stopColor={tone}    stopOpacity="0.45" />
              <stop offset="100%" stopColor={tone}    stopOpacity="0" />
            </radialGradient>
            <radialGradient id="mpa-halo-vignette">
              <stop offset="0%"  stopColor="#a855f7" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* ── Background passes ──────────────────────────── */}
          <rect width={W} height={H} fill="#0a0a14" />
          {/* Upper-left amethyst halo */}
          <rect width="320" height="320" x="-80" y="-100" fill="url(#mpa-halo-vignette)" />
          {/* Output halo behind the right side */}
          <rect width="320" height="320" x={OUTPUT_X - 160} y={OUTPUT_Y - 160} fill="url(#mpa-halo-output)" />
          {/* Organic noise overlay */}
          <rect width={W} height={H} filter="url(#mpa-noise)" />

          {/* ── Axons (input → hidden) ────────────────────── */}
          {/* Three layers: glow underlay, the dashed axon body, then
              a thin solid overlay. Stacking is what gives the line
              the "neural tissue" appearance. Inputs are dynamic — the
              axon mesh reweaves whenever the row count or label
              changes. We key on `inp.key` (not the loop index) so
              React can preserve the SVG elements for unchanged rows
              and smoothly cross-fade row swaps. */}
          {inputs.flatMap((inp, ii) =>
            hiddens.map((h, hi) => {
              const sw = 0.6 + (h.weight / 100) * 2.4;
              const opacity = 0.18 + (h.weight / 100) * 0.35;
              const d = axonPath(PAD_X, inp.y, HIDDEN_X, HIDDEN_YS[hi], ii * 7 + hi);
              return (
                <g key={`ih-${inp.key}-${hi}`}>
                  <path d={d} stroke={`url(#mpa-axon-${h.id})`} strokeWidth={sw * 2.4} opacity={opacity * 0.35} filter="url(#mpa-glow)" fill="none" strokeLinecap="round" />
                  <path d={d} stroke={`url(#mpa-axon-${h.id})`} strokeWidth={sw}        opacity={opacity}        fill="none" strokeLinecap="round" strokeDasharray="3 3" />
                  <path d={d} stroke={`url(#mpa-axon-${h.id})`} strokeWidth={sw * 0.4}  opacity={opacity * 1.4}  fill="none" strokeLinecap="round" />
                </g>
              );
            }),
          )}

          {/* ── Axons (hidden → output) ───────────────────── */}
          {hiddens.map((h, hi) => {
            const sw = 1.4 + (h.weight / 100) * 2.6;
            const d = axonPath(HIDDEN_X + 14, HIDDEN_YS[hi], OUTPUT_X, OUTPUT_Y, hi * 11);
            return (
              <g key={`ho-${hi}`}>
                <path d={d} stroke={`url(#mpa-axon-${h.id})`} strokeWidth={sw * 2.6} opacity="0.30" filter="url(#mpa-glow)" fill="none" strokeLinecap="round" />
                <path id={`mpa-out-${h.id}`} d={d} stroke={`url(#mpa-axon-${h.id})`} strokeWidth={sw} opacity="0.92" fill="none" strokeLinecap="round" />
                <path d={d} stroke="#ffffff" strokeWidth={sw * 0.35} opacity="0.45" fill="none" strokeLinecap="round" />
              </g>
            );
          })}

          {/* ── Pre-defined pulse paths (input → hidden → output) ──
              animateMotion needs an explicit <path id> as its source.
              We define one path per (hidden subscore, source-pick) so
              pulses ride the network spatially. Source indices are
              modulo the live input count so resizing the input
              stream doesn't break the paths. */}
          {hiddens.map((h, hi) => {
            const inputCount = Math.max(1, inputs.length);
            const sourceIdxs = [hi % inputCount, (hi + 2) % inputCount];
            return sourceIdxs.map((ii, k) => {
              const sourceY = inputs[ii]?.y ?? OUTPUT_Y;
              const d = [
                axonPath(PAD_X, sourceY, HIDDEN_X, HIDDEN_YS[hi], ii * 7 + hi),
                axonPath(HIDDEN_X + 14, HIDDEN_YS[hi], OUTPUT_X, OUTPUT_Y, hi * 11).replace(/^M [^ ]+ [^ ]+/, ""),
              ].join(" ");
              return (
                <path
                  key={`pp-${hi}-${k}`}
                  id={`mpa-pulse-${hi}-${k}`}
                  d={d}
                  fill="none"
                  stroke="none"
                  pointerEvents="none"
                />
              );
            });
          })}

          {/* ── Input nodes ─────────────────────────────────
              Each row's label types in character-by-character via
              the useInputStream hook. While typing we also render a
              one-character "caret" cursor at the end of the visible
              substring so the row reads as a live input feed. */}
          {inputs.map((inp) => {
            const visibleText = inp.fullLabel.slice(0, inp.visible);
            const stillTyping = inp.visible < inp.fullLabel.length;
            return (
              <g key={`in-${inp.key}`}>
                {/* Faint outer ring */}
                <circle cx={PAD_X} cy={inp.y} r={9} fill="none" stroke="rgba(103, 232, 249, 0.18)" strokeWidth="0.6" />
                {/* Mid ring */}
                <circle cx={PAD_X} cy={inp.y} r={6} fill="none" stroke="rgba(103, 232, 249, 0.35)" strokeWidth="0.8" />
                {/* Core */}
                <circle cx={PAD_X} cy={inp.y} r={3.5} fill="#67e8f9" filter="url(#mpa-glow)" />
                <circle cx={PAD_X} cy={inp.y} r={1.6} fill="#ffffff" />
                {/* Label + blinking caret while typing */}
                <text
                  x={PAD_X - 14} y={inp.y + 3}
                  fill="rgba(165, 243, 252, 0.62)"
                  fontSize="9"
                  fontFamily="ui-monospace, monospace"
                  textAnchor="end"
                >
                  {visibleText}
                  {stillTyping && (
                    <tspan className="mpa-caret" fill="#67e8f9">▍</tspan>
                  )}
                </text>
              </g>
            );
          })}

          {/* ── Hidden nodes (membrane rings + breathing) ──── */}
          {hiddens.map((h, hi) => {
            const y = HIDDEN_YS[hi];
            return (
              <g key={`hid-${hi}`} className={`mpa-hidden-${hi}`}>
                {/* Three concentric "membrane" rings, breathing out of
                    phase to look biological. CSS animations defined
                    below give each ring its own scale rhythm. */}
                <circle cx={HIDDEN_X} cy={y} r={16} fill="none" stroke={h.hue} strokeWidth="0.7" opacity="0.18" className={`mpa-ring mpa-ring-3-${hi}`} />
                <circle cx={HIDDEN_X} cy={y} r={12} fill="none" stroke={h.hue} strokeWidth="0.9" opacity="0.30" className={`mpa-ring mpa-ring-2-${hi}`} />
                <circle cx={HIDDEN_X} cy={y} r={9}  fill="none" stroke={h.hue} strokeWidth="1.1" opacity="0.55" className={`mpa-ring mpa-ring-1-${hi}`} />
                {/* Inner body — dark with a glow halo */}
                <circle cx={HIDDEN_X} cy={y} r={8} fill="#10101e" stroke={h.hue} strokeWidth="1.4" />
                <circle cx={HIDDEN_X} cy={y} r={3} fill={h.hue} filter="url(#mpa-glow)" />
                <text
                  x={HIDDEN_X} y={y + 3}
                  fill="#ffffff"
                  fontSize="8"
                  fontWeight="900"
                  fontFamily="ui-monospace, monospace"
                  textAnchor="middle"
                  opacity="0.85"
                >
                  {h.weight}
                </text>
                {/* Subscore label — placed to the SIDE of the node
                    in the wide canvas, not below, because vertical
                    space is tight in the new shorter strip. */}
                <text
                  x={HIDDEN_X + 22} y={y + 3}
                  fill={h.hue}
                  fontSize="8"
                  letterSpacing="2.5"
                  fontWeight="700"
                  fontFamily="ui-monospace, monospace"
                  textAnchor="start"
                  opacity="0.85"
                >
                  {h.label}
                </text>
                {/* "Now matching" rotating caption — types in below
                    the subscore label so the middle column also
                    reads as actively processing. Pool varies per
                    subscore (direct = single-token matches,
                    semantic = ≈ relationships, pathway = → graph
                    walks); see MIDDLE_CAPTION_POOLS. */}
                {(() => {
                  const cap = middleCaptions[h.id] ?? { full: "", visible: 0 };
                  const visibleText = cap.full.slice(0, cap.visible);
                  const stillTyping = cap.visible < cap.full.length;
                  return (
                    <text
                      x={HIDDEN_X + 22} y={y + 13}
                      fill="rgba(226, 232, 240, 0.60)"
                      fontSize="7"
                      fontFamily="ui-monospace, monospace"
                      textAnchor="start"
                    >
                      {visibleText}
                      {stillTyping && (
                        <tspan className="mpa-caret" fill={h.hue}>▍</tspan>
                      )}
                    </text>
                  );
                })()}
              </g>
            );
          })}

          {/* ── Output node ───────────────────────────────── */}
          <g>
            {/* Outermost "field" — large, faint */}
            <circle cx={OUTPUT_X} cy={OUTPUT_Y} r={32} fill={tone} opacity="0.08" filter="url(#mpa-glow-strong)" />
            {/* Mid membrane */}
            <circle cx={OUTPUT_X} cy={OUTPUT_Y} r={24} fill="none" stroke={tone} strokeWidth="0.7" opacity="0.32" />
            {/* Inner ring — breathes */}
            <circle cx={OUTPUT_X} cy={OUTPUT_Y} r={20} fill="none" stroke={tone} strokeWidth="1" opacity="0.55" className="mpa-output-breathe" />
            {/* Core */}
            <circle cx={OUTPUT_X} cy={OUTPUT_Y} r={16} fill="url(#mpa-output-fill)" stroke={tone} strokeWidth="1.5" filter="url(#mpa-glow)" />
            <text
              x={OUTPUT_X} y={OUTPUT_Y + 5}
              fill="#0a0a14"
              fontSize="13"
              fontWeight="900"
              fontFamily="ui-monospace, monospace"
              textAnchor="middle"
            >
              {score}
            </text>
          </g>

          {/* ── Pulses ────────────────────────────────────
              灵动 = sprightly, graceful. Each pulse is now a slow
              traveller (5.5 s end-to-end) that fades up gently as
              it leaves the input, holds full brightness through the
              middle of its journey, then dims back to invisible
              before it reaches the output. The dim-in / dim-out
              points coincide with the endpoint nodes so the pulse
              feels like it's being "received" by each node rather
              than crashing into it. */}
          {hiddens.flatMap((h, hi) => {
            const n = Math.max(1, Math.min(3, Math.round(h.weight / 25)));
            const inputCount = Math.max(1, inputs.length);
            const sourceIdxs = [hi % inputCount, (hi + 2) % inputCount];
            return sourceIdxs.flatMap((_idx, k) => {
              const dur = 5.5;
              const pulses = Array.from({ length: n }).map((__, i) => {
                const delay = (dur / n) * i + k * 0.7 + hi * 0.35;
                const colour =
                  h.id === "direct"   ? "#a5f3fc" :
                  h.id === "semantic" ? "#f0abfc" : "#fed7aa";
                return (
                  <circle
                    key={`pulse-${hi}-${k}-${i}`}
                    r={2.6}
                    fill={colour}
                    opacity={0}
                    filter="url(#mpa-glow)"
                  >
                    <animateMotion
                      dur={`${dur}s`}
                      repeatCount="indefinite"
                      begin={`${delay}s`}
                    >
                      <mpath href={`#mpa-pulse-${hi}-${k}`} />
                    </animateMotion>
                    <animate
                      attributeName="opacity"
                      values="0;0.3;1;1;0.3;0"
                      keyTimes="0;0.12;0.32;0.68;0.88;1"
                      dur={`${dur}s`}
                      repeatCount="indefinite"
                      begin={`${delay}s`}
                    />
                  </circle>
                );
              });
              return pulses;
            });
          })}
        </svg>

        {/* Footer legend — compact mono line */}
        <div className="mt-1 px-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[9.5px] font-mono text-slate-500">
          <Legend dot="#22d3ee" label="direct"   w={config.weights.direct}   />
          <Legend dot="#a855f7" label="semantic" w={config.weights.semantic} />
          <Legend dot="#f59e0b" label="pathway"  w={config.weights.pathway}  />
          <span className="ml-auto text-slate-600 hidden sm:inline">
            Σ direct·0.8 + sem·0.6 + path·0.5
          </span>
        </div>
      </div>

      {/* Local keyframes for the textures. Two ring rhythms per hidden
          node so they breathe out of phase (more organic). */}
      <style jsx>{`
        @keyframes mpa-scan {
          0%   { transform: translateY(0);     opacity: 0; }
          12%  { opacity: 0.9; }
          50%  { transform: translateY(${H}px); opacity: 0.6; }
          88%  { opacity: 0.3; }
          100% { transform: translateY(${H}px); opacity: 0; }
        }
        @keyframes mpa-ring-a {
          0%, 100% { transform: scale(1);    opacity: 0.18; }
          50%      { transform: scale(1.18); opacity: 0.32; }
        }
        @keyframes mpa-ring-b {
          0%, 100% { transform: scale(1);    opacity: 0.30; }
          50%      { transform: scale(1.12); opacity: 0.50; }
        }
        @keyframes mpa-ring-c {
          0%, 100% { transform: scale(1);    opacity: 0.55; }
          50%      { transform: scale(1.07); opacity: 0.80; }
        }
        @keyframes mpa-output-breathe {
          0%, 100% { transform: scale(1);    opacity: 0.55; }
          50%      { transform: scale(1.10); opacity: 0.95; }
        }
        .animate-mpa-scan { animation: mpa-scan 6s ease-in-out infinite; }
        :global(.mpa-ring) {
          transform-box: fill-box;
          transform-origin: center;
        }
        :global(.mpa-ring-3-0) { animation: mpa-ring-a 4.6s ease-in-out infinite; }
        :global(.mpa-ring-2-0) { animation: mpa-ring-b 3.8s ease-in-out infinite; }
        :global(.mpa-ring-1-0) { animation: mpa-ring-c 3.0s ease-in-out infinite; }
        :global(.mpa-ring-3-1) { animation: mpa-ring-a 4.6s ease-in-out infinite -0.7s; }
        :global(.mpa-ring-2-1) { animation: mpa-ring-b 3.8s ease-in-out infinite -1.1s; }
        :global(.mpa-ring-1-1) { animation: mpa-ring-c 3.0s ease-in-out infinite -1.5s; }
        :global(.mpa-ring-3-2) { animation: mpa-ring-a 4.6s ease-in-out infinite -1.9s; }
        :global(.mpa-ring-2-2) { animation: mpa-ring-b 3.8s ease-in-out infinite -2.3s; }
        :global(.mpa-ring-1-2) { animation: mpa-ring-c 3.0s ease-in-out infinite -0.4s; }
        :global(.mpa-output-breathe) {
          animation: mpa-output-breathe 3.4s ease-in-out infinite;
          transform-box: fill-box;
          transform-origin: center;
        }
        @keyframes mpa-caret-blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        :global(.mpa-caret) {
          animation: mpa-caret-blink 0.9s steps(2) infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-mpa-scan,
          :global(.mpa-ring),
          :global(.mpa-output-breathe),
          :global(.mpa-caret) { animation: none; }
        }
      `}</style>
    </section>
  );
}

function Legend({ dot, label, w }: { dot: string; label: string; w: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-slate-400">
      <span className="inline-block w-2 h-2 rounded-full" style={{ background: dot, boxShadow: `0 0 6px ${dot}` }} />
      <span className="text-slate-300">{label}</span>
      <span className="text-slate-500 tabular-nums">w={w}</span>
    </span>
  );
}
