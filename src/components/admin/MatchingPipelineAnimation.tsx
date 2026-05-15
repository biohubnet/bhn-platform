"use client";
/**
 * Hi-tech neural-network visualization for /admin/matching-config.
 *
 * Compact 3-layer feed-forward network rendered as glowing nodes +
 * weighted connections:
 *
 *   INPUT (5 nodes)  →  HIDDEN (3 subscore nodes)  →  OUTPUT (score)
 *        ●─┐                  ●  direct
 *        ●─┼─────────────────▶●  semantic ─────────▶ ●  74 / 100
 *        ●─┘                  ●  pathway
 *        ●
 *        ●
 *
 * Each input is wired to every hidden node (full mesh). Hidden-to-
 * output edges carry the live subscore weight — heavier weight =
 * brighter line + faster pulse. Pulses ride the edges as glowing
 * tracers (SVG animateMotion). The output node breathes faster as
 * the sample score climbs into the "strong" band.
 *
 * Why this shape instead of the earlier circuit diagram
 *   The previous version (boxes + curved pipes) read as a process
 *   diagram. This one reads as the actual model — a small neural net
 *   — which is closer to what the engine literally is (linear
 *   combination of subscores with weights). Same data, more
 *   technically honest visualization, more compact (240 px tall vs.
 *   400+), and breathing room inside the SVG so the rounded panel
 *   corners no longer clip the outer nodes.
 */
import { useEffect, useMemo, useState } from "react";
import { Cpu, Network } from "lucide-react";
import type { MatchingConfig } from "@/lib/matching/config";

interface Props {
  config: MatchingConfig;
}

// Typical-utilisation per subscore — drives the sample score so the
// network reacts to weight changes in real time.
const SAMPLE_UTIL = { direct: 0.80, semantic: 0.60, pathway: 0.50 } as const;

// SVG canvas — kept compact. Internal padding (LAYER_INPUT_X = 90 instead
// of 20) ensures the outer nodes never kiss the rounded-2xl panel edge.
const W = 820;
const H = 260;
const LAYER_INPUT_X  = 110;
const LAYER_HIDDEN_X = 410;
const LAYER_OUTPUT_X = 690;
const INPUT_YS  = [50, 100, 150, 200, 235];
const HIDDEN_YS = [90, 145, 200];
const OUTPUT_Y  = 145;

const INPUT_LABELS = [
  "cell culture",
  "aseptic",
  "GMP doc",
  "bioreactor",
  "QA",
];

interface HiddenLayer {
  id: "direct" | "semantic" | "pathway";
  label: string;
  weight: number;
}

export function MatchingPipelineAnimation({ config }: Props) {
  const targetScore = useMemo(() => {
    const s =
      config.weights.direct   * SAMPLE_UTIL.direct +
      config.weights.semantic * SAMPLE_UTIL.semantic +
      config.weights.pathway  * SAMPLE_UTIL.pathway;
    return Math.max(0, Math.min(100, Math.round(s)));
  }, [config.weights]);

  // Eased counter for the score readout — re-runs whenever weights
  // change.
  const [displayScore, setDisplayScore] = useState(targetScore);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const start = displayScore;
    const dur = 700;
    function tick() {
      const t = Math.min(1, (performance.now() - t0) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayScore(Math.round(start + (targetScore - start) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetScore]);

  const hiddens: HiddenLayer[] = [
    { id: "direct",   label: "DIRECT",   weight: config.weights.direct },
    { id: "semantic", label: "SEMANTIC", weight: config.weights.semantic },
    { id: "pathway",  label: "PATHWAY",  weight: config.weights.pathway },
  ];

  // Pulses per hidden→output edge — 1..3 depending on weight.
  const pulses = (w: number) => Math.max(1, Math.min(3, Math.round(w / 25)));

  // Band classification for the output node tint.
  const band =
    displayScore >= config.bands.high   ? "high" :
    displayScore >= config.bands.medium ? "med"  : "low";
  const outputColour =
    band === "high" ? "#34d399" :
    band === "med"  ? "#fbbf24" : "#94a3b8";
  const bandLabel =
    band === "high" ? "STRONG" :
    band === "med"  ? "POSSIBLE" : "WEAK";

  return (
    <section className="relative overflow-hidden rounded-2xl ring-1 ring-inset ring-cyan-900/40 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Top scan line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent animate-mpa-scan" aria-hidden />
      {/* Soft radial halo at the output node — visual centre of gravity */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 220,
          height: 220,
          right: "11%",
          top: "30%",
          background: `radial-gradient(circle, ${outputColour}33 0%, transparent 70%)`,
          filter: "blur(20px)",
        }}
        aria-hidden
      />

      <header className="relative px-5 pt-4 pb-2 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] font-bold text-cyan-300/80 inline-flex items-center gap-1.5">
            <Cpu size={11} /> Neural fit network · live
          </p>
          <h3 className="text-base font-bold text-slate-100 tracking-tight mt-0.5 inline-flex items-center gap-2">
            <Network size={14} className="text-cyan-300" />
            Matching engine
          </h3>
        </div>
        <div className="text-right">
          <p className="text-[9px] uppercase tracking-[0.22em] font-bold text-slate-500">
            sample fit
          </p>
          <p className="font-mono tabular-nums leading-none mt-0.5">
            <span
              className="text-3xl font-black"
              style={{ color: outputColour, textShadow: `0 0 18px ${outputColour}80` }}
            >
              {displayScore}
            </span>
            <span className="text-slate-500 text-sm">/100</span>
          </p>
          <p
            className="text-[9px] font-bold tracking-[0.22em] mt-0.5"
            style={{ color: outputColour }}
          >
            {bandLabel}
          </p>
        </div>
      </header>

      <div className="relative px-2 pb-4 pt-1">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden
        >
          <defs>
            {/* Background grid */}
            <pattern id="mpa-grid" width="22" height="22" patternUnits="userSpaceOnUse">
              <path d="M 22 0 L 0 0 0 22" fill="none" stroke="rgba(56,189,248,0.06)" strokeWidth="0.5" />
            </pattern>
            {/* Edge gradients per subscore */}
            <linearGradient id="mpa-edge-direct" x1="0" x2="1">
              <stop offset="0%"  stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
            <linearGradient id="mpa-edge-semantic" x1="0" x2="1">
              <stop offset="0%"  stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
            <linearGradient id="mpa-edge-pathway" x1="0" x2="1">
              <stop offset="0%"  stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
            {/* Node fill — radial so nodes look like glowing orbs */}
            <radialGradient id="mpa-node-cyan">
              <stop offset="0%" stopColor="#67e8f9" />
              <stop offset="60%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#0e7490" />
            </radialGradient>
            <radialGradient id="mpa-node-output">
              <stop offset="0%"  stopColor="#ffffff" />
              <stop offset="40%" stopColor={outputColour} />
              <stop offset="100%" stopColor={`${outputColour}33`} />
            </radialGradient>
            <filter id="mpa-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect width={W} height={H} fill="url(#mpa-grid)" />

          {/* Layer divider rules — subtle vertical guidelines that
              hint at the network's depth without shouting. */}
          {[LAYER_INPUT_X, LAYER_HIDDEN_X, LAYER_OUTPUT_X].map((x) => (
            <line
              key={x}
              x1={x} x2={x}
              y1={20} y2={H - 30}
              stroke="rgba(56,189,248,0.05)"
              strokeWidth="0.6"
              strokeDasharray="2 4"
            />
          ))}

          {/* Layer labels */}
          <text x={LAYER_INPUT_X}  y={20} fill="rgba(56, 189, 248, 0.55)" fontSize="9" letterSpacing="3" fontWeight="700" textAnchor="middle" fontFamily="ui-monospace, monospace">INPUT</text>
          <text x={LAYER_HIDDEN_X} y={20} fill="rgba(56, 189, 248, 0.55)" fontSize="9" letterSpacing="3" fontWeight="700" textAnchor="middle" fontFamily="ui-monospace, monospace">HIDDEN</text>
          <text x={LAYER_OUTPUT_X} y={20} fill="rgba(56, 189, 248, 0.55)" fontSize="9" letterSpacing="3" fontWeight="700" textAnchor="middle" fontFamily="ui-monospace, monospace">FIT</text>

          {/* ── Edges: input × hidden (full mesh) ──────────── */}
          {INPUT_YS.flatMap((iy, ii) =>
            hiddens.map((h, hi) => {
              const hy = HIDDEN_YS[hi];
              const weight = h.weight;
              // Edge opacity ramps with weight (heavier = brighter
              // mesh) but stays subtle (< 0.45) to leave the pulses
              // as the focal motion.
              const opacity = 0.12 + (weight / 100) * 0.30;
              const stroke = `url(#mpa-edge-${h.id})`;
              return (
                <line
                  key={`ih-${ii}-${hi}`}
                  x1={LAYER_INPUT_X}
                  y1={iy}
                  x2={LAYER_HIDDEN_X}
                  y2={hy}
                  stroke={stroke}
                  strokeWidth="0.8"
                  opacity={opacity}
                />
              );
            }),
          )}

          {/* ── Edges: hidden × output ────────────────────── */}
          {hiddens.map((h, hi) => {
            const hy = HIDDEN_YS[hi];
            const weight = h.weight;
            const sw = 0.6 + (weight / 100) * 2.4;
            return (
              <g key={`ho-${hi}`}>
                {/* Glow underlay so heavy weights pop */}
                <line
                  x1={LAYER_HIDDEN_X} y1={hy}
                  x2={LAYER_OUTPUT_X} y2={OUTPUT_Y}
                  stroke={`url(#mpa-edge-${h.id})`}
                  strokeWidth={sw * 2.4}
                  opacity={0.18}
                  filter="url(#mpa-glow)"
                />
                <line
                  id={`mpa-edge-out-${h.id}`}
                  x1={LAYER_HIDDEN_X} y1={hy}
                  x2={LAYER_OUTPUT_X} y2={OUTPUT_Y}
                  stroke={`url(#mpa-edge-${h.id})`}
                  strokeWidth={sw}
                  opacity={0.85}
                />
              </g>
            );
          })}

          {/* ── Pulse paths (invisible carriers for animateMotion) ──
              Pulses ride from a chosen input → hidden → output.
              We pre-define a few combos per subscore so the network
              "fires" in the spatially-correct order. */}
          {hiddens.map((h, hi) => {
            const hy = HIDDEN_YS[hi];
            // Pick 2 distinct input rows for this subscore. The
            // indices below give every hidden node a different pair.
            const sourceIdxs = [hi % INPUT_YS.length, (hi + 2) % INPUT_YS.length];
            return sourceIdxs.map((ii, k) => (
              <path
                key={`pulse-${hi}-${k}`}
                id={`mpa-pulse-${hi}-${k}`}
                d={`M ${LAYER_INPUT_X} ${INPUT_YS[ii]} L ${LAYER_HIDDEN_X} ${hy} L ${LAYER_OUTPUT_X} ${OUTPUT_Y}`}
                fill="none"
                stroke="none"
                pointerEvents="none"
              />
            ));
          })}

          {/* ── Input nodes ────────────────────────────────── */}
          {INPUT_YS.map((y, i) => (
            <g key={`input-${i}`}>
              <circle
                cx={LAYER_INPUT_X}
                cy={y}
                r={7}
                fill="url(#mpa-node-cyan)"
                stroke="rgba(255,255,255,0.25)"
                strokeWidth="1"
                filter="url(#mpa-glow)"
              />
              <circle
                cx={LAYER_INPUT_X}
                cy={y}
                r={3}
                fill="rgba(255,255,255,0.6)"
              />
              <text
                x={LAYER_INPUT_X - 14}
                y={y + 3}
                fill="rgba(165, 243, 252, 0.75)"
                fontSize="10"
                fontFamily="ui-monospace, monospace"
                textAnchor="end"
              >
                {INPUT_LABELS[i] ?? ""}
              </text>
            </g>
          ))}

          {/* ── Hidden nodes ────────────────────────────────── */}
          {hiddens.map((h, hi) => {
            const y = HIDDEN_YS[hi];
            const colour =
              h.id === "direct"   ? "#22d3ee" :
              h.id === "semantic" ? "#a855f7" : "#f59e0b";
            return (
              <g key={`hidden-${hi}`}>
                <circle
                  cx={LAYER_HIDDEN_X}
                  cy={y}
                  r={11}
                  fill={colour}
                  opacity={0.18}
                  filter="url(#mpa-glow)"
                />
                <circle
                  cx={LAYER_HIDDEN_X}
                  cy={y}
                  r={9}
                  fill="#0f172a"
                  stroke={colour}
                  strokeWidth="1.5"
                />
                <text
                  x={LAYER_HIDDEN_X}
                  y={y + 3}
                  fill={colour}
                  fontSize="9"
                  fontFamily="ui-monospace, monospace"
                  textAnchor="middle"
                  fontWeight="700"
                >
                  {h.weight}
                </text>
                <text
                  x={LAYER_HIDDEN_X}
                  y={y + 24}
                  fill="rgba(165, 243, 252, 0.65)"
                  fontSize="9"
                  letterSpacing="1.5"
                  fontFamily="ui-monospace, monospace"
                  textAnchor="middle"
                >
                  {h.label}
                </text>
              </g>
            );
          })}

          {/* ── Output node ─────────────────────────────────── */}
          <g>
            <circle
              cx={LAYER_OUTPUT_X}
              cy={OUTPUT_Y}
              r={26}
              fill={outputColour}
              opacity={0.12}
              filter="url(#mpa-glow)"
              className="animate-mpa-output-breathe"
            />
            <circle
              cx={LAYER_OUTPUT_X}
              cy={OUTPUT_Y}
              r={18}
              fill="url(#mpa-node-output)"
              stroke={outputColour}
              strokeWidth="1.5"
              filter="url(#mpa-glow)"
            />
            <text
              x={LAYER_OUTPUT_X}
              y={OUTPUT_Y + 4}
              fill="#0f172a"
              fontSize="13"
              fontWeight="900"
              fontFamily="ui-monospace, monospace"
              textAnchor="middle"
            >
              {displayScore}
            </text>
          </g>

          {/* ── Pulses (animateMotion along the pre-defined paths) ─
              Pulses-per-subscore scales with weight. Speed is the
              same across subscores so visual rhythm stays calm; the
              count is what changes. */}
          {hiddens.flatMap((h, hi) => {
            const n = pulses(h.weight);
            const sourceIdxs = [hi % INPUT_YS.length, (hi + 2) % INPUT_YS.length];
            return sourceIdxs.flatMap((_idx, k) => {
              return Array.from({ length: n }).map((__, i) => {
                const dur = 2.6;
                const delay = (dur / n) * i + k * 0.35 + hi * 0.18;
                const colour =
                  h.id === "direct"   ? "#67e8f9" :
                  h.id === "semantic" ? "#d8b4fe" : "#fcd34d";
                return (
                  <circle
                    key={`p-${hi}-${k}-${i}`}
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
            });
          })}
        </svg>

        {/* Compact metric footer — same data the sliders write, in
            the engine's own neutral tongue. */}
        <div className="mt-1 px-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[10px] font-mono text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full" style={{ background: "#22d3ee", boxShadow: "0 0 6px #22d3ee" }} />
            direct <span className="text-slate-200 tabular-nums">w={config.weights.direct}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full" style={{ background: "#a855f7", boxShadow: "0 0 6px #a855f7" }} />
            semantic <span className="text-slate-200 tabular-nums">w={config.weights.semantic}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full" style={{ background: "#f59e0b", boxShadow: "0 0 6px #f59e0b" }} />
            pathway <span className="text-slate-200 tabular-nums">w={config.weights.pathway}</span>
          </span>
          <span className="text-slate-600 ml-auto">
            Σ direct·{SAMPLE_UTIL.direct} + sem·{SAMPLE_UTIL.semantic} + path·{SAMPLE_UTIL.pathway}
          </span>
        </div>
      </div>

      <style jsx>{`
        @keyframes mpa-scan {
          0%   { transform: translateY(0);     opacity: 0; }
          12%  { opacity: 1; }
          50%  { transform: translateY(${H}px); opacity: 0.8; }
          88%  { opacity: 0.4; }
          100% { transform: translateY(${H}px); opacity: 0; }
        }
        @keyframes mpa-output-breathe {
          0%, 100% { transform: scale(1);     opacity: 0.12; }
          50%      { transform: scale(1.18);  opacity: 0.28; }
        }
        .animate-mpa-scan { animation: mpa-scan 6s ease-in-out infinite; }
        :global(.animate-mpa-output-breathe) {
          animation: mpa-output-breathe 2.6s ease-in-out infinite;
          transform-box: fill-box;
          transform-origin: center;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-mpa-scan,
          :global(.animate-mpa-output-breathe) { animation: none; }
        }
      `}</style>
    </section>
  );
}
