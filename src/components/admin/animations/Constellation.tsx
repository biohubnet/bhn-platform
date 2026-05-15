"use client";
/**
 * Variant 5 — "Constellation".
 *
 * Three star clusters in a night sky, one per subscore. Each
 * cluster's star count scales with the weight; connecting lines
 * form the constellation pattern. A central "Polaris" (the fit
 * score) sits in the middle, with faint lines drawn to one anchor
 * star in each cluster.
 *
 * Aesthetic: calm, cosmic, contemplative. Stars twinkle gently;
 * Polaris breathes. Lots of negative space.
 */
import { useMemo } from "react";
import { Stars } from "lucide-react";
import { useSampleScore, SUBSCORE_HUES } from "@/components/admin/animations/shared";
import type { MatchingConfig } from "@/lib/matching/config";

interface Props { config: MatchingConfig }

const W = 460;
const H = 240;
const POLARIS_X = W / 2;
const POLARIS_Y = H / 2;

interface Star { x: number; y: number; r: number; twinkleDelay: number }
interface Cluster {
  id: "direct" | "semantic" | "pathway";
  label: string;
  colour: string;
  weight: number;
  cx: number;     // cluster centre x
  cy: number;
  stars: Star[];
  anchor: Star;   // star Polaris connects to
}

export function Constellation({ config }: Props) {
  const { score, tone, bandLabel } = useSampleScore(config);

  // Generate stars deterministically per weight so they don't jump
  // around on slider drag — only re-laid-out when the weight
  // crosses a bucket boundary.
  const clusters: Cluster[] = useMemo(() => {
    function makeCluster(
      id: Cluster["id"],
      label: string,
      colour: string,
      weight: number,
      cx: number,
      cy: number,
    ): Cluster {
      // Star count scales with weight: 3..10
      const n = Math.max(3, Math.min(10, 3 + Math.floor(weight / 14)));
      // Seeded pseudo-random based on cx+cy so positions are stable
      let seed = Math.round(cx * 1000 + cy);
      const rand = () => {
        seed = (seed * 16807) % 2147483647;
        return (seed % 1000) / 1000;
      };
      const stars: Star[] = Array.from({ length: n }).map(() => ({
        x: cx + (rand() - 0.5) * 80,
        y: cy + (rand() - 0.5) * 60,
        r: 1.2 + rand() * 1.8,
        twinkleDelay: rand() * 3,
      }));
      // Anchor = the largest star (visually closest to "the star")
      const anchor = stars.reduce((a, b) => (b.r > a.r ? b : a), stars[0]);
      return { id, label, colour, weight, cx, cy, stars, anchor };
    }
    return [
      makeCluster("direct",   "DIRECT",   SUBSCORE_HUES.direct,   config.weights.direct,   90,  60),
      makeCluster("semantic", "SEMANTIC", SUBSCORE_HUES.semantic, config.weights.semantic, 90,  180),
      makeCluster("pathway",  "PATHWAY",  SUBSCORE_HUES.pathway,  config.weights.pathway,  380, 60),
    ];
  }, [config.weights.direct, config.weights.semantic, config.weights.pathway]);

  // A few ambient background stars for depth
  const ambientStars = useMemo(() => {
    let seed = 42;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed % 1000) / 1000;
    };
    return Array.from({ length: 26 }).map(() => ({
      x: rand() * W,
      y: rand() * H,
      r: 0.4 + rand() * 0.6,
      o: 0.15 + rand() * 0.3,
    }));
  }, []);

  return (
    <section className="relative overflow-hidden rounded-2xl ring-1 ring-inset ring-cyan-900/40 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950">
      <header className="relative px-5 pt-4 pb-2 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[10px] uppercase tracking-[0.28em] font-bold text-cyan-300/80 inline-flex items-center gap-1.5 font-mono">
          <Stars size={11} /> Constellation
        </p>
        <div className="text-right">
          <p className="font-mono tabular-nums leading-none">
            <span className="text-3xl font-black" style={{ color: tone, textShadow: `0 0 18px ${tone}80` }}>{score}</span>
            <span className="text-slate-500 text-sm"> /100</span>
          </p>
          <p className="text-[9px] font-bold tracking-[0.22em] mt-0.5" style={{ color: tone }}>
            {bandLabel}
          </p>
        </div>
      </header>

      <div className="relative px-5 pb-4 pt-1">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
          <defs>
            <radialGradient id="con-polaris">
              <stop offset="0%"  stopColor="#ffffff" />
              <stop offset="50%" stopColor={tone} />
              <stop offset="100%" stopColor={`${tone}11`} />
            </radialGradient>
            <filter id="con-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Ambient stars */}
          {ambientStars.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="rgba(255,255,255,0.6)" opacity={s.o} />
          ))}

          {/* Constellation lines per cluster — connect stars in a
              gentle path so they form a recognisable shape. */}
          {clusters.map((c) => {
            const pts = c.stars.map((s) => `${s.x},${s.y}`).join(" ");
            return (
              <g key={`lines-${c.id}`}>
                <polyline
                  points={pts}
                  fill="none"
                  stroke={`${c.colour}60`}
                  strokeWidth={0.7}
                  strokeDasharray="3 2"
                />
                {/* Polaris connection */}
                <line
                  x1={POLARIS_X}
                  y1={POLARIS_Y}
                  x2={c.anchor.x}
                  y2={c.anchor.y}
                  stroke={`${c.colour}40`}
                  strokeWidth={0.6}
                  strokeDasharray="1 5"
                />
              </g>
            );
          })}

          {/* Stars within clusters */}
          {clusters.map((c) =>
            c.stars.map((s, i) => (
              <g key={`${c.id}-s-${i}`}>
                <circle
                  cx={s.x} cy={s.y}
                  r={s.r * 2}
                  fill={c.colour}
                  opacity={0.18}
                  filter="url(#con-glow)"
                />
                <circle
                  cx={s.x} cy={s.y}
                  r={s.r}
                  fill="#ffffff"
                  className="con-twinkle"
                  style={{ animationDelay: `${s.twinkleDelay}s` }}
                />
              </g>
            )),
          )}

          {/* Cluster labels (faint, near the centre of each cluster) */}
          {clusters.map((c) => (
            <text
              key={`label-${c.id}`}
              x={c.cx}
              y={c.cy + 50}
              fill={c.colour}
              fontSize="9"
              letterSpacing="3"
              fontWeight="700"
              textAnchor="middle"
              fontFamily="ui-monospace, monospace"
            >
              {c.label}  <tspan fill="rgba(148,163,184,0.7)">w={c.weight}</tspan>
            </text>
          ))}

          {/* Polaris — central fit-score */}
          <circle
            cx={POLARIS_X} cy={POLARIS_Y}
            r={24}
            fill={tone}
            opacity={0.18}
            filter="url(#con-glow)"
            className="con-polaris-breathe"
          />
          <circle
            cx={POLARIS_X} cy={POLARIS_Y}
            r={16}
            fill="url(#con-polaris)"
            stroke={tone}
            strokeWidth={1.5}
            filter="url(#con-glow)"
          />
          <text
            x={POLARIS_X} y={POLARIS_Y + 4}
            fill="#0f172a"
            fontSize="12"
            fontWeight="900"
            fontFamily="ui-monospace, monospace"
            textAnchor="middle"
          >
            {score}
          </text>
          <text
            x={POLARIS_X} y={POLARIS_Y + 32}
            fill="rgba(148, 163, 184, 0.65)"
            fontSize="8"
            letterSpacing="3"
            fontWeight="700"
            fontFamily="ui-monospace, monospace"
            textAnchor="middle"
          >
            POLARIS
          </text>
        </svg>

        <style jsx>{`
          @keyframes con-twinkle {
            0%, 100% { opacity: 0.55; transform: scale(1); }
            50%      { opacity: 1;    transform: scale(1.4); }
          }
          @keyframes con-polaris-breathe {
            0%, 100% { opacity: 0.18; transform: scale(1); }
            50%      { opacity: 0.32; transform: scale(1.15); }
          }
          :global(.con-twinkle) {
            animation: con-twinkle 3.4s ease-in-out infinite;
            transform-box: fill-box;
            transform-origin: center;
          }
          :global(.con-polaris-breathe) {
            animation: con-polaris-breathe 3.6s ease-in-out infinite;
            transform-box: fill-box;
            transform-origin: center;
          }
          @media (prefers-reduced-motion: reduce) {
            :global(.con-twinkle), :global(.con-polaris-breathe) { animation: none; }
          }
        `}</style>
      </div>
    </section>
  );
}
