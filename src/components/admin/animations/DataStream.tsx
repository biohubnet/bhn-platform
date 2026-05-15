"use client";
/**
 * Variant 4 — "Data stream".
 *
 * Three horizontal streams of particles flow from the left edge to a
 * single output node on the right. Each stream's particle density
 * scales with its subscore weight; the streams converge toward the
 * output and join into one terminal point.
 *
 * Aesthetic: clean dataflow / Matrix-rain crossed with a river
 * delta. Particles are simple circles with a soft glow; the three
 * source colours mix into the output tint.
 */
import { useEffect, useRef } from "react";
import { Waves } from "lucide-react";
import { useSampleScore, SUBSCORE_HUES } from "@/components/admin/animations/shared";
import type { MatchingConfig } from "@/lib/matching/config";

interface Props { config: MatchingConfig }

const W = 460;
const H = 220;
const OUTPUT_X = W - 60;
const OUTPUT_Y = H / 2;
const SOURCE_X = 60;

interface Particle {
  id: number;
  channel: 0 | 1 | 2;
  // Each particle is a parameter along a bezier curve from its
  // source row to the output. We store the seed start time so
  // (now - t0) / dur drives the position.
  t0: number;
}

export function DataStream({ config }: Props) {
  const { score, tone, bandLabel } = useSampleScore(config);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number | null>(null);
  const nextIdRef = useRef(0);

  // Channel definitions — source y per stream and bezier control
  // points so they curve into the output.
  const channels = [
    { sourceY: H * 0.25, weight: config.weights.direct,   colour: SUBSCORE_HUES.direct },
    { sourceY: H * 0.50, weight: config.weights.semantic, colour: SUBSCORE_HUES.semantic },
    { sourceY: H * 0.75, weight: config.weights.pathway,  colour: SUBSCORE_HUES.pathway },
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;
    // Capture in a definite-typed local so the closure inside `frame`
    // doesn't need to re-narrow against the possibly-null union.
    const ctx: CanvasRenderingContext2D = ctx2d;

    // DPI scaling
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.scale(dpr, dpr);

    // Particle spawn cadence per channel, in ms. Heavier weight =
    // faster cadence.
    // Tracks per-channel timestamp of the last spawn so cadence is
    // honoured even when raf delivers irregular timestamps.
    const lastSpawn = [0, 0, 0];
    const cadence = (w: number) => Math.max(80, 600 - w * 5);

    const DURATION = 2600; // ms — flight time per particle

    function bezierPoint(t: number, p0: [number, number], p1: [number, number], p2: [number, number], p3: [number, number]) {
      const omt = 1 - t;
      const omt2 = omt * omt;
      const t2 = t * t;
      return [
        omt2 * omt * p0[0] + 3 * omt2 * t * p1[0] + 3 * omt * t2 * p2[0] + t2 * t * p3[0],
        omt2 * omt * p0[1] + 3 * omt2 * t * p1[1] + 3 * omt * t2 * p2[1] + t2 * t * p3[1],
      ];
    }

    function frame(now: number) {
      // Spawn — explicit 0/1/2 loop to keep the channel index
      // typed as the 0|1|2 literal union the Particle interface
      // expects without an `as` per iteration.
      for (const i of [0, 1, 2] as const) {
        if (channels[i].weight <= 0) continue;
        if (now - lastSpawn[i] > cadence(channels[i].weight)) {
          lastSpawn[i] = now;
          particlesRef.current.push({ id: ++nextIdRef.current, channel: i, t0: now });
        }
      }
      // Prune
      particlesRef.current = particlesRef.current.filter((p) => now - p.t0 < DURATION);

      // Render
      ctx.clearRect(0, 0, W, H);
      // Output node halo
      const grad = ctx.createRadialGradient(OUTPUT_X, OUTPUT_Y, 0, OUTPUT_X, OUTPUT_Y, 60);
      grad.addColorStop(0, `${tone}55`);
      grad.addColorStop(1, `${tone}00`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(OUTPUT_X, OUTPUT_Y, 60, 0, Math.PI * 2);
      ctx.fill();

      // Particles
      for (const p of particlesRef.current) {
        const t = (now - p.t0) / DURATION;
        const ch = channels[p.channel];
        const p0: [number, number] = [SOURCE_X, ch.sourceY];
        const p1: [number, number] = [SOURCE_X + 100, ch.sourceY];
        const p2: [number, number] = [OUTPUT_X - 120, OUTPUT_Y];
        const p3: [number, number] = [OUTPUT_X, OUTPUT_Y];
        const [x, y] = bezierPoint(t, p0, p1, p2, p3);
        const op = 0.85 * (1 - Math.pow(t - 0.5, 2) * 4); // peak in middle
        ctx.fillStyle = ch.colour;
        ctx.shadowBlur = 6;
        ctx.shadowColor = ch.colour;
        ctx.globalAlpha = Math.max(0, Math.min(1, op));
        ctx.beginPath();
        ctx.arc(x, y, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      // Output node ring + score
      ctx.fillStyle = tone;
      ctx.beginPath();
      ctx.arc(OUTPUT_X, OUTPUT_Y, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 14px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(score), OUTPUT_X, OUTPUT_Y);

      // Source labels
      ctx.fillStyle = "rgba(148, 163, 184, 0.75)";
      ctx.font = "bold 9px ui-monospace, monospace";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      const labels = ["DIRECT", "SEMANTIC", "PATHWAY"];
      channels.forEach((ch, i) => {
        ctx.fillStyle = ch.colour;
        ctx.fillText(labels[i], SOURCE_X - 8, ch.sourceY - 6);
        ctx.fillStyle = "rgba(148, 163, 184, 0.6)";
        ctx.fillText(`w=${ch.weight}`, SOURCE_X - 8, ch.sourceY + 6);
        // Source nub
        ctx.fillStyle = ch.colour;
        ctx.beginPath();
        ctx.arc(SOURCE_X, ch.sourceY, 4, 0, Math.PI * 2);
        ctx.fill();
      });

      rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.weights.direct, config.weights.semantic, config.weights.pathway, score, tone]);

  return (
    <section className="relative overflow-hidden rounded-2xl ring-1 ring-inset ring-cyan-900/40 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <header className="relative px-5 pt-4 pb-2 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[10px] uppercase tracking-[0.28em] font-bold text-cyan-300/80 inline-flex items-center gap-1.5 font-mono">
          <Waves size={11} /> Data stream
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
      <div className="relative px-5 pb-4 pt-1 flex justify-center">
        <canvas ref={canvasRef} className="max-w-full h-auto" aria-hidden />
      </div>
    </section>
  );
}
