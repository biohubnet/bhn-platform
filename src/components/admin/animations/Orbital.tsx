"use client";
/**
 * Variant 3 — "Orbital system".
 *
 * A central star (the fit score) with three planets orbiting it,
 * one per subscore. Each planet's mass (radius) and orbit speed are
 * driven by the live weight — heavier weight = larger, faster
 * planet. Pulse trails left behind each planet emphasise the motion.
 *
 * Aesthetic: minimal cosmic. A lot of dark space, careful glow on
 * the central body, calm orbital cadence.
 */
import { useEffect, useState } from "react";
import { Orbit } from "lucide-react";
import { useSampleScore, SUBSCORE_HUES } from "@/components/admin/animations/shared";
import type { MatchingConfig } from "@/lib/matching/config";

interface Props { config: MatchingConfig }

const CENTRE_X = 230;
const CENTRE_Y = 130;

interface PlanetCfg {
  id: "direct" | "semantic" | "pathway";
  label: string;
  colour: string;
  weight: number;
  orbitR: number;
  phase: number;    // starting angle so they don't collide
}

export function Orbital({ config }: Props) {
  const { score, tone, bandLabel } = useSampleScore(config);

  const planets: PlanetCfg[] = [
    { id: "direct",   label: "DIRECT",   colour: SUBSCORE_HUES.direct,   weight: config.weights.direct,   orbitR: 50, phase: 0 },
    { id: "semantic", label: "SEMANTIC", colour: SUBSCORE_HUES.semantic, weight: config.weights.semantic, orbitR: 80, phase: Math.PI * 2 / 3 },
    { id: "pathway",  label: "PATHWAY",  colour: SUBSCORE_HUES.pathway,  weight: config.weights.pathway,  orbitR: 110, phase: Math.PI * 4 / 3 },
  ];

  // Animate angles via rAF. Speed inversely proportional to orbitR
  // (outer orbits slower — Kepler-ish) and proportional to weight
  // (heavier subscore = livelier planet).
  const [angles, setAngles] = useState<[number, number, number]>([0, 0, 0]);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    function tick(now: number) {
      const dt = (now - t0) / 1000;
      setAngles([
        planets[0].phase + dt * 0.6  * (0.4 + planets[0].weight / 100),
        planets[1].phase + dt * 0.42 * (0.4 + planets[1].weight / 100),
        planets[2].phase + dt * 0.30 * (0.4 + planets[2].weight / 100),
      ]);
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.weights.direct, config.weights.semantic, config.weights.pathway]);

  return (
    <section className="relative overflow-hidden rounded-2xl ring-1 ring-inset ring-cyan-900/40 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <header className="relative px-5 pt-4 pb-2 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[10px] uppercase tracking-[0.28em] font-bold text-cyan-300/80 inline-flex items-center gap-1.5 font-mono">
          <Orbit size={11} /> Orbital system
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
        <svg viewBox="0 0 460 260" className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
          <defs>
            <radialGradient id="orb-sun">
              <stop offset="0%"  stopColor="#ffffff" />
              <stop offset="40%" stopColor={tone} />
              <stop offset="100%" stopColor={`${tone}11`} />
            </radialGradient>
            <filter id="orb-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            {/* Faint star field */}
            <pattern id="orb-stars" width="60" height="60" patternUnits="userSpaceOnUse">
              <circle cx="12" cy="18" r="0.6" fill="rgba(255,255,255,0.25)" />
              <circle cx="45" cy="35" r="0.4" fill="rgba(255,255,255,0.15)" />
              <circle cx="28" cy="50" r="0.5" fill="rgba(255,255,255,0.2)" />
            </pattern>
          </defs>
          <rect width="460" height="260" fill="url(#orb-stars)" />

          {/* Orbit rings */}
          {planets.map((p) => (
            <circle
              key={`ring-${p.id}`}
              cx={CENTRE_X}
              cy={CENTRE_Y}
              r={p.orbitR}
              fill="none"
              stroke={`${p.colour}30`}
              strokeWidth={0.8}
              strokeDasharray="3 3"
            />
          ))}

          {/* Central star */}
          <circle
            cx={CENTRE_X} cy={CENTRE_Y}
            r={26}
            fill={tone}
            opacity={0.12}
            filter="url(#orb-glow)"
          />
          <circle
            cx={CENTRE_X} cy={CENTRE_Y}
            r={18}
            fill="url(#orb-sun)"
            stroke={tone}
            strokeWidth={1.5}
            filter="url(#orb-glow)"
          />
          <text
            x={CENTRE_X} y={CENTRE_Y + 4}
            fill="#0f172a"
            fontSize="13"
            fontWeight="900"
            fontFamily="ui-monospace, monospace"
            textAnchor="middle"
          >
            {score}
          </text>

          {/* Planets */}
          {planets.map((p, i) => {
            const ang = angles[i];
            const px = CENTRE_X + Math.cos(ang) * p.orbitR;
            const py = CENTRE_Y + Math.sin(ang) * p.orbitR;
            const r = 4 + (p.weight / 100) * 5; // radius scales with weight
            // Trail dots — a few points behind the planet, fading.
            const trail = Array.from({ length: 6 }).map((_, k) => {
              const a = ang - (k + 1) * 0.12;
              return {
                x: CENTRE_X + Math.cos(a) * p.orbitR,
                y: CENTRE_Y + Math.sin(a) * p.orbitR,
                op: 0.5 * (1 - k / 6),
              };
            });
            return (
              <g key={p.id}>
                {trail.map((t, k) => (
                  <circle key={k} cx={t.x} cy={t.y} r={r * 0.5} fill={p.colour} opacity={t.op} />
                ))}
                <circle cx={px} cy={py} r={r + 2} fill={p.colour} opacity={0.18} filter="url(#orb-glow)" />
                <circle cx={px} cy={py} r={r} fill={p.colour} filter="url(#orb-glow)" />
                {/* Label tag */}
                <text
                  x={px + r + 4}
                  y={py + 3}
                  fill={p.colour}
                  fontSize="9"
                  letterSpacing="1.5"
                  fontFamily="ui-monospace, monospace"
                  fontWeight="700"
                >
                  {p.label} <tspan fill="rgba(148,163,184,0.7)">w={p.weight}</tspan>
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}
