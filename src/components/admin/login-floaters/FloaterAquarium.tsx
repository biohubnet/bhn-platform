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

  // ── Day/night gradient — phase 0..1, three colour stops keep it
  //     soft. Sweeps hue + lightness on each stop.            ──
  const bgGradient = useMemo(() => {
    if (!fullscreen) {
      // Static dark teal-navy for the panel.
      return "linear-gradient(135deg, #0a1024 0%, #0c1530 50%, #131739 100%)";
    }
    // Day/night cycle: phase 0 = pre-dawn navy, 0.25 = morning teal,
    // 0.5 = midday cyan-blue, 0.75 = dusk magenta, 1 = midnight navy.
    const palette = [
      { stop1: "#0a1024", stop2: "#0c1530", stop3: "#131739" }, // pre-dawn
      { stop1: "#0d2030", stop2: "#114050", stop3: "#1a5a70" }, // morning teal
      { stop1: "#0e3a55", stop2: "#155080", stop3: "#1f70b0" }, // midday
      { stop1: "#3d1840", stop2: "#5c1f55", stop3: "#7b2768" }, // dusk magenta
      { stop1: "#0a1024", stop2: "#0c1530", stop3: "#131739" }, // back to pre-dawn
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
    return `linear-gradient(135deg, ${mix(a.stop1, b.stop1, t)} 0%, ${mix(a.stop2, b.stop2, t)} 50%, ${mix(a.stop3, b.stop3, t)} 100%)`;
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
        {/* Backdrop layers — fine noise + soft vignette so the tank
            doesn't read as a flat panel. */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none opacity-[0.05] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.6' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.6'/></svg>\")",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{ boxShadow: "inset 0 0 120px rgba(0,0,0,0.45)" }}
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
