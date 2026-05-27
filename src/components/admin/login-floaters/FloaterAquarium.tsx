"use client";

/**
 * FloaterAquarium — a small self-sustaining "tank" of drifting
 * floater glyphs that lives at the bottom of /admin/login-floaters.
 *
 * Two modes:
 *   • PANEL mode (default): a 320-px-tall band at the bottom of
 *     the admin page. ~14 floaters drift slowly across it. Click
 *     anywhere on the panel to enter screensaver mode.
 *   • SCREENSAVER mode (after click): full-viewport overlay with
 *     ~26 larger floaters, a slow day/night-cycle gradient on the
 *     backdrop, cursor flee, click bursts, and a moving caption
 *     headlining whoever's on screen. Esc / close-button to exit.
 *
 * "Self-sustaining": every swimmer has a finite lifespan (30-90s).
 * When it expires it fades out and a different floater is spawned
 * with a fresh identity, position, and velocity — population is
 * always replenished to its target. Glyphs change colour over their
 * lifespan to read as a slowly evolving ecosystem. The system
 * never empties and never repeats exactly.
 *
 * Performance — only the swimmer LIST drives React renders (every
 * ~2 s when births/deaths happen). Per-frame motion is written to
 * DOM via direct ref mutation of inline `transform` on each
 * swimmer's wrapper div, so 60 fps doesn't trigger React work.
 * GPU-accelerated translate3d keeps CPU low at ~26 swimmers.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, Minimize2, X, Sparkles } from "lucide-react";
import { FLOATER_LIST, type FloaterDef } from "@/lib/login-floaters/registry";

// ── Tunables ─────────────────────────────────────────────────────
const POP_PANEL       = 14;     // swimmers in the embedded panel
const POP_SCREENSAVER = 26;     // swimmers in the fullscreen overlay
const MIN_SIZE        = 70;     // smallest swimmer (px)
const MAX_SIZE        = 150;    // largest swimmer (px)
const MIN_LIFE_MS     = 30_000; // shortest lifespan
const MAX_LIFE_MS     = 90_000; // longest lifespan
const FADE_IN_MS      = 1_400;  // fade-in window at birth
const FADE_OUT_MS     = 2_400;  // fade-out window before death
const MAX_SPEED       = 0.7;    // velocity clamp (px/frame ~ 42 px/s)
const BROWNIAN_KICK   = 0.018;  // random velocity nudge per frame
const FLEE_RADIUS     = 140;    // cursor flee radius (screensaver)
const FLEE_STRENGTH   = 0.14;   // velocity push per frame inside radius
const CLICK_BURST     = 3;      // swimmers spawned per click in screensaver

// Pre-pick a palette of theme-friendly tint classes. Each swimmer
// is born with one of these; rotates through them over its
// lifespan so colour reads as gentle evolution.
const HUES = [
  "text-sky-300/40",
  "text-cyan-300/40",
  "text-emerald-300/40",
  "text-amber-300/40",
  "text-rose-300/40",
  "text-violet-300/40",
  "text-fuchsia-300/40",
  "text-teal-300/40",
];

// ── Aquarium decor constants ─────────────────────────────────────
// Plants anchored in the sand along the bottom. Stable across
// renders (module-scope) so the seaweed bed doesn't reshuffle every
// time the swimmer list changes. Six plants spaced roughly even
// across the width with deliberate jitter; mix of three frond
// shapes so the bed reads as a real ecosystem, not a row of clones.
type PlantShape = "ribbon" | "fan" | "tassel";
const AQUARIUM_PLANTS: {
  leftPct: number;
  shape: PlantShape;
  scale: number;
  swayDurSec: number;
  swayDelaySec: number;
  color: string;
}[] = [
  { leftPct:  6, shape: "ribbon", scale: 1.10, swayDurSec: 5.6, swayDelaySec: 0.0, color: "#2d8a5e" },
  { leftPct: 18, shape: "fan",    scale: 0.85, swayDurSec: 6.2, swayDelaySec: 1.4, color: "#1d6b4a" },
  { leftPct: 32, shape: "tassel", scale: 0.95, swayDurSec: 5.0, swayDelaySec: 0.6, color: "#3da774" },
  { leftPct: 48, shape: "ribbon", scale: 1.25, swayDurSec: 6.8, swayDelaySec: 2.1, color: "#1d6b4a" },
  { leftPct: 62, shape: "tassel", scale: 0.80, swayDurSec: 5.4, swayDelaySec: 0.3, color: "#2d8a5e" },
  { leftPct: 76, shape: "fan",    scale: 1.05, swayDurSec: 5.8, swayDelaySec: 1.7, color: "#3da774" },
  { leftPct: 90, shape: "ribbon", scale: 0.90, swayDurSec: 6.4, swayDelaySec: 0.9, color: "#1d6b4a" },
];

// Bubble columns. Each rises from its own random x position; the
// duration + delay are tuned so the panel sees ~3 bubbles in motion
// at any moment, not all eight at once.
const AQUARIUM_BUBBLES: {
  leftPct: number;
  sizePx: number;
  durationSec: number;
  delaySec: number;
}[] = [
  { leftPct: 12, sizePx:  6, durationSec:  9, delaySec: 0   },
  { leftPct: 24, sizePx:  4, durationSec:  7, delaySec: 1.8 },
  { leftPct: 38, sizePx:  8, durationSec: 12, delaySec: 3.4 },
  { leftPct: 54, sizePx:  5, durationSec:  8, delaySec: 0.9 },
  { leftPct: 68, sizePx:  3, durationSec:  6, delaySec: 2.6 },
  { leftPct: 80, sizePx:  7, durationSec: 10, delaySec: 4.2 },
  { leftPct: 92, sizePx:  4, durationSec:  8, delaySec: 1.2 },
  { leftPct: 30, sizePx:  3, durationSec:  7, delaySec: 5.0 },
];

/** SVG silhouettes for the three plant shapes. All anchored at
 *  bottom-centre (viewBox y=40 is the sand line) and use
 *  currentColor so the per-plant `color:` style above tints them. */
function PlantSvg({ shape }: { shape: PlantShape }) {
  switch (shape) {
    case "ribbon":
      // Tall vallisneria-like ribbon plant — narrow blades that
      // ripple in the current. Anchored at viewBox bottom.
      return (
        <svg viewBox="0 0 24 80" width="24" height="80" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
          <path d="M 10 80 C 7 60 13 50 9 30 C 5 14 12 6 11 0" />
          <path d="M 14 80 C 17 62 11 50 15 32 C 19 16 13 8 14 2" opacity="0.85" />
          <path d="M 12 80 C 12 64 12 48 12 30 C 12 16 12 8 12 0" opacity="0.6" strokeWidth="2" />
        </svg>
      );
    case "fan":
      // Broad-bladed fan plant. Multiple blades fan out from a
      // central anchor, like Cryptocoryne or Anubias.
      return (
        <svg viewBox="0 0 36 56" width="36" height="56" fill="currentColor" stroke="currentColor" strokeWidth="0.5" aria-hidden>
          <ellipse cx="6"  cy="32" rx="3.5" ry="22" transform="rotate(-22 6 32)" fillOpacity="0.85" />
          <ellipse cx="14" cy="28" rx="4"   ry="26" transform="rotate(-8 14 28)" fillOpacity="0.95" />
          <ellipse cx="22" cy="28" rx="4"   ry="26" transform="rotate(8 22 28)" fillOpacity="0.95" />
          <ellipse cx="30" cy="32" rx="3.5" ry="22" transform="rotate(22 30 32)" fillOpacity="0.85" />
        </svg>
      );
    case "tassel":
      // Bushy, foxtail-style tassel plant — many fine strands.
      return (
        <svg viewBox="0 0 26 66" width="26" height="66" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
          <path d="M 13 66 L 13 18" strokeWidth="2.2" />
          {[58, 50, 42, 34, 26, 18].map((y, i) => (
            <g key={i}>
              <path d={`M 13 ${y} q -6 -4 -10 -10`} opacity={0.95 - i * 0.06} />
              <path d={`M 13 ${y} q  6 -4  10 -10`} opacity={0.95 - i * 0.06} />
              <path d={`M 13 ${y} q -3 -5  -5 -12`} opacity={0.85 - i * 0.06} />
              <path d={`M 13 ${y} q  3 -5   5 -12`} opacity={0.85 - i * 0.06} />
            </g>
          ))}
        </svg>
      );
  }
}

interface Swimmer {
  key: number;
  registryId: string;
  size: number;
  hueIdx: number;
  born: number;
  lifespan: number;
  // Motion fields live in a parallel ref so they don't trigger
  // React renders on every frame.
}
interface Motion {
  x: number; y: number;
  vx: number; vy: number;
}

function randomFloater(): FloaterDef {
  return FLOATER_LIST[Math.floor(Math.random() * FLOATER_LIST.length)];
}

function makeSwimmer(idCounter: { v: number }): Swimmer {
  const reg = randomFloater();
  const size = MIN_SIZE + Math.random() * (MAX_SIZE - MIN_SIZE);
  return {
    key: idCounter.v++,
    registryId: reg.id,
    size,
    hueIdx: Math.floor(Math.random() * HUES.length),
    born: performance.now(),
    lifespan: MIN_LIFE_MS + Math.random() * (MAX_LIFE_MS - MIN_LIFE_MS),
  };
}

function makeMotion(width: number, height: number, atX?: number, atY?: number): Motion {
  return {
    x: atX ?? Math.random() * width,
    y: atY ?? Math.random() * height,
    vx: (Math.random() - 0.5) * MAX_SPEED * 0.8,
    vy: (Math.random() - 0.5) * MAX_SPEED * 0.8,
  };
}

export function FloaterAquarium() {
  const [fullscreen, setFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const idCounterRef = useRef({ v: 0 });
  const [swimmers, setSwimmers] = useState<Swimmer[]>(() => []);
  const motionRef = useRef<Map<number, Motion>>(new Map());
  const nodeRef = useRef<Map<number, HTMLDivElement>>(new Map());
  const cursorRef = useRef<{ x: number; y: number } | null>(null);
  const [caption, setCaption] = useState<string>("");
  const [bgPhase, setBgPhase] = useState(0); // 0..1 — slow day/night cycle

  const targetPop = fullscreen ? POP_SCREENSAVER : POP_PANEL;

  // ── Initial population + reseed on mode change ────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const w = el.clientWidth || 800;
    const h = el.clientHeight || 320;
    const fresh: Swimmer[] = [];
    motionRef.current.clear();
    for (let i = 0; i < targetPop; i++) {
      const s = makeSwimmer(idCounterRef.current);
      fresh.push(s);
      motionRef.current.set(s.key, makeMotion(w, h));
    }
    setSwimmers(fresh);
  }, [targetPop]);

  // ── 60 fps motion via direct DOM writes (no React renders) ────
  useEffect(() => {
    let rafId = 0;
    function frame() {
      const el = containerRef.current;
      if (!el) {
        rafId = requestAnimationFrame(frame);
        return;
      }
      const w = el.clientWidth, h = el.clientHeight;
      // Update motions + write transforms imperatively.
      for (const [key, m] of motionRef.current) {
        // Brownian nudge so motion never settles into perfect lines.
        m.vx += (Math.random() - 0.5) * BROWNIAN_KICK;
        m.vy += (Math.random() - 0.5) * BROWNIAN_KICK;
        // Gentle pull toward MAX_SPEED-bounded velocity.
        m.vx = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, m.vx));
        m.vy = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, m.vy));
        // Cursor flee in screensaver mode.
        if (fullscreen && cursorRef.current) {
          const dx = m.x - cursorRef.current.x;
          const dy = m.y - cursorRef.current.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 0 && dist < FLEE_RADIUS) {
            const push = ((FLEE_RADIUS - dist) / FLEE_RADIUS) * FLEE_STRENGTH;
            m.vx += (dx / dist) * push;
            m.vy += (dy / dist) * push;
          }
        }
        m.x += m.vx;
        m.y += m.vy;
        // Wrap edges — infinite-ocean feel rather than bouncy walls.
        const margin = MAX_SIZE;
        if (m.x < -margin) m.x = w + margin;
        if (m.x > w + margin) m.x = -margin;
        if (m.y < -margin) m.y = h + margin;
        if (m.y > h + margin) m.y = -margin;
        // Write transform — translate3d to land on GPU compositor.
        const node = nodeRef.current.get(key);
        if (node) {
          node.style.transform = `translate3d(${m.x}px, ${m.y}px, 0)`;
        }
      }
      rafId = requestAnimationFrame(frame);
    }
    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [fullscreen]);

  // ── Birth / death cycle — runs every 2 s, the only React-state
  //     update path. Drops expired swimmers, tops up to target. ──
  useEffect(() => {
    const interval = window.setInterval(() => {
      const now = performance.now();
      const el = containerRef.current;
      if (!el) return;
      const w = el.clientWidth, h = el.clientHeight;
      setSwimmers((cur) => {
        const alive = cur.filter((s) => now - s.born < s.lifespan);
        // Remove motion entries for the departed.
        for (const s of cur) {
          if (now - s.born >= s.lifespan) {
            motionRef.current.delete(s.key);
          }
        }
        while (alive.length < targetPop) {
          const s = makeSwimmer(idCounterRef.current);
          alive.push(s);
          motionRef.current.set(s.key, makeMotion(w, h));
        }
        return alive;
      });
    }, 2000);
    return () => window.clearInterval(interval);
  }, [targetPop]);

  // ── Slow day/night cycle for the screensaver backdrop (90 s
  //     full cycle so it's noticeable but not distracting) ──────
  useEffect(() => {
    let rafId = 0;
    const start = performance.now();
    function frame() {
      const t = ((performance.now() - start) / 90_000) % 1;
      setBgPhase(t);
      rafId = requestAnimationFrame(frame);
    }
    if (fullscreen) {
      rafId = requestAnimationFrame(frame);
    }
    return () => cancelAnimationFrame(rafId);
  }, [fullscreen]);

  // ── Floating caption — every few seconds, name a random
  //     swimmer's process so the screensaver doesn't just float
  //     abstract glyphs. "Spotted: CRISPR edit cycle…" etc.    ──
  useEffect(() => {
    if (!fullscreen) {
      setCaption("");
      return;
    }
    function pick() {
      const s = swimmers[Math.floor(Math.random() * swimmers.length)];
      if (!s) return;
      const reg = FLOATER_LIST.find((r) => r.id === s.registryId);
      if (!reg) return;
      setCaption(`Spotted: ${reg.displayName.toLowerCase()}.`);
    }
    pick();
    const interval = window.setInterval(pick, 6_000);
    return () => window.clearInterval(interval);
  }, [fullscreen, swimmers]);

  // ── Esc closes screensaver ────────────────────────────────────
  useEffect(() => {
    if (!fullscreen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setFullscreen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!fullscreen) {
        setFullscreen(true);
        return;
      }
      // In fullscreen, click spawns a small burst at click point.
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setSwimmers((cur) => {
        const burst: Swimmer[] = [];
        for (let i = 0; i < CLICK_BURST; i++) {
          const s = makeSwimmer(idCounterRef.current);
          burst.push(s);
          const angle = (i / CLICK_BURST) * Math.PI * 2 + Math.random();
          motionRef.current.set(s.key, {
            x, y,
            vx: Math.cos(angle) * (MAX_SPEED + 0.4),
            vy: Math.sin(angle) * (MAX_SPEED + 0.4),
          });
        }
        return [...cur, ...burst];
      });
    },
    [fullscreen],
  );

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!fullscreen) return;
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    cursorRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
  function handleMouseLeave() {
    cursorRef.current = null;
  }

  // ── Aquarium water tint — vertical gradient (lighter at the
  //     surface, darker in the depths) plus a day/night cycle that
  //     sweeps the palette in fullscreen mode.            ──
  const bgGradient = useMemo(() => {
    if (!fullscreen) {
      // Static aquarium: bright cyan at the surface, deep teal at
      // the bottom. Reads as "looking into a well-lit tank."
      return "linear-gradient(180deg, #1e6890 0%, #154a72 30%, #0d2f55 70%, #0b1f3a 100%)";
    }
    // Day/night aquarium cycle. Surface always lighter than depths;
    // the palette shifts so a 90-second cycle reads as a tank lit
    // by the sun overhead (or moonlight after dark).
    //   surface = top-of-tank colour
    //   middle  = mid-water
    //   depth   = bottom (where the sand sits)
    const palette = [
      { surface: "#0a1f38", middle: "#0a182e", depth: "#070f1f" }, // pre-dawn — deep navy, faint
      { surface: "#1f6e92", middle: "#154a72", depth: "#0d2f55" }, // morning — sunlight breaks the surface
      { surface: "#37a8d8", middle: "#1f70b0", depth: "#0e3a66" }, // midday — bright tropical blue
      { surface: "#825a8a", middle: "#3a285a", depth: "#1a1438" }, // dusk — magenta-tinged water
      { surface: "#0a1f38", middle: "#0a182e", depth: "#070f1f" }, // back to pre-dawn
    ];
    const seg = bgPhase * (palette.length - 1);
    const i = Math.floor(seg);
    const t = seg - i;
    const a = palette[i];
    const b = palette[i + 1] ?? palette[i];
    const mix = (c1: string, c2: string, m: number) => {
      const p1 = parseInt(c1.slice(1), 16);
      const p2 = parseInt(c2.slice(1), 16);
      const r = Math.round(((p1 >> 16) & 0xff) * (1 - m) + ((p2 >> 16) & 0xff) * m);
      const g = Math.round(((p1 >> 8) & 0xff) * (1 - m) + ((p2 >> 8) & 0xff) * m);
      const bl = Math.round((p1 & 0xff) * (1 - m) + (p2 & 0xff) * m);
      return `rgb(${r}, ${g}, ${bl})`;
    };
    return `linear-gradient(180deg, ${mix(a.surface, b.surface, t)} 0%, ${mix(a.middle, b.middle, t)} 45%, ${mix(a.depth, b.depth, t)} 100%)`;
  }, [bgPhase, fullscreen]);

  const containerClass = fullscreen
    ? "fixed inset-0 z-[200] overflow-hidden cursor-crosshair select-none"
    : "relative w-full h-[320px] overflow-hidden border border-line cursor-zoom-in select-none rounded-none";

  return (
    <>
      {!fullscreen && (
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="font-mono text-[10px] tracking-[0.32em] uppercase text-subtle">
              Floater Aquarium
            </p>
            <h3 className="text-sm font-semibold text-fg mt-0.5">
              A self-sustaining tank of process glyphs
            </h3>
            <p className="text-[11.5px] text-muted mt-1 max-w-prose">
              Each glyph drifts on its own velocity, lives 30-90 s, then fades
              out and is replaced by another from the registry. Population is
              always replenished. Click the tank to enter screensaver mode —
              full-viewport, with cursor flee + click bursts.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFullscreen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-muted hover:text-fg border border-line"
            title="Enter screensaver mode"
          >
            <Maximize2 size={12} /> Screensaver
          </button>
        </div>
      )}
      <div
        ref={containerRef}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={containerClass}
        style={{ background: bgGradient }}
        role="region"
        aria-label={fullscreen ? "Floater aquarium — screensaver" : "Floater aquarium — click to enter screensaver"}
      >
        {/* ╔══════════════════════════════════════════════════════════╗
         *  ║ Aquarium decor — water surface + light beams + sand    ║
         *  ║ + swaying plants + rising bubbles. Rendered behind the ║
         *  ║ swimmer fish so the tank feels physical, not just a    ║
         *  ║ flat panel with floating glyphs.                       ║
         *  ╚══════════════════════════════════════════════════════════╝ */}

        {/* Sub-surface light shimmer — a horizontal band of pale
            light just under the top edge of the tank. Subtle
            shimmer keyframe makes it feel like sunlight refracting
            on the water. */}
        <div className="aquarium-surface pointer-events-none" aria-hidden />

        {/* Diagonal light beams piercing down through the water from
            above. Two beams at slightly different angles + speeds
            so the lit-from-overhead feeling reads even on small
            panel sizes. */}
        <div className="aquarium-light-beam aquarium-light-beam-a pointer-events-none" aria-hidden />
        <div className="aquarium-light-beam aquarium-light-beam-b pointer-events-none" aria-hidden />

        {/* Sand / gravel bed at the bottom of the tank. Layered
            radial highlights make it read as textured pebbles, not
            a flat band. */}
        <div className="aquarium-sand pointer-events-none" aria-hidden />

        {/* Swaying seaweed plants anchored in the sand. Each frond
            is a different colour + sway phase so the bed doesn't
            look like an army of identical clones. */}
        <div className="aquarium-plants pointer-events-none" aria-hidden>
          {AQUARIUM_PLANTS.map((p, i) => (
            <span
              key={i}
              className={`aquarium-plant aquarium-plant-${p.shape}`}
              style={{
                left: `${p.leftPct}%`,
                ["--plant-scale" as string]: p.scale,
                ["--plant-sway-dur" as string]: `${p.swayDurSec}s`,
                ["--plant-sway-delay" as string]: `${p.swayDelaySec}s`,
                color: p.color,
              } as React.CSSProperties}
            >
              <PlantSvg shape={p.shape} />
            </span>
          ))}
        </div>

        {/* Rising bubbles — fixed set of bubble columns at random
            x positions, each on its own rise speed + delay so they
            never sync up. */}
        <div className="aquarium-bubbles pointer-events-none" aria-hidden>
          {AQUARIUM_BUBBLES.map((b, i) => (
            <span
              key={i}
              className="aquarium-bubble"
              style={{
                left: `${b.leftPct}%`,
                width: `${b.sizePx}px`,
                height: `${b.sizePx}px`,
                animationDuration: `${b.durationSec}s`,
                animationDelay: `${b.delaySec}s`,
              }}
            />
          ))}
        </div>

        {/* Front-glass vignette — slight inside shadow + a thin
            top-edge highlight so the panel reads as glass with
            water behind it, not a back-lit screen. */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{ boxShadow: "inset 0 -40px 60px -10px rgba(0,0,0,0.45), inset 0 18px 24px -10px rgba(255,255,255,0.10)" }}
        />

        {/* Caption in screensaver — bottom-left, fades */}
        {fullscreen && caption && (
          <div className="absolute bottom-6 left-6 z-10 pointer-events-none">
            <p className="font-mono text-[11px] tracking-[0.24em] uppercase text-white/65 animate-fade-in">
              <Sparkles size={10} className="inline mr-1 text-white/45" />
              {caption}
            </p>
          </div>
        )}

        {/* Close + hint chrome in screensaver */}
        {fullscreen && (
          <>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setFullscreen(false); }}
              className="absolute top-4 right-4 z-20 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white/80 hover:text-white border border-white/20 bg-black/30 backdrop-blur-sm"
              title="Exit screensaver (Esc)"
            >
              <Minimize2 size={12} /> Exit
            </button>
            <p className="absolute top-4 left-4 z-20 font-mono text-[10px] tracking-[0.3em] uppercase text-white/45 pointer-events-none">
              click anywhere — flee on cursor — esc to exit
            </p>
          </>
        )}

        {/* The swimmers themselves. Each wrapper's transform is
            written imperatively on every animation frame; React
            only re-renders this list when births/deaths happen. */}
        {swimmers.map((s) => (
          <Swimmer key={s.key} swimmer={s} nodeMap={nodeRef} />
        ))}
      </div>
    </>
  );
}

/** Per-swimmer DOM cell. Holds the registry component at the
 *  swimmer's size + tint, plus a lifecycle opacity envelope that
 *  fades it in on birth and out before death. The wrapper's
 *  `transform` is mutated by the parent's RAF loop via the
 *  passed-down ref map — we don't keep position in React state.
 *  Opacity is also written directly to the DOM via setInterval
 *  (no setState) so a tank of 26 swimmers doesn't trigger 26 ×
 *  60 = 1560 React renders per second.
 */
function Swimmer({
  swimmer,
  nodeMap,
}: {
  swimmer: Swimmer;
  nodeMap: React.MutableRefObject<Map<number, HTMLDivElement>>;
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    function write() {
      const node = wrapperRef.current;
      if (!node) return;
      const age = performance.now() - swimmer.born;
      const remaining = swimmer.lifespan - age;
      let o = 1;
      if (age < FADE_IN_MS) o = age / FADE_IN_MS;
      else if (remaining < FADE_OUT_MS) o = Math.max(0, remaining / FADE_OUT_MS);
      node.style.opacity = String(o);
    }
    write();
    const interval = window.setInterval(write, 100);
    return () => window.clearInterval(interval);
  }, [swimmer.born, swimmer.lifespan]);

  const reg = FLOATER_LIST.find((r) => r.id === swimmer.registryId);
  if (!reg) return null;
  const Cmp = reg.Component;
  const hueClass = HUES[swimmer.hueIdx];

  return (
    <div
      ref={(el) => {
        wrapperRef.current = el;
        if (el) nodeMap.current.set(swimmer.key, el);
        else nodeMap.current.delete(swimmer.key);
      }}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        willChange: "transform, opacity",
        opacity: 0, // start invisible; the fade-in interval lifts it
        transition: "opacity 250ms ease",
        // The wrapper is centred on its anchor point so motion
        // numbers stay readable as "the swimmer's centre".
        marginLeft: -swimmer.size / 2,
        marginTop: -swimmer.size / 2,
      }}
      aria-hidden
    >
      <div className={hueClass}>
        <Cmp size={swimmer.size} />
      </div>
    </div>
  );
}
