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
const MIN_LIFE_MS     = 40_000; // shortest lifespan (was 30s)
const MAX_LIFE_MS     = 110_000;// longest lifespan (was 90s) — longer
                                // because everything moves slower now
                                // and we want fish on screen longer
const FADE_IN_MS      = 1_800;  // gentle fade-in (was 1.4s)
const FADE_OUT_MS     = 2_800;  // gentle fade-out (was 2.4s)
const MAX_SPEED       = 0.32;   // velocity clamp (was 0.7) — half-
                                // speed, so the tank feels calm
                                // rather than frantic
const BROWNIAN_KICK   = 0.008;  // random velocity nudge per frame
                                // (was 0.018) — less jittery
const FLEE_RADIUS     = 140;    // cursor flee radius (screensaver)
const FLEE_STRENGTH   = 0.10;   // velocity push per frame inside radius
                                // (was 0.14) — proportional to lower
                                // speed clamp
const CLICK_BURST     = 3;      // swimmers spawned per click in screensaver

// 无厘头 fishing — every so often, a fishing line drops from the
// top of the tank, hooks a random swimmer, and lifts it out.
// Sequence: drop (1 s) → hook + wiggle (1 s) → rise out (3 s).
const FISH_INTERVAL_MIN_MS = 25_000; // earliest a new fishing can fire
const FISH_INTERVAL_MAX_MS = 50_000; // latest
const FISH_DROP_MS         = 1_000;  // line descends from above
const FISH_WIGGLE_MS       = 1_100;  // hooked-and-squirming
const FISH_RISE_MS         = 2_800;  // line + fish rise off the top
const FISH_TOTAL_MS        = FISH_DROP_MS + FISH_WIGGLE_MS + FISH_RISE_MS;

// Pre-pick a palette of theme-friendly tint classes. Each swimmer
// is born with one of these; rotates through them over its
// lifespan so colour reads as gentle evolution.
// Cool, dim bioluminescent tints — the swimmers read as faint glowing
// creatures suspended in dark water rather than bright cartoon fish.
const HUES = [
  "text-sky-300/35",
  "text-cyan-300/35",
  "text-blue-300/30",
  "text-teal-300/30",
  "text-sky-200/28",
  "text-cyan-200/30",
  "text-slate-200/22",
  "text-indigo-300/28",
];

// ── Aquarium decor constants ─────────────────────────────────────
// Drifting dust motes — "marine snow" caught in the water's glow.
// Module-scope so the field doesn't reshuffle when the swimmer list
// changes. Scattered across the water region at varied depth + speed.
const AQUARIUM_MOTES: {
  leftPct: number;
  topPct: number;
  sizePx: number;
  durationSec: number;
  delaySec: number;
  opacity: number;
}[] = [
  { leftPct:  8, topPct: 30, sizePx: 2,   durationSec: 14, delaySec:  0,   opacity: 0.5  },
  { leftPct: 16, topPct: 62, sizePx: 1.5, durationSec: 18, delaySec:  3.2, opacity: 0.4  },
  { leftPct: 27, topPct: 44, sizePx: 3,   durationSec: 22, delaySec:  6.0, opacity: 0.6  },
  { leftPct: 35, topPct: 70, sizePx: 2,   durationSec: 16, delaySec:  1.5, opacity: 0.45 },
  { leftPct: 44, topPct: 36, sizePx: 1.5, durationSec: 20, delaySec:  8.4, opacity: 0.4  },
  { leftPct: 52, topPct: 58, sizePx: 2.5, durationSec: 24, delaySec:  2.7, opacity: 0.55 },
  { leftPct: 61, topPct: 48, sizePx: 2,   durationSec: 17, delaySec:  5.1, opacity: 0.5  },
  { leftPct: 69, topPct: 66, sizePx: 1.5, durationSec: 21, delaySec:  9.3, opacity: 0.4  },
  { leftPct: 78, topPct: 40, sizePx: 3,   durationSec: 19, delaySec:  4.2, opacity: 0.6  },
  { leftPct: 86, topPct: 56, sizePx: 2,   durationSec: 23, delaySec:  7.6, opacity: 0.45 },
  { leftPct: 92, topPct: 34, sizePx: 1.5, durationSec: 15, delaySec: 11.0, opacity: 0.4  },
];

// Bubble columns. Each rises from its own random x position. The
// rise durations are deliberately slow (16-32 s end-to-end) so the
// bubbles drift up calmly — real-aquarium-bubble cadence, not
// effervescent-soda speed. Delays staggered so the panel sees ~3
// bubbles in motion at any moment, never all eight in sync.
const AQUARIUM_BUBBLES: {
  leftPct: number;
  sizePx: number;
  durationSec: number;
  delaySec: number;
}[] = [
  { leftPct: 12, sizePx:  6, durationSec: 22, delaySec:  0   },
  { leftPct: 24, sizePx:  4, durationSec: 18, delaySec:  4.6 },
  { leftPct: 38, sizePx:  8, durationSec: 30, delaySec:  8.4 },
  { leftPct: 54, sizePx:  5, durationSec: 20, delaySec:  2.5 },
  { leftPct: 68, sizePx:  3, durationSec: 16, delaySec:  6.4 },
  { leftPct: 80, sizePx:  7, durationSec: 26, delaySec: 10.2 },
  { leftPct: 92, sizePx:  4, durationSec: 20, delaySec:  3.1 },
  { leftPct: 30, sizePx:  3, durationSec: 18, delaySec: 12.5 },
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
  /** Per-swimmer mass for elastic collisions. Random 0.5-2.0 at
   *  spawn so heavy fish push light fish around more than the
   *  reverse. NOT a property of the floater registry — assigned
   *  here at the aquarium level so the same registry component
   *  can appear as a "light" fish in one spawn and a "heavy" one
   *  in another. */
  mass: number;
  /** Radius used by collision detection. Copied from the parent
   *  Swimmer so the RAF loop can read it without joining maps. */
  size: number;
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

function makeMotion(width: number, height: number, size: number, atX?: number, atY?: number): Motion {
  return {
    x: atX ?? Math.random() * width,
    y: atY ?? Math.random() * height,
    vx: (Math.random() - 0.5) * MAX_SPEED * 0.8,
    vy: (Math.random() - 0.5) * MAX_SPEED * 0.8,
    // Random mass per spawn. Range 0.5 → 2.0 so a heavy fish has
    // 4× the inertia of a light one — collisions visibly favour
    // the heavier swimmer.
    mass: 0.5 + Math.random() * 1.5,
    size,
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

  // ── 无厘头 fishing event ───────────────────────────────────────
  // Periodically a fishing line drops in, hooks a random swimmer,
  // and lifts it out of the top of the tank. Tracked through a ref
  // (for the RAF loop to read each frame without re-rendering) and
  // a parallel state (so React knows when to render the line).
  const fishingRef = useRef<{ key: number; startedAt: number; anchorY: number } | null>(null);
  const [fishingKey, setFishingKey] = useState<number | null>(null);

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
      motionRef.current.set(s.key, makeMotion(w, h, s.size));
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
      const now = performance.now();
      const fishing = fishingRef.current;
      // ── Pass 1 — per-swimmer motion update (no transform write
      //     yet; the collision pass below may adjust positions). ──
      for (const [key, m] of motionRef.current) {
        // ── Fishing event override ─────────────────────────────
        // If THIS swimmer is the one being fished, hand its motion
        // entirely to the fishing animation. Three phases:
        //   1. DROP   — fish stays put while the line descends.
        //   2. WIGGLE — fish oscillates left/right "on the hook".
        //   3. RISE   — fish + line lift smoothly off the top edge.
        if (fishing && key === fishing.key) {
          const t = now - fishing.startedAt;
          if (t < FISH_DROP_MS) {
            // Phase 1 — line falling, fish hovering in place.
            m.vx *= 0.85;
            m.vy *= 0.85;
            m.x += m.vx;
            m.y += m.vy;
          } else if (t < FISH_DROP_MS + FISH_WIGGLE_MS) {
            // Phase 2 — hooked. Sine wiggle around its anchor.
            const localT = (t - FISH_DROP_MS) / 1000;
            m.vx = Math.cos(localT * 14) * 0.5;
            m.vy = Math.sin(localT * 9) * 0.18;
            m.x += m.vx;
            m.y = fishing.anchorY + m.vy * 4;
          } else if (t < FISH_TOTAL_MS) {
            // Phase 3 — rising out of the tank. Easing-out so the
            // very last beats are faster than the initial lift.
            const localT = (t - FISH_DROP_MS - FISH_WIGGLE_MS) / FISH_RISE_MS;
            const eased = 1 - Math.pow(1 - localT, 2);
            m.vx = 0;
            m.vy = 0;
            m.y = fishing.anchorY - eased * (fishing.anchorY + MAX_SIZE + 40);
          }
          // Transform-write happens in Pass 3 below — just skip the
          // normal Brownian / flee / collision path here so the fish
          // is on rails.
          continue;
        }

        // ── Normal swimmer motion ──────────────────────────────
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
      }

      // ── Pass 2 — pairwise collisions ─────────────────────────
      // Elastic collision response between every pair of swimmers
      // (the fished swimmer is excluded — it's on rails, off the
      // physics simulation). O(n²) but n ≤ 26 = max 325 checks per
      // frame, trivially cheap.
      //
      // Collision radius: (sizeA + sizeB) * 0.30. The 0.30 factor
      // accounts for the SVG floaters having a lot of empty space
      // around the visible content — using full radius (0.5) would
      // trigger collisions while glyphs still look apart on screen.
      //
      // Mass-weighted impulse: heavier fish push lighter fish harder
      // than vice-versa, so the random per-spawn mass actually reads
      // in the motion (a 2.0-mass swimmer crashing into a 0.5-mass
      // one sends the lighter one flying ~4× as much as it itself
      // gets nudged).
      const entries = Array.from(motionRef.current.entries());
      for (let i = 0; i < entries.length; i++) {
        const [keyA, mA] = entries[i];
        if (fishing && keyA === fishing.key) continue;
        for (let j = i + 1; j < entries.length; j++) {
          const [keyB, mB] = entries[j];
          if (fishing && keyB === fishing.key) continue;
          const dx = mB.x - mA.x;
          const dy = mB.y - mA.y;
          const dist = Math.hypot(dx, dy);
          if (dist === 0) continue;
          const collideAt = (mA.size + mB.size) * 0.30;
          if (dist >= collideAt) continue;
          const nx = dx / dist;
          const ny = dy / dist;
          // Relative velocity projected along the collision normal.
          const dvx = mA.vx - mB.vx;
          const dvy = mA.vy - mB.vy;
          const relVel = dvx * nx + dvy * ny;
          // Only respond if they're moving TOWARD each other — if
          // they happen to overlap while moving apart (e.g. just
          // after a separation push), skip the impulse so we don't
          // glue them back together.
          if (relVel > 0) {
            const invMassA = 1 / mA.mass;
            const invMassB = 1 / mB.mass;
            const impulse = (2 * relVel) / (invMassA + invMassB);
            mA.vx -= impulse * invMassA * nx;
            mA.vy -= impulse * invMassA * ny;
            mB.vx += impulse * invMassB * nx;
            mB.vy += impulse * invMassB * ny;
          }
          // Positional separation — split the overlap proportionally
          // to inverse mass so the lighter fish moves more. Stops
          // swimmers from sinking into each other and triggering the
          // same collision repeatedly across frames.
          const overlap = collideAt - dist;
          const invMassA2 = 1 / mA.mass;
          const invMassB2 = 1 / mB.mass;
          const totalInv = invMassA2 + invMassB2;
          const pushA = overlap * (invMassA2 / totalInv);
          const pushB = overlap * (invMassB2 / totalInv);
          mA.x -= nx * pushA;
          mA.y -= ny * pushA;
          mB.x += nx * pushB;
          mB.y += ny * pushB;
        }
      }

      // ── Pass 3 — write transforms imperatively ───────────────
      for (const [key, m] of motionRef.current) {
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
  //     update path. Drops expired swimmers, tops up to target.
  //     Also handles the FISHING phase-3 completion: when a fished
  //     swimmer has finished its rise (FISH_TOTAL_MS has elapsed),
  //     remove it from the swimmer list and clear the fishing ref
  //     so the next fishing event can fire. ──
  useEffect(() => {
    const interval = window.setInterval(() => {
      const now = performance.now();
      const el = containerRef.current;
      if (!el) return;
      const w = el.clientWidth, h = el.clientHeight;
      // Check if a fishing event has completed.
      const fishing = fishingRef.current;
      const fishingFinished = fishing && now - fishing.startedAt >= FISH_TOTAL_MS;
      if (fishingFinished && fishing) {
        motionRef.current.delete(fishing.key);
        fishingRef.current = null;
        setFishingKey(null);
      }
      setSwimmers((cur) => {
        const removedKey = fishingFinished ? fishing!.key : null;
        const alive = cur.filter((s) => {
          if (s.key === removedKey) return false;
          return now - s.born < s.lifespan;
        });
        // Remove motion entries for the departed.
        for (const s of cur) {
          if (s.key !== removedKey && now - s.born >= s.lifespan) {
            motionRef.current.delete(s.key);
          }
        }
        while (alive.length < targetPop) {
          const s = makeSwimmer(idCounterRef.current);
          alive.push(s);
          motionRef.current.set(s.key, makeMotion(w, h, s.size));
        }
        return alive;
      });
    }, 2000);
    return () => window.clearInterval(interval);
  }, [targetPop]);

  // ── Random fishing event ───────────────────────────────────────
  // Every 25-50 s, drop a fishing line and hook a random swimmer.
  // Only fires if there's no fishing event already in progress AND
  // there's at least one swimmer to fish. The animation itself is
  // driven from the RAF loop above; this effect just decides WHEN.
  // Disabled for users who prefer reduced motion — the surprise
  // pop-out animation is exactly the kind of thing that preference
  // is set to suppress.
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      if (mq.matches) return;
    }
    function scheduleNext() {
      const delay = FISH_INTERVAL_MIN_MS +
        Math.random() * (FISH_INTERVAL_MAX_MS - FISH_INTERVAL_MIN_MS);
      return window.setTimeout(() => {
        if (fishingRef.current) {
          // Already fishing — try again later.
          timeoutId = scheduleNext();
          return;
        }
        const liveSwimmers = swimmers;
        if (liveSwimmers.length === 0) {
          timeoutId = scheduleNext();
          return;
        }
        // Pick a random swimmer that has a motion entry (skip any
        // mid-deletion).
        const candidates = liveSwimmers.filter((s) => motionRef.current.has(s.key));
        if (candidates.length === 0) {
          timeoutId = scheduleNext();
          return;
        }
        const chosen = candidates[Math.floor(Math.random() * candidates.length)];
        const motion = motionRef.current.get(chosen.key);
        if (!motion) {
          timeoutId = scheduleNext();
          return;
        }
        fishingRef.current = {
          key: chosen.key,
          startedAt: performance.now(),
          anchorY: motion.y,
        };
        setFishingKey(chosen.key);
        timeoutId = scheduleNext();
      }, delay);
    }
    let timeoutId = scheduleNext();
    return () => window.clearTimeout(timeoutId);
  }, [swimmers]);

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
            mass: 0.5 + Math.random() * 1.5,
            size: s.size,
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

  // ── Deep-water void backdrop ──────────────────────────────────
  //     A soft cool bloom in the centre fading to near-black, so the
  //     tank reads as a luminous body of water suspended in darkness
  //     (the glowing-water-sphere look) rather than a flat lit panel.
  //     In screensaver mode the bloom's hue drifts slowly — a calm
  //     tide of light — without ever leaving the dark-blue mood.
  const bgGradient = useMemo(() => {
    const h = fullscreen ? 204 + Math.sin(bgPhase * Math.PI * 2) * 16 : 205; // 188..220
    return (
      `radial-gradient(ellipse 80% 90% at 50% 40%, ` +
      `hsl(${h} 58% 15%) 0%, hsl(${h} 60% 9%) 38%, #04101c 70%, #01050c 100%)`
    );
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

        {/* Volumetric glow of the water mass — behind everything. */}
        <div className="aquarium-glow pointer-events-none" aria-hidden />

        {/* The water sphere — faint luminous rim bounding the volume. */}
        <div className="aquarium-sphere pointer-events-none" aria-hidden />

        {/* Rippling surface line near the top of the sphere. */}
        <div className="aquarium-surface pointer-events-none" aria-hidden />

        {/* God-rays raking down from the surface — a few at varied
            x / width / speed so the volumetric light reads. */}
        <div className="aquarium-ray pointer-events-none" aria-hidden style={{ left: "30%", animation: "aquarium-ray-sway 19s ease-in-out infinite" }} />
        <div className="aquarium-ray pointer-events-none" aria-hidden style={{ left: "47%", width: "11%", animation: "aquarium-ray-sway 25s ease-in-out -6s infinite reverse" }} />
        <div className="aquarium-ray pointer-events-none" aria-hidden style={{ left: "63%", width: "6%", animation: "aquarium-ray-sway 22s ease-in-out -11s infinite" }} />

        {/* Caustic light rippling on the tank floor (foreground). */}
        <div className="aquarium-caustics pointer-events-none" aria-hidden />

        {/* Drifting dust motes — "marine snow" in the glow. */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          {AQUARIUM_MOTES.map((m, i) => (
            <span
              key={i}
              className="aquarium-mote"
              style={{
                left: `${m.leftPct}%`,
                top: `${m.topPct}%`,
                width: `${m.sizePx}px`,
                height: `${m.sizePx}px`,
                animationDuration: `${m.durationSec}s`,
                animationDelay: `${m.delaySec}s`,
                ["--mote-op" as string]: m.opacity,
              } as React.CSSProperties}
            />
          ))}
        </div>

        {/* Rising bubbles — each column on its own rise speed + delay. */}
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

        {/* Void vignette — darken the edges so the water glow floats in
            black, deepening the "suspended sphere" read. */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{ boxShadow: "inset 0 0 150px 40px rgba(0,0,0,0.62)" }}
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

        {/* Fishing line — visible only when fishingKey is set, i.e.
            a swimmer is currently being lifted out of the tank.
            Drawn imperatively in the RAF loop above (line height
            tracks the fished swimmer's y position). */}
        {fishingKey != null && (
          <FishingLine
            fishingKey={fishingKey}
            motionRef={motionRef}
            fishingRef={fishingRef}
          />
        )}
      </div>
    </>
  );
}

/** Fishing line + hook + tiny floating speech bubble. Refs back to
 *  the parent's motion map so the line tracks the fished swimmer
 *  frame-perfectly without re-rendering React each frame. Uses its
 *  own RAF loop to read motion + paint imperatively. */
function FishingLine({
  fishingKey,
  motionRef,
  fishingRef,
}: {
  fishingKey: number;
  motionRef: React.MutableRefObject<Map<number, Motion>>;
  fishingRef: React.MutableRefObject<{ key: number; startedAt: number; anchorY: number } | null>;
}) {
  const lineRef = useRef<HTMLDivElement | null>(null);
  const hookRef = useRef<HTMLDivElement | null>(null);
  const bubbleRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let raf = 0;
    function paint() {
      const m = motionRef.current.get(fishingKey);
      const fishing = fishingRef.current;
      if (m && fishing) {
        const t = performance.now() - fishing.startedAt;
        // During DROP phase, the line descends from -8 px (above
        // the tank top) down to the swimmer's current y. We map
        // local-t (0..1) to the y position with an ease-in so the
        // line slows as it nears the fish.
        let lineEndY = m.y;
        if (t < FISH_DROP_MS) {
          const localT = t / FISH_DROP_MS;
          const eased = localT * localT * (3 - 2 * localT); // smoothstep
          lineEndY = -8 + (m.y + 8) * eased;
        }
        // The line is a thin vertical bar from top to lineEndY.
        if (lineRef.current) {
          lineRef.current.style.height = `${Math.max(0, lineEndY)}px`;
          lineRef.current.style.transform = `translate3d(${m.x}px, 0, 0)`;
        }
        // Hook sits at the bottom of the line, just above the fish.
        if (hookRef.current) {
          hookRef.current.style.transform = `translate3d(${m.x}px, ${lineEndY}px, 0)`;
        }
        // Speech bubble appears during the wiggle phase only.
        const showBubble = t > FISH_DROP_MS && t < FISH_DROP_MS + FISH_WIGGLE_MS;
        if (bubbleRef.current) {
          bubbleRef.current.style.opacity = showBubble ? "1" : "0";
          bubbleRef.current.style.transform = `translate3d(${m.x + 22}px, ${lineEndY - 12}px, 0)`;
        }
      }
      raf = requestAnimationFrame(paint);
    }
    raf = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(raf);
  }, [fishingKey, motionRef, fishingRef]);

  return (
    <>
      {/* Vertical line, descending from top of tank */}
      <div
        ref={lineRef}
        aria-hidden
        className="absolute top-0 left-0 pointer-events-none"
        style={{
          width: 1.5,
          background: "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.55) 30%, rgba(255,255,255,0.65) 100%)",
          marginLeft: -0.75,
          willChange: "transform, height",
        }}
      />
      {/* Hook glyph at the bottom of the line */}
      <div
        ref={hookRef}
        aria-hidden
        className="absolute top-0 left-0 pointer-events-none"
        style={{
          width: 10,
          height: 14,
          marginLeft: -5,
          willChange: "transform",
        }}
      >
        <svg viewBox="0 0 10 14" width="10" height="14" fill="none" stroke="white" strokeWidth="1.4" strokeLinecap="round" aria-hidden>
          <path d="M 5 0 L 5 7 q 0 5 -3 5 q -3 0 -3 -3" />
        </svg>
      </div>
      {/* Speech bubble during wiggle phase — "!?" reaction */}
      <div
        ref={bubbleRef}
        aria-hidden
        className="absolute top-0 left-0 pointer-events-none transition-opacity duration-200"
        style={{
          opacity: 0,
          willChange: "transform, opacity",
        }}
      >
        <span className="inline-block px-1.5 py-0.5 rounded-md bg-white/90 text-[11px] font-bold text-slate-900 shadow">
          !?
        </span>
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
