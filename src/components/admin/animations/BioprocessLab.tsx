"use client";
/**
 * Variant 2 — "Bioprocess lab".
 *
 * Three lab burettes drip into a central beaker. Each burette is
 * filled to a level equal to its subscore weight; drop frequency
 * matches the weight (heavier weight = more drops per second). The
 * beaker fills with a blended liquid whose level encodes the fit
 * score and tints toward the band colour.
 *
 * Aesthetic: glassware + biomanufacturing — the closest visual
 * metaphor to what BHN actually does. Soft luminance on the glass,
 * gentle bubbles in the beaker.
 */
import { useEffect, useState } from "react";
import { FlaskConical } from "lucide-react";
import { useSampleScore, SUBSCORE_HUES } from "@/components/admin/animations/shared";
import type { MatchingConfig } from "@/lib/matching/config";

interface Props { config: MatchingConfig }

interface Drop { id: number; channel: 0 | 1 | 2; x: number }

export function BioprocessLab({ config }: Props) {
  const { score, tone, bandLabel } = useSampleScore(config);

  // Drop generator — each channel emits drops at a rate proportional
  // to its weight. Drops fall over ~1.2 s; we mount them into the DOM
  // and let CSS keyframes do the visible work.
  const [drops, setDrops] = useState<Drop[]>([]);
  useEffect(() => {
    let next = 0;
    const channels: Array<{ idx: 0 | 1 | 2; weight: number; x: number }> = [
      { idx: 0, weight: config.weights.direct,   x: 110 },
      { idx: 1, weight: config.weights.semantic, x: 230 },
      { idx: 2, weight: config.weights.pathway,  x: 350 },
    ];
    const timers = channels.map((c) =>
      setInterval(() => {
        if (c.weight <= 0) return;
        setDrops((prev) => [...prev.slice(-30), { id: ++next, channel: c.idx, x: c.x }]);
      }, Math.max(220, 1600 - c.weight * 14)),
    );
    // Cleanup drops occasionally so the list doesn't grow unbounded.
    const sweep = setInterval(() => {
      setDrops((prev) => prev.slice(-30));
    }, 4000);
    return () => {
      timers.forEach(clearInterval);
      clearInterval(sweep);
    };
  }, [config.weights]);

  const burettes = [
    { idx: 0, label: "DIRECT",   weight: config.weights.direct,   colour: SUBSCORE_HUES.direct,   x: 110 },
    { idx: 1, label: "SEMANTIC", weight: config.weights.semantic, colour: SUBSCORE_HUES.semantic, x: 230 },
    { idx: 2, label: "PATHWAY",  weight: config.weights.pathway,  colour: SUBSCORE_HUES.pathway,  x: 350 },
  ];

  // Beaker fill level — driven by the sample score.
  const beakerFill = Math.max(8, Math.min(95, score));

  return (
    <Panel score={score} tone={tone} bandLabel={bandLabel} icon={FlaskConical} title="Bioprocess lab">
      <svg viewBox="0 0 460 260" className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        <defs>
          {burettes.map((b) => (
            <linearGradient id={`bpl-liq-${b.idx}`} key={b.idx} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"  stopColor={b.colour} stopOpacity="0.85" />
              <stop offset="100%" stopColor={b.colour} stopOpacity="0.55" />
            </linearGradient>
          ))}
          <linearGradient id="bpl-beaker-liq" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor={tone} stopOpacity="0.85" />
            <stop offset="100%" stopColor={tone} stopOpacity="0.55" />
          </linearGradient>
          <filter id="bpl-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <pattern id="bpl-grid" width="22" height="22" patternUnits="userSpaceOnUse">
            <path d="M 22 0 L 0 0 0 22" fill="none" stroke="rgba(56,189,248,0.05)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="460" height="260" fill="url(#bpl-grid)" />

        {/* Burettes (top row) */}
        {burettes.map((b) => (
          <g key={b.idx}>
            {/* Glass tube */}
            <rect
              x={b.x - 14} y={10}
              width={28} height={90}
              rx={4}
              fill="rgba(255,255,255,0.04)"
              stroke="rgba(165, 243, 252, 0.4)"
              strokeWidth={1}
            />
            {/* Liquid level (height = weight) */}
            <rect
              x={b.x - 10} y={14 + (1 - b.weight / 100) * 82}
              width={20}
              height={(b.weight / 100) * 82}
              rx={2}
              fill={`url(#bpl-liq-${b.idx})`}
              opacity={0.9}
            />
            {/* Tip */}
            <path
              d={`M ${b.x - 4} 100 L ${b.x + 4} 100 L ${b.x} 112 Z`}
              fill="rgba(165, 243, 252, 0.5)"
            />
            {/* Label */}
            <text
              x={b.x} y={132}
              fill={b.colour}
              fontSize="9"
              letterSpacing="2"
              fontFamily="ui-monospace, monospace"
              fontWeight="700"
              textAnchor="middle"
            >
              {b.label}
            </text>
            <text
              x={b.x} y={146}
              fill="rgba(148, 163, 184, 0.7)"
              fontSize="9"
              fontFamily="ui-monospace, monospace"
              textAnchor="middle"
            >
              w={b.weight}
            </text>
          </g>
        ))}

        {/* Drops in flight — each is a small ellipse with a CSS fall animation. */}
        {drops.map((d) => {
          const b = burettes[d.channel];
          return (
            <ellipse
              key={d.id}
              cx={d.x}
              cy={112}
              rx={2.5}
              ry={4}
              fill={b.colour}
              opacity={0.9}
              filter="url(#bpl-glow)"
              className="bpl-drop"
              style={{
                animation: "bpl-fall 1.1s linear forwards",
              }}
            />
          );
        })}

        {/* Central beaker — bottom right of the layout */}
        <g transform="translate(230 175)">
          {/* Beaker outline (rounded U) */}
          <path
            d="M -55 -40 L -55 30 Q -55 50, -35 50 L 35 50 Q 55 50, 55 30 L 55 -40"
            fill="rgba(255,255,255,0.04)"
            stroke="rgba(165, 243, 252, 0.55)"
            strokeWidth={1.5}
          />
          {/* Top lip */}
          <line x1={-58} y1={-40} x2={58} y2={-40} stroke="rgba(165, 243, 252, 0.55)" strokeWidth={1.5} />

          {/* Liquid */}
          <clipPath id="bpl-beaker-clip">
            <path d="M -52 -38 L -52 30 Q -52 47, -36 47 L 36 47 Q 52 47, 52 30 L 52 -38 Z" />
          </clipPath>
          <g clipPath="url(#bpl-beaker-clip)">
            <rect
              x={-55}
              y={48 - (beakerFill / 100) * 85}
              width={110}
              height={(beakerFill / 100) * 85}
              fill="url(#bpl-beaker-liq)"
            />
            {/* Bubbles */}
            {Array.from({ length: 6 }).map((_, i) => (
              <circle
                key={i}
                cx={-30 + i * 12 + (i % 2 === 0 ? 3 : -3)}
                cy={40 - (i * 8) % 60}
                r={1.5 + (i % 3)}
                fill="rgba(255,255,255,0.4)"
                className="bpl-bubble"
                style={{ animationDelay: `${i * 0.3}s` }}
              />
            ))}
          </g>

          {/* Score etched on the beaker */}
          <text
            x={0} y={20}
            fill="#fff"
            fontSize="22"
            fontWeight="900"
            fontFamily="ui-monospace, monospace"
            textAnchor="middle"
            style={{ textShadow: "0 0 8px rgba(0,0,0,0.6)" }}
          >
            {score}
          </text>
          <text
            x={0} y={36}
            fill="rgba(255,255,255,0.6)"
            fontSize="7"
            letterSpacing="2"
            fontWeight="700"
            fontFamily="ui-monospace, monospace"
            textAnchor="middle"
          >
            ΣFIT / 100
          </text>
        </g>

        {/* Tick marks on beaker */}
        <g transform="translate(283 175)" stroke="rgba(165, 243, 252, 0.4)" strokeWidth={0.7}>
          {[10, 25, 40, 55].map((y, i) => (
            <g key={i}>
              <line x1={0} y1={y - 50} x2={4} y2={y - 50} />
              <text
                x={7} y={y - 47}
                fill="rgba(148, 163, 184, 0.55)"
                fontSize="7"
                fontFamily="ui-monospace, monospace"
              >
                {100 - i * 25}
              </text>
            </g>
          ))}
        </g>
      </svg>

      <style jsx>{`
        @keyframes bpl-fall {
          0%   { transform: translateY(0);   opacity: 0.95; }
          90%  { transform: translateY(64px); opacity: 0.95; }
          100% { transform: translateY(70px); opacity: 0;    }
        }
        @keyframes bpl-bubble-rise {
          0%   { transform: translateY(0);   opacity: 0; }
          15%  { opacity: 0.6; }
          100% { transform: translateY(-50px); opacity: 0; }
        }
        :global(.bpl-bubble) {
          animation: bpl-bubble-rise 4s ease-in infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          :global(.bpl-drop), :global(.bpl-bubble) { animation: none; }
        }
      `}</style>
    </Panel>
  );
}

function Panel({
  score, tone, bandLabel, icon: Icon, title, children,
}: {
  score: number;
  tone: string;
  bandLabel: string;
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl ring-1 ring-inset ring-cyan-900/40 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <header className="relative px-5 pt-4 pb-2 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[10px] uppercase tracking-[0.28em] font-bold text-cyan-300/80 inline-flex items-center gap-1.5 font-mono">
          <Icon size={11} /> {title}
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
      <div className="relative px-5 pb-3 pt-2">
        {children}
      </div>
    </section>
  );
}
