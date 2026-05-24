"use client";
/**
 * Sakura atmosphere layer — turns the Sakura theme from a static
 * blush palette into a drifting cherry-blossom scene.
 *
 * What it adds when `theme === "sakura"`:
 *
 *   • Falling cherry-blossom petals — three petal silhouettes
 *     (single / open / elongated) in a range of blush pinks, each
 *     drifting with its own duration, delay, sway amplitude, and
 *     start angle. Deliberately lighter/floatier than Greenwood's
 *     leaves — sakura petals barely weigh anything.
 *
 *   • Petal-drift mist — a blurred rose-pink wash at the bottom of
 *     the viewport that reads as accumulated petals. Mirrors the
 *     Greenwood mist in structure; tinted to match the palette.
 *
 *   • Scene caption (bottom-right) — short spring / hanami
 *     observations that cycle every 18 s, inspired by the Japanese
 *     tradition of flower-viewing (花見, hanami). Same fade-in
 *     timing as Greenwood's forest captions.
 *
 * No time-of-day logic (Sakura is a light spring theme). Follows
 * the exact same mounting pattern as GreenwoodAtmosphere:
 * fixed-position, pointer-events-none, aria-hidden, and returns
 * null under prefers-reduced-motion (the colour palette remains,
 * but nothing moves).
 *
 * Mounted once inside <Providers> in app/providers.tsx alongside
 * <GreenwoodAtmosphere /> — both components bail early for every
 * theme except their own, so there's no cost while the other is
 * active.
 */
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "@/components/ui/ThemeProvider";

type PetalShape = "single" | "open" | "elongated";

interface FallingPetal {
  id: number;
  leftPct: number;
  delaySec: number;
  durationSec: number;
  startRotation: number;
  swayPx: number;
  scale: number;
  shape: PetalShape;
  hue: string;
  opacity: number;
}

/** SVG paths for each petal silhouette. 24×24 viewbox. Kept simple
 *  so the petals read at small sizes — sakura petals have a
 *  characteristic slight heart-shaped notch at the rounded tip and
 *  taper to a narrow base. */
const PETAL_PATHS: Record<PetalShape, string> = {
  // Single petal — elliptical, slight heart notch at top, tapers at base.
  single:
    "M12 22 C7 21 4 15 5 9 C6 4 9 0 11 2 C11 1 12 0 13 2 " +
    "C15 0 18 4 19 9 C20 15 17 21 12 22 Z",
  // Open petal — slightly wider and more rounded, reads as a
  // petal that's fully spread open in bloom.
  open:
    "M12 21 C6 20 3 15 4 9 C5 4 8 1 11 2 C11 1 12 0 13 2 " +
    "C16 1 19 4 20 9 C21 15 18 20 12 21 Z",
  // Elongated petal — narrower and tapered at both ends; the kind
  // of petal you see in a tight bud that hasn't fully opened yet.
  elongated:
    "M12 23 C10 22 8 18 8 13 C8 7 10 2 12 1 " +
    "C14 2 16 7 16 13 C16 18 14 22 12 23 Z",
};

const PETAL_COUNT = 10;

/** Cherry blossom / hanami scene captions. One cycles every 18 s.
 *  Kept short — a phrase, not a sentence — so they read as ambient
 *  flavour, not as informational text. */
const SCENE_CAPTIONS = [
  "petals drift like pink snow",
  "a blossom lets go of the branch",
  "the wind turns pink for a moment",
  "花見 — watching the blossoms fall",
  "each petal a small farewell",
  "spring says goodbye one petal at a time",
  "the air carries faint blossom",
  "what beauty there is in letting go",
];

export function SakuraAtmosphere() {
  const { theme } = useTheme();
  const isActive = theme === "sakura";

  const [reducedMotion, setReducedMotion] = useState(false);
  const [captionIdx, setCaptionIdx] = useState(0);
  /** captionEpoch flips on every rotation so the CSS fade-in
   *  keyframe restarts — same trick as GreenwoodAtmosphere. */
  const [captionEpoch, setCaptionEpoch] = useState(0);

  // Detect reduced motion. Hydration-safe: defaults false on SSR,
  // flips after mount if the user has the preference set.
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Caption rotation — every 18 s pick a new caption, never the
  // same one twice in a row.
  useEffect(() => {
    if (!isActive || reducedMotion) return;
    const id = setInterval(() => {
      setCaptionIdx((prev) => {
        if (SCENE_CAPTIONS.length <= 1) return 0;
        let next = Math.floor(Math.random() * SCENE_CAPTIONS.length);
        let guard = 0;
        while (next === prev && guard++ < 5) {
          next = Math.floor(Math.random() * SCENE_CAPTIONS.length);
        }
        return next;
      });
      setCaptionEpoch((e) => e + 1);
    }, 18_000);
    return () => clearInterval(id);
  }, [isActive, reducedMotion]);

  // Pre-randomise petal properties at mount. Stable so React doesn't
  // re-key and the browser keeps composited layers across renders.
  const petals = useMemo<FallingPetal[]>(() => {
    const shapes: PetalShape[] = ["single", "open", "elongated"];
    // Sakura palette — pale blush → medium rose, with a few near-
    // white petals to suggest freshly fallen snow. All from the
    // [data-theme="sakura"] colour system.
    const hues = [
      "#f5c2ce", // light blush
      "#f0a0b4", // medium pink
      "#e880a0", // warm rose
      "#fce0e6", // near-white blush
      "#e8a0b8", // dusty rose
      "#f8d8e2", // pale blush
      "#d88098", // deeper rose
      "#fceaee", // barely-there pink
    ];
    return Array.from({ length: PETAL_COUNT }, (_, i) => ({
      id: i,
      leftPct: Math.random() * 100,
      delaySec: Math.random() * 28,
      // Petals are lighter than leaves — longer, floatier duration.
      durationSec: 22 + Math.random() * 16,
      startRotation: Math.random() * 360,
      // Sakura petals drift more in the wind than heavier leaves.
      swayPx: 70 + Math.random() * 130,
      scale: 0.50 + Math.random() * 0.80,
      shape: shapes[i % shapes.length],
      hue: hues[Math.floor(Math.random() * hues.length)],
      opacity: 0.55 + Math.random() * 0.35,
    }));
  }, []);

  if (!isActive) return null;

  // Reduced-motion users still get the Sakura colour palette but
  // no animation — the theme is fully functional, just static.
  if (reducedMotion) return null;

  return (
    <div
      aria-hidden
      className="sakura-atmosphere pointer-events-none fixed inset-0 z-[1] overflow-hidden"
    >
      {/* Petal-drift mist — soft rose-pink wash at the bottom
          of the viewport, reads as accumulated fallen petals. */}
      <div className="sakura-mist" />

      {/* Falling petals */}
      <div className="sakura-petals">
        {petals.map((petal) => (
          <span
            key={petal.id}
            className={`sakura-petal sakura-petal-${petal.shape}`}
            style={
              {
                left: `${petal.leftPct}%`,
                animationDelay: `${petal.delaySec}s`,
                animationDuration: `${petal.durationSec}s`,
                ["--petal-sway"]: `${petal.swayPx}px`,
                ["--petal-start-rot"]: `${petal.startRotation}deg`,
                ["--petal-scale"]: petal.scale,
                color: petal.hue,
                opacity: petal.opacity,
              } as React.CSSProperties
            }
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d={PETAL_PATHS[petal.shape]} />
            </svg>
          </span>
        ))}
      </div>

      {/* Scene caption — bottom-right, rotates every 18 s.
          Each new caption gets a fresh React key so the CSS
          fade-in keyframe restarts cleanly. */}
      <div className="sakura-caption">
        <span aria-hidden className="sakura-caption-marker" />
        <span key={captionEpoch} className="sakura-caption-text">
          {SCENE_CAPTIONS[captionIdx % SCENE_CAPTIONS.length]}
        </span>
      </div>
    </div>
  );
}
