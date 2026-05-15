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
 */
import { Cpu } from "lucide-react";
import { useSampleScore, SUBSCORE_HUES } from "@/components/admin/animations/shared";
import type { MatchingConfig } from "@/lib/matching/config";

interface Props { config: MatchingConfig }

// ── Geometry ─────────────────────────────────────────────────────
// Compact viewBox; the panel sits inside the centered max-w-5xl
// column rather than going full-bleed.
const W = 620;
const H = 280;
const PAD_X = 70;

// Five input rows, three hidden rows, one output. y-positions chosen
// asymmetrically so the network looks grown, not generated.
const INPUTS = [
  { y: 40,  label: "cell culture" },
  { y: 88,  label: "aseptic" },
  { y: 138, label: "GMP doc" },
  { y: 188, label: "bioreactor" },
  { y: 238, label: "QA" },
];
const HIDDEN_YS = [70, 140, 210];
const OUTPUT_Y = 140;
const HIDDEN_X = W / 2 - 20;
const OUTPUT_X = W - PAD_X - 10;

export function MatchingPipelineAnimation({ config }: Props) {
  const { score, tone, bandLabel } = useSampleScore(config);

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
    <section className="relative overflow-hidden rounded-2xl ring-1 ring-inset ring-cyan-900/40 bg-[#0a0a14] mx-auto" style={{ maxWidth: 700 }}>
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
              the "neural tissue" appearance. */}
          {INPUTS.flatMap((inp, ii) =>
            hiddens.map((h, hi) => {
              const sw = 0.6 + (h.weight / 100) * 2.4;
              const opacity = 0.18 + (h.weight / 100) * 0.35;
              const d = axonPath(PAD_X, inp.y, HIDDEN_X, HIDDEN_YS[hi], ii * 7 + hi);
              return (
                <g key={`ih-${ii}-${hi}`}>
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
              pulses ride the network spatially. */}
          {hiddens.map((h, hi) => {
            const sourceIdxs = [hi % INPUTS.length, (hi + 2) % INPUTS.length];
            return sourceIdxs.map((ii, k) => {
              const d = [
                axonPath(PAD_X, INPUTS[ii].y, HIDDEN_X, HIDDEN_YS[hi], ii * 7 + hi),
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

          {/* ── Input nodes ───────────────────────────────── */}
          {INPUTS.map((inp, i) => (
            <g key={`in-${i}`}>
              {/* Faint outer ring */}
              <circle cx={PAD_X} cy={inp.y} r={9} fill="none" stroke="rgba(103, 232, 249, 0.18)" strokeWidth="0.6" />
              {/* Mid ring */}
              <circle cx={PAD_X} cy={inp.y} r={6} fill="none" stroke="rgba(103, 232, 249, 0.35)" strokeWidth="0.8" />
              {/* Core */}
              <circle cx={PAD_X} cy={inp.y} r={3.5} fill="#67e8f9" filter="url(#mpa-glow)" />
              <circle cx={PAD_X} cy={inp.y} r={1.6} fill="#ffffff" />
              {/* Label — small, mono, dimmed */}
              <text
                x={PAD_X - 14} y={inp.y + 3}
                fill="rgba(165, 243, 252, 0.55)"
                fontSize="9"
                fontFamily="ui-monospace, monospace"
                textAnchor="end"
              >
                {inp.label}
              </text>
            </g>
          ))}

          {/* ── Hidden nodes (membrane rings + breathing) ──── */}
          {hiddens.map((h, hi) => {
            const y = HIDDEN_YS[hi];
            return (
              <g key={`hid-${hi}`} className={`mpa-hidden-${hi}`}>
                {/* Three concentric "membrane" rings, breathing out of
                    phase to look biological. CSS animations defined
                    below give each ring its own scale rhythm. */}
                <circle cx={HIDDEN_X} cy={y} r={20} fill="none" stroke={h.hue} strokeWidth="0.7" opacity="0.18" className={`mpa-ring mpa-ring-3-${hi}`} />
                <circle cx={HIDDEN_X} cy={y} r={15} fill="none" stroke={h.hue} strokeWidth="0.9" opacity="0.30" className={`mpa-ring mpa-ring-2-${hi}`} />
                <circle cx={HIDDEN_X} cy={y} r={11} fill="none" stroke={h.hue} strokeWidth="1.1" opacity="0.55" className={`mpa-ring mpa-ring-1-${hi}`} />
                {/* Inner body — dark with a glow halo */}
                <circle cx={HIDDEN_X} cy={y} r={10} fill="#10101e" stroke={h.hue} strokeWidth="1.4" />
                <circle cx={HIDDEN_X} cy={y} r={4} fill={h.hue} filter="url(#mpa-glow)" />
                <text
                  x={HIDDEN_X} y={y + 3}
                  fill="#ffffff"
                  fontSize="9"
                  fontWeight="900"
                  fontFamily="ui-monospace, monospace"
                  textAnchor="middle"
                  opacity="0.85"
                >
                  {h.weight}
                </text>
                <text
                  x={HIDDEN_X} y={y + 30}
                  fill={h.hue}
                  fontSize="8"
                  letterSpacing="2.5"
                  fontWeight="700"
                  fontFamily="ui-monospace, monospace"
                  textAnchor="middle"
                  opacity="0.85"
                >
                  {h.label}
                </text>
              </g>
            );
          })}

          {/* ── Output node ───────────────────────────────── */}
          <g>
            {/* Outermost "field" — large, faint */}
            <circle cx={OUTPUT_X} cy={OUTPUT_Y} r={38} fill={tone} opacity="0.08" filter="url(#mpa-glow-strong)" />
            {/* Mid membrane */}
            <circle cx={OUTPUT_X} cy={OUTPUT_Y} r={30} fill="none" stroke={tone} strokeWidth="0.7" opacity="0.32" />
            {/* Inner ring — breathes */}
            <circle cx={OUTPUT_X} cy={OUTPUT_Y} r={26} fill="none" stroke={tone} strokeWidth="1" opacity="0.55" className="mpa-output-breathe" />
            {/* Core */}
            <circle cx={OUTPUT_X} cy={OUTPUT_Y} r={20} fill="url(#mpa-output-fill)" stroke={tone} strokeWidth="1.5" filter="url(#mpa-glow)" />
            <text
              x={OUTPUT_X} y={OUTPUT_Y + 5}
              fill="#0a0a14"
              fontSize="14"
              fontWeight="900"
              fontFamily="ui-monospace, monospace"
              textAnchor="middle"
            >
              {score}
            </text>
          </g>

          {/* ── Pulses ────────────────────────────────────── */}
          {hiddens.flatMap((h, hi) => {
            const n = Math.max(1, Math.min(3, Math.round(h.weight / 25)));
            const sourceIdxs = [hi % INPUTS.length, (hi + 2) % INPUTS.length];
            return sourceIdxs.flatMap((_idx, k) => {
              const dur = 3.0;
              const pulses = Array.from({ length: n }).map((__, i) => {
                const delay = (dur / n) * i + k * 0.45 + hi * 0.22;
                const colour =
                  h.id === "direct"   ? "#a5f3fc" :
                  h.id === "semantic" ? "#f0abfc" : "#fed7aa";
                return (
                  <circle
                    key={`pulse-${hi}-${k}-${i}`}
                    r={2.6}
                    fill={colour}
                    filter="url(#mpa-glow)"
                  >
                    <animateMotion
                      dur={`${dur}s`}
                      repeatCount="indefinite"
                      begin={`${delay}s`}
                    >
                      <mpath href={`#mpa-pulse-${hi}-${k}`} />
                    </animateMotion>
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
        @media (prefers-reduced-motion: reduce) {
          .animate-mpa-scan,
          :global(.mpa-ring),
          :global(.mpa-output-breathe) { animation: none; }
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
