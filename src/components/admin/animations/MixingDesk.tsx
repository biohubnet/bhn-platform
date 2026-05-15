"use client";
/**
 * Variant 1 — "Mixing desk".
 *
 * Each subscore is a vertical VU meter. The bar's resting height
 * = the weight; an oscillating amplitude (random walk modulated by
 * weight) gives it a live "audio level" feel. A master meter at the
 * right shows the combined fit score.
 *
 * Aesthetic: pro-audio gear — segmented LED bars, chrome trim,
 * uppercase mono labels. Reads as a piece of music-production
 * equipment.
 */
import { useEffect, useState } from "react";
import { Sliders } from "lucide-react";
import { useSampleScore, SUBSCORE_HUES } from "@/components/admin/animations/shared";
import type { MatchingConfig } from "@/lib/matching/config";

interface Props { config: MatchingConfig }

const SEGMENTS = 22;     // LED rows per channel
const TICK_MS = 90;      // bar refresh cadence

export function MixingDesk({ config }: Props) {
  const { score, tone, bandLabel } = useSampleScore(config);

  // Oscillating "level" per channel. Resting level = weight; small
  // random walk on top so the bars look alive. We tick every TICK_MS
  // to keep it ≪ 60 fps but still visibly animated.
  const [levels, setLevels] = useState<[number, number, number]>([
    config.weights.direct, config.weights.semantic, config.weights.pathway,
  ]);
  useEffect(() => {
    const id = setInterval(() => {
      setLevels(() => {
        const jitter = (w: number) => {
          const next = w + (Math.random() - 0.5) * 16;
          return Math.max(0, Math.min(100, next));
        };
        return [
          jitter(config.weights.direct),
          jitter(config.weights.semantic),
          jitter(config.weights.pathway),
        ];
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [config.weights]);

  const channels = [
    { id: "direct",   label: "DIRECT",   weight: config.weights.direct,   level: levels[0], colour: SUBSCORE_HUES.direct },
    { id: "semantic", label: "SEMANTIC", weight: config.weights.semantic, level: levels[1], colour: SUBSCORE_HUES.semantic },
    { id: "pathway",  label: "PATHWAY",  weight: config.weights.pathway,  level: levels[2], colour: SUBSCORE_HUES.pathway },
  ];

  return (
    <Panel score={score} tone={tone} bandLabel={bandLabel} icon={Sliders} title="Mixing desk">
      <div className="grid grid-cols-[1fr_1fr_1fr_2fr] gap-6 items-end px-2 py-2">
        {channels.map((c) => (
          <Channel key={c.id} {...c} />
        ))}
        <MasterMeter score={score} tone={tone} />
      </div>
    </Panel>
  );
}

function Channel({
  label, weight, level, colour,
}: {
  label: string;
  weight: number;
  level: number;
  colour: string;
}) {
  // Segments are filled from the bottom. Each segment lights up if
  // its threshold is ≤ the current level. The top 20% bleeds toward
  // amber/rose to mimic an analogue meter's headroom.
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative flex flex-col-reverse gap-0.5 h-44 w-8 rounded-md bg-slate-900 ring-1 ring-slate-700/80 p-1">
        {Array.from({ length: SEGMENTS }).map((_, i) => {
          const threshold = ((i + 1) / SEGMENTS) * 100;
          const lit = level >= threshold;
          // Top three segments shift to amber to give the "headroom" cue.
          const segColour =
            i >= SEGMENTS - 3 ? "#f59e0b" :
            i >= SEGMENTS - 6 ? "#facc15" : colour;
          return (
            <div
              key={i}
              className="h-1.5 rounded-sm transition-opacity"
              style={{
                background: lit ? segColour : "rgba(148, 163, 184, 0.12)",
                boxShadow: lit ? `0 0 6px ${segColour}cc` : "none",
                opacity: lit ? 1 : 1,
              }}
            />
          );
        })}
      </div>
      <p className="text-[9px] uppercase tracking-[0.22em] font-bold text-slate-400 font-mono">
        {label}
      </p>
      <p className="text-[10px] font-mono tabular-nums" style={{ color: colour }}>
        w={weight}
      </p>
    </div>
  );
}

function MasterMeter({ score, tone }: { score: number; tone: string }) {
  // Horizontal meter for the master. Segmented like a peak-program meter.
  const segments = 30;
  return (
    <div className="flex flex-col gap-2 px-3">
      <p className="text-[9px] uppercase tracking-[0.22em] font-bold text-slate-400 font-mono">
        MASTER
      </p>
      <div className="flex gap-0.5 h-6 rounded-md bg-slate-900 ring-1 ring-slate-700/80 p-1">
        {Array.from({ length: segments }).map((_, i) => {
          const threshold = ((i + 1) / segments) * 100;
          const lit = score >= threshold;
          const segColour =
            i >= segments - 4 ? "#f59e0b" :
            i >= segments - 8 ? "#facc15" : tone;
          return (
            <div
              key={i}
              className="flex-1 rounded-[1px]"
              style={{
                background: lit ? segColour : "rgba(148, 163, 184, 0.12)",
                boxShadow: lit ? `0 0 4px ${segColour}cc` : "none",
              }}
            />
          );
        })}
      </div>
      <p className="text-[10px] font-mono text-slate-500 tabular-nums">
        Σ direct·0.8 + sem·0.6 + path·0.5
      </p>
    </div>
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
      <header className="relative px-5 pt-4 pb-3 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[10px] uppercase tracking-[0.28em] font-bold text-cyan-300/80 inline-flex items-center gap-1.5 font-mono">
          <Icon size={11} /> {title}
        </p>
        <ScoreReadout score={score} tone={tone} bandLabel={bandLabel} />
      </header>
      <div className="relative px-5 pb-5">
        {children}
      </div>
    </section>
  );
}

function ScoreReadout({ score, tone, bandLabel }: { score: number; tone: string; bandLabel: string }) {
  return (
    <div className="text-right">
      <p className="font-mono tabular-nums leading-none">
        <span
          className="text-3xl font-black"
          style={{ color: tone, textShadow: `0 0 18px ${tone}80` }}
        >
          {score}
        </span>
        <span className="text-slate-500 text-sm"> /100</span>
      </p>
      <p className="text-[9px] font-bold tracking-[0.22em] mt-0.5" style={{ color: tone }}>
        {bandLabel}
      </p>
    </div>
  );
}
