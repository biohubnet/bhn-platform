"use client";
/**
 * Hi-tech pipeline visualization for /admin/matching-config.
 *
 * Renders the AI matching engine as a circuit-board-style diagram:
 *
 *      TRAINEE        ┌─ Direct overlap ──┐         POSTING
 *      profile        ├─ Semantic sim. ───┤        required
 *      [skills]       └─ Pathway align ───┘         [skills]
 *                            │
 *                       AGGREGATOR
 *                       ┌─────────┐
 *                       │  74/100 │
 *                       └─────────┘
 *
 * The whole thing animates: pulses ride each pipeline from trainee
 * to aggregator, the score counter ticks, the aggregator hex breathes,
 * and ambient particles drift across a grid background.
 *
 * Interactive
 *   The component takes the live MatchingConfig from the parent form,
 *   so dragging a weight slider visibly thickens its pipe and changes
 *   the sample score in real time. The user can SEE what each knob
 *   does without saving.
 *
 * Honest sample score
 *   We can't actually score every trainee × posting pair to feed an
 *   animation. The sample assumes typical utilisation per subscore
 *   (80% direct, 60% semantic, 50% pathway) and applies the live
 *   weights, then floors at 0 and ceils at 100. The number is
 *   demonstrative, not predictive — labelled "sample score" so the
 *   user knows.
 */
import { useEffect, useMemo, useState } from "react";
import { Cpu, Network, Sparkles } from "lucide-react";
import type { MatchingConfig } from "@/lib/matching/config";

interface Props {
  config: MatchingConfig;
}

// Sample utilisation per subscore — what a "typical" match looks like.
// Multiplied by the live weights to produce the demo score so the
// pipeline visibly responds to slider changes.
const SAMPLE_UTIL = { direct: 0.80, semantic: 0.60, pathway: 0.50 } as const;

export function MatchingPipelineAnimation({ config }: Props) {
  // Target sample score, computed from live weights.
  const targetScore = useMemo(() => {
    const s =
      config.weights.direct   * SAMPLE_UTIL.direct +
      config.weights.semantic * SAMPLE_UTIL.semantic +
      config.weights.pathway  * SAMPLE_UTIL.pathway;
    return Math.max(0, Math.min(100, Math.round(s)));
  }, [config.weights]);

  // Eased counter — ticks toward targetScore over ~800ms whenever
  // the weights change.
  const [displayScore, setDisplayScore] = useState(targetScore);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const start = displayScore;
    const dur = 800;
    function tick() {
      const t = Math.min(1, (performance.now() - t0) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayScore(Math.round(start + (targetScore - start) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // Intentionally NOT depending on displayScore — we want a fresh
    // animation per targetScore change, not per render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetScore]);

  // Pipeline stroke widths scale with weight (2 px floor → 14 px at 100).
  const sw = (w: number) => 2 + (w / 100) * 12;
  const swDirect   = sw(config.weights.direct);
  const swSemantic = sw(config.weights.semantic);
  const swPathway  = sw(config.weights.pathway);

  // Pulses-per-pipe scales with weight too. Each pipe gets between 1
  // and 4 staggered pulses; high-weight pipes look denser.
  const pulses = (w: number) => Math.max(1, Math.min(4, Math.round(w / 20)));
  const pDirect   = pulses(config.weights.direct);
  const pSemantic = pulses(config.weights.semantic);
  const pPathway  = pulses(config.weights.pathway);

  // Band label.
  const band =
    displayScore >= config.bands.high   ? "STRONG" :
    displayScore >= config.bands.medium ? "POSSIBLE" : "WEAK";
  const bandTone =
    band === "STRONG"   ? "text-emerald-400" :
    band === "POSSIBLE" ? "text-amber-400" : "text-slate-400";

  return (
    <section className="relative overflow-hidden rounded-2xl ring-1 ring-inset ring-cyan-900/40 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 surface-shadow">
      {/* Scan line shimmer */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent animate-mpa-scan" aria-hidden />
      {/* Ambient particle drift */}
      <div className="absolute inset-0 pointer-events-none opacity-60" aria-hidden>
        {[...Array(18)].map((_, i) => (
          <span
            key={i}
            className="absolute w-1 h-1 rounded-full bg-cyan-300 animate-mpa-drift"
            style={{
              left:  `${(i * 53) % 100}%`,
              top:   `${(i * 79) % 100}%`,
              animationDelay:    `${(i * 0.43) % 6}s`,
              animationDuration: `${6 + (i % 5)}s`,
              opacity: 0.25 + ((i % 4) * 0.15),
            }}
          />
        ))}
      </div>

      <header className="relative px-5 pt-4 pb-2 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] font-bold text-cyan-300/80 inline-flex items-center gap-1.5">
            <Cpu size={11} /> System diagram · live
          </p>
          <h3 className="text-lg font-bold text-slate-100 tracking-tight mt-0.5 inline-flex items-center gap-2">
            <Network size={15} className="text-cyan-300" />
            Matching engine pipeline
          </h3>
          <p className="text-[11px] text-slate-400 mt-1 max-w-xl leading-relaxed">
            Sliders below feed this diagram in real time. Pipe thickness =
            subscore weight. Pulse density = relative contribution. Sample
            score assumes typical subscore utilisation; it&apos;s a demo, not
            a forecast.
          </p>
        </div>
      </header>

      <div className="relative px-5 pb-5">
        <svg viewBox="0 0 800 360" className="w-full h-auto" aria-hidden>
          <defs>
            {/* Subtle hex/grid background */}
            <pattern id="mpa-grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M 32 0 L 0 0 0 32" fill="none" stroke="rgba(56,189,248,0.08)" strokeWidth="0.5" />
            </pattern>
            {/* Pipeline gradient strokes */}
            <linearGradient id="mpa-direct" x1="0" x2="1">
              <stop offset="0%"  stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
            <linearGradient id="mpa-semantic" x1="0" x2="1">
              <stop offset="0%"  stopColor="#a855f7" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
            <linearGradient id="mpa-pathway" x1="0" x2="1">
              <stop offset="0%"  stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#f97316" />
            </linearGradient>
            <linearGradient id="mpa-hex" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%"  stopColor="#0891b2" />
              <stop offset="100%" stopColor="#4338ca" />
            </linearGradient>
            {/* Glow filter for pulses */}
            <filter id="mpa-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Grid backdrop */}
          <rect width="800" height="360" fill="url(#mpa-grid)" />

          {/* ── Trainee box ──────────────────────────────────── */}
          <g>
            <rect x="20" y="50" width="170" height="260" rx="14"
              fill="rgba(6, 182, 212, 0.06)"
              stroke="rgba(34, 211, 238, 0.35)"
              strokeWidth="1"
            />
            <text x="105" y="78" textAnchor="middle"
              fill="rgb(165, 243, 252)" fontSize="11" fontWeight="700"
              letterSpacing="3" fontFamily="ui-monospace, monospace">
              TRAINEE
            </text>
            <text x="105" y="95" textAnchor="middle"
              fill="rgba(165, 243, 252, 0.55)" fontSize="9"
              letterSpacing="1.5" fontFamily="ui-monospace, monospace">
              profile · skills
            </text>
            <SkillChip x={35} y={115} label="cell culture" tone="cyan" />
            <SkillChip x={35} y={145} label="aseptic technique" tone="cyan" />
            <SkillChip x={35} y={175} label="GMP doc" tone="cyan" />
            <SkillChip x={35} y={205} label="QA" tone="cyan" />
            <text x="105" y="245" textAnchor="middle"
              fill="rgba(165, 243, 252, 0.4)" fontSize="9"
              fontFamily="ui-monospace, monospace">
              + {config.thresholds.profileCompleteness}-skill min
            </text>
            <text x="105" y="285" textAnchor="middle"
              fill="rgba(165, 243, 252, 0.4)" fontSize="9"
              fontFamily="ui-monospace, monospace">
              embeddings: 384-d
            </text>
          </g>

          {/* ── Posting box ──────────────────────────────────── */}
          <g>
            <rect x="610" y="50" width="170" height="260" rx="14"
              fill="rgba(168, 85, 247, 0.06)"
              stroke="rgba(217, 70, 239, 0.35)"
              strokeWidth="1"
            />
            <text x="695" y="78" textAnchor="middle"
              fill="rgb(245, 208, 254)" fontSize="11" fontWeight="700"
              letterSpacing="3" fontFamily="ui-monospace, monospace">
              POSTING
            </text>
            <text x="695" y="95" textAnchor="middle"
              fill="rgba(245, 208, 254, 0.55)" fontSize="9"
              letterSpacing="1.5" fontFamily="ui-monospace, monospace">
              required skills
            </text>
            <SkillChip x={625} y={115} label="mammalian CC" tone="fuchsia" required />
            <SkillChip x={625} y={145} label="aseptic transfer" tone="fuchsia" required />
            <SkillChip x={625} y={175} label="GMP" tone="fuchsia" required />
            <SkillChip x={625} y={205} label="bioreactor ops" tone="fuchsia" />
            <text x="695" y="245" textAnchor="middle"
              fill="rgba(245, 208, 254, 0.4)" fontSize="9"
              fontFamily="ui-monospace, monospace">
              bonus +{config.thresholds.requiredSkillBonus} required
            </text>
            <text x="695" y="285" textAnchor="middle"
              fill="rgba(245, 208, 254, 0.4)" fontSize="9"
              fontFamily="ui-monospace, monospace">
              ≥{config.thresholds.minPostingSkillsForFullConfidence} skills tagged
            </text>
          </g>

          {/* ── Aggregator hexagon (centre) ──────────────────── */}
          <g transform="translate(400 180)">
            <polygon
              points="0,-55 47,-27 47,27 0,55 -47,27 -47,-27"
              fill="url(#mpa-hex)"
              stroke="rgba(56, 189, 248, 0.6)"
              strokeWidth="1.5"
              filter="url(#mpa-glow)"
              className="animate-mpa-breathe"
            />
            <text x="0" y="-12" textAnchor="middle"
              fill="rgba(255,255,255,0.7)" fontSize="9"
              letterSpacing="2.5" fontFamily="ui-monospace, monospace" fontWeight="700">
              ΣFIT
            </text>
            <text x="0" y="18" textAnchor="middle"
              fill="rgb(255,255,255)" fontSize="26" fontWeight="900"
              fontFamily="ui-monospace, monospace">
              {displayScore}
            </text>
            <text x="0" y="34" textAnchor="middle"
              fill="rgba(255,255,255,0.55)" fontSize="8"
              letterSpacing="2" fontFamily="ui-monospace, monospace">
              /100
            </text>
          </g>

          {/* ── Three pipelines ──────────────────────────────── */}
          {/* Direct overlap — straight pipe near the top */}
          <PipePath
            id="mpa-path-direct"
            d="M 190 130 Q 295 130, 345 165"
            gradient="url(#mpa-direct)"
            strokeWidth={swDirect}
            opacity={0.85}
          />
          <PipePath
            id="mpa-path-direct-out"
            d="M 455 165 Q 505 130, 610 130"
            gradient="url(#mpa-direct)"
            strokeWidth={swDirect}
            opacity={0.85}
          />

          {/* Semantic — wavy bezier through the middle */}
          <PipePath
            id="mpa-path-semantic"
            d="M 190 180 Q 270 200, 290 180 T 345 180"
            gradient="url(#mpa-semantic)"
            strokeWidth={swSemantic}
            opacity={0.85}
            dash
          />
          <PipePath
            id="mpa-path-semantic-out"
            d="M 455 180 Q 510 200, 530 180 T 610 180"
            gradient="url(#mpa-semantic)"
            strokeWidth={swSemantic}
            opacity={0.85}
            dash
          />

          {/* Pathway — arched bezier near the bottom */}
          <PipePath
            id="mpa-path-pathway"
            d="M 190 235 Q 290 280, 345 200"
            gradient="url(#mpa-pathway)"
            strokeWidth={swPathway}
            opacity={0.85}
          />
          <PipePath
            id="mpa-path-pathway-out"
            d="M 455 200 Q 510 280, 610 235"
            gradient="url(#mpa-pathway)"
            strokeWidth={swPathway}
            opacity={0.85}
          />

          {/* ── Pulses (animateMotion along each path) ───────── */}
          {Array.from({ length: pDirect }).map((_, i) => (
            <PulseDot key={`d-${i}`} color="#22d3ee" pathId="mpa-path-direct"
              dur={3.6} delay={(3.6 / pDirect) * i} />
          ))}
          {Array.from({ length: pDirect }).map((_, i) => (
            <PulseDot key={`do-${i}`} color="#3b82f6" pathId="mpa-path-direct-out"
              dur={3.6} delay={(3.6 / pDirect) * i + 1.8} />
          ))}
          {Array.from({ length: pSemantic }).map((_, i) => (
            <PulseDot key={`s-${i}`} color="#d946ef" pathId="mpa-path-semantic"
              dur={4} delay={(4 / pSemantic) * i} />
          ))}
          {Array.from({ length: pSemantic }).map((_, i) => (
            <PulseDot key={`so-${i}`} color="#ec4899" pathId="mpa-path-semantic-out"
              dur={4} delay={(4 / pSemantic) * i + 2} />
          ))}
          {Array.from({ length: pPathway }).map((_, i) => (
            <PulseDot key={`p-${i}`} color="#f59e0b" pathId="mpa-path-pathway"
              dur={4.6} delay={(4.6 / pPathway) * i} />
          ))}
          {Array.from({ length: pPathway }).map((_, i) => (
            <PulseDot key={`po-${i}`} color="#f97316" pathId="mpa-path-pathway-out"
              dur={4.6} delay={(4.6 / pPathway) * i + 2.3} />
          ))}

          {/* ── Pipeline labels ──────────────────────────────── */}
          <PipeLabel x={210} y={108}
            color="#67e8f9" label="DIRECT OVERLAP"
            sublabel={`weight ${config.weights.direct}`} />
          <PipeLabel x={210} y={162}
            color="#f0abfc" label="SEMANTIC SIM"
            sublabel={`weight ${config.weights.semantic} · cos≥${config.thresholds.semanticBridgeMin}`} />
          <PipeLabel x={210} y={258}
            color="#fcd34d" label="PATHWAY ALIGN"
            sublabel={`weight ${config.weights.pathway} · +${config.thresholds.perPathwayBoost}/pathway`} />
        </svg>

        {/* ── Bottom legend ─────────────────────────────────── */}
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-mono">
          <LegendDot color="#22d3ee" label="Direct" weight={config.weights.direct} />
          <LegendDot color="#d946ef" label="Semantic" weight={config.weights.semantic} />
          <LegendDot color="#f59e0b" label="Pathway" weight={config.weights.pathway} />
          <span className="text-slate-500">·</span>
          <span className="inline-flex items-center gap-1.5 text-slate-400">
            <Sparkles size={10} className="text-cyan-300" />
            Sample fit:
            <span className={`font-bold tabular-nums ${bandTone}`}>{displayScore}</span>
            <span className="text-slate-600">/</span>
            <span className={`font-bold ${bandTone}`}>{band}</span>
          </span>
        </div>
      </div>

      {/* Local keyframes — kept inline so the component is self-
          contained and doesn't need an entry in globals.css. */}
      <style jsx>{`
        @keyframes mpa-scan {
          0%   { transform: translateY(0);     opacity: 0; }
          12%  { opacity: 1; }
          50%  { transform: translateY(360px); opacity: 0.8; }
          88%  { opacity: 0.4; }
          100% { transform: translateY(360px); opacity: 0; }
        }
        @keyframes mpa-drift {
          0%   { transform: translate(0,0)        scale(1);   opacity: 0; }
          20%  { opacity: 0.6; }
          50%  { transform: translate(20px,-15px) scale(1.4); }
          80%  { opacity: 0.4; }
          100% { transform: translate(-10px,10px) scale(0.8); opacity: 0; }
        }
        @keyframes mpa-breathe {
          0%, 100% { transform: scale(1);     filter: drop-shadow(0 0 6px rgba(56,189,248,0.5)); }
          50%      { transform: scale(1.045); filter: drop-shadow(0 0 14px rgba(56,189,248,0.85)); }
        }
        .animate-mpa-scan    { animation: mpa-scan    6s ease-in-out infinite; }
        .animate-mpa-drift   { animation: mpa-drift   8s ease-in-out infinite; }
        :global(.animate-mpa-breathe) { animation: mpa-breathe 3.2s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        @media (prefers-reduced-motion: reduce) {
          .animate-mpa-scan, .animate-mpa-drift,
          :global(.animate-mpa-breathe) { animation: none; }
        }
      `}</style>
    </section>
  );
}

// ─── SVG sub-components ─────────────────────────────────────────

function SkillChip({
  x, y, label, tone, required,
}: {
  x: number;
  y: number;
  label: string;
  tone: "cyan" | "fuchsia";
  required?: boolean;
}) {
  const fill =
    tone === "cyan"
      ? "rgba(34, 211, 238, 0.15)"
      : "rgba(217, 70, 239, 0.15)";
  const stroke =
    tone === "cyan"
      ? "rgba(34, 211, 238, 0.5)"
      : "rgba(217, 70, 239, 0.5)";
  const text =
    tone === "cyan" ? "rgb(165, 243, 252)" : "rgb(245, 208, 254)";
  return (
    <g>
      <rect x={x} y={y} width="140" height="22" rx="6" fill={fill} stroke={stroke} strokeWidth="1" />
      <text x={x + 8} y={y + 15} fill={text} fontSize="11"
        fontFamily="ui-monospace, monospace">
        {label}
      </text>
      {required && (
        <text x={x + 130} y={y + 15} textAnchor="end"
          fill="rgb(252, 211, 77)" fontSize="11" fontWeight="700"
          fontFamily="ui-monospace, monospace">
          ★
        </text>
      )}
    </g>
  );
}

function PipePath({
  id, d, gradient, strokeWidth, opacity, dash,
}: {
  id: string;
  d: string;
  gradient: string;
  strokeWidth: number;
  opacity?: number;
  dash?: boolean;
}) {
  return (
    <>
      {/* Glow underlay */}
      <path
        d={d}
        fill="none"
        stroke={gradient}
        strokeWidth={strokeWidth * 2.2}
        opacity={(opacity ?? 1) * 0.18}
        strokeLinecap="round"
        filter="url(#mpa-glow)"
      />
      {/* Main pipe */}
      <path
        id={id}
        d={d}
        fill="none"
        stroke={gradient}
        strokeWidth={strokeWidth}
        opacity={opacity ?? 1}
        strokeLinecap="round"
        strokeDasharray={dash ? "6 4" : undefined}
      />
    </>
  );
}

function PulseDot({
  color, pathId, dur, delay,
}: {
  color: string;
  pathId: string;
  dur: number;
  delay: number;
}) {
  return (
    <circle r="3.5" fill={color} filter="url(#mpa-glow)">
      <animateMotion dur={`${dur}s`} repeatCount="indefinite" begin={`${delay}s`}>
        <mpath href={`#${pathId}`} />
      </animateMotion>
    </circle>
  );
}

function PipeLabel({
  x, y, color, label, sublabel,
}: {
  x: number;
  y: number;
  color: string;
  label: string;
  sublabel: string;
}) {
  return (
    <g>
      <text x={x} y={y} fill={color} fontSize="9" fontWeight="700"
        letterSpacing="2" fontFamily="ui-monospace, monospace">
        {label}
      </text>
      <text x={x} y={y + 12} fill={`${color}aa`} fontSize="8"
        letterSpacing="1" fontFamily="ui-monospace, monospace">
        {sublabel}
      </text>
    </g>
  );
}

function LegendDot({
  color, label, weight,
}: {
  color: string;
  label: string;
  weight: number;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-slate-400">
      <span
        className="inline-block w-2.5 h-2.5 rounded-full"
        style={{ background: color, boxShadow: `0 0 8px ${color}` }}
      />
      <span className="text-slate-300">{label}</span>
      <span className="text-slate-500 tabular-nums">w={weight}</span>
    </span>
  );
}
