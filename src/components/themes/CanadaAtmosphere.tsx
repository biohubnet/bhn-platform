"use client";
/**
 * O Canada atmosphere layer — turns the Canada Day theme from a static
 * red-on-white palette into a drifting maple-leaf scene.
 *
 * What it adds when `theme === "canada"`:
 *
 *   • Falling maple leaves — the Canadian maple leaf silhouette in a
 *     range of maple reds, each drifting with its own duration, delay,
 *     sway amplitude, start angle, and scale. A touch heavier than
 *     Sakura's petals — leaves tumble fully rather than float.
 *
 *   • Leaf-drift mist — a blurred red wash at the bottom of the
 *     viewport that reads as leaves gathering on the ground.
 *
 *   • Scene caption (bottom-right) — short Canada Day / anthem
 *     observations that cycle every 18 s. Same fade-in timing as the
 *     Sakura and Greenwood captions.
 *
 * No time-of-day logic (O Canada is a light summer theme). Follows the
 * exact same mounting pattern as SakuraAtmosphere: fixed-position,
 * pointer-events-none, aria-hidden, and returns null under
 * prefers-reduced-motion (the palette stays, but nothing moves).
 *
 * Mounted once inside <Providers> in app/providers.tsx alongside the
 * other atmospheres — every component bails early for every theme
 * except its own, so there's no cost while inactive.
 */
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "@/components/ui/ThemeProvider";

interface FallingLeaf {
  id: number;
  leftPct: number;
  delaySec: number;
  durationSec: number;
  startRotation: number;
  swayPx: number;
  scale: number;
  hue: string;
  opacity: number;
}

/** The Canadian maple leaf silhouette (Font Awesome canadian-maple-leaf,
 *  512×512 viewbox). One shape, varied by hue / scale / rotation. */
const MAPLE_PATH =
  "M383.8 351.7c2.5-2.5 105.2-92.4 105.2-92.4l-17.5-7.5c-10-4.9-7.4-11.5-5-17.4 2.4-6 20-49.9 20-49.9s-38.6 8.2-45.3 9.6c-5.8 1.2-9.8-2.5-11.2-6.9L416 170l-31.8 35c-5.4 6.5-16.3 4.9-16.3-5.6l14.9-83.9-24.8 14.4c-5.2 3-11.6 1.2-14.6-3.9l-32.6-63.5-32.6 63.4c-3 5.2-9.4 6.9-14.6 3.9l-24.8-14.4L228.9 199c0 10.4-11 12.2-16.3 5.6L180.7 170l-14 17.5c-1.4 4.4-5.5 8.2-11.2 6.9-6.7-1.4-45.3-9.6-45.3-9.6s17.6 43.9 20 49.9c2.4 6 4.9 12.5-5 17.4L102.6 259s102.7 89.8 105.2 92.4c5.5 5.8 4 8.7 2.6 17.1L205 391.9s48.5-10.3 60.4-12.9c10.3-2.2 15.4 3 15.4 3l-4 60.7c0 8 4.2 10.9 8.9 5.5L286 407l31.8 37.4c4.7 5.4 8.9 2.5 8.9-5.5l-4-60.7s5.1-5.2 15.4-3c11.9 2.6 60.4 12.9 60.4 12.9l-5.4-23.4c-1.4-8.4-2.9-11.3 2.6-17z";

const LEAF_COUNT = 10;

/** Canada Day / anthem scene captions. One cycles every 18 s. Kept
 *  short — a phrase, not a sentence — so they read as ambient flavour. */
const SCENE_CAPTIONS = [
  "the true north, strong and free",
  "a maple leaf lets go",
  "red and white, from sea to sea",
  "glorious and free",
  "a leaf drifts down, quietly proud",
  "the flag stirs in the July air",
  "north of summer",
  "O Canada",
];

export function CanadaAtmosphere() {
  const { theme } = useTheme();
  const isActive = theme === "canada";

  const [reducedMotion, setReducedMotion] = useState(false);
  const [captionIdx, setCaptionIdx] = useState(0);
  /** captionEpoch flips on every rotation so the CSS fade-in keyframe
   *  restarts — same trick as SakuraAtmosphere. */
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

  // Caption rotation — every 18 s pick a new caption, never the same
  // one twice in a row.
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

  // Pre-randomise leaf properties at mount. Stable so React doesn't
  // re-key and the browser keeps composited layers across renders.
  const leaves = useMemo<FallingLeaf[]>(() => {
    // Maple-red palette — bright maple → deep crimson, all drawn from
    // the [data-theme="canada"] brand ramp so they read on the near-
    // white page.
    const hues = [
      "#dc1f2d", // Canada red
      "#c00f1c", // deep maple
      "#ef3340", // bright flag red
      "#9c0c16", // crimson
      "#e6535f", // warm maple
      "#b3121e", // wine-red
      "#d81f2a", // maple
      "#780a11", // dark crimson
    ];
    return Array.from({ length: LEAF_COUNT }, (_, i) => ({
      id: i,
      leftPct: Math.random() * 100,
      delaySec: Math.random() * 28,
      durationSec: 20 + Math.random() * 14,
      startRotation: Math.random() * 360,
      swayPx: 60 + Math.random() * 110,
      scale: 0.5 + Math.random() * 0.75,
      hue: hues[Math.floor(Math.random() * hues.length)],
      opacity: 0.6 + Math.random() * 0.3,
    }));
  }, []);

  if (!isActive) return null;

  // Reduced-motion users still get the O Canada palette but no
  // animation — the theme is fully functional, just static.
  if (reducedMotion) return null;

  return (
    <div
      aria-hidden
      className="canada-atmosphere pointer-events-none fixed inset-0 z-[1] overflow-hidden"
    >
      {/* Leaf-drift mist — soft red wash at the bottom of the viewport. */}
      <div className="canada-mist" />

      {/* Falling maple leaves */}
      <div className="canada-leaves">
        {leaves.map((leaf) => (
          <span
            key={leaf.id}
            className="canada-leaf"
            style={
              {
                left: `${leaf.leftPct}%`,
                animationDelay: `${leaf.delaySec}s`,
                animationDuration: `${leaf.durationSec}s`,
                ["--leaf-sway"]: `${leaf.swayPx}px`,
                ["--leaf-start-rot"]: `${leaf.startRotation}deg`,
                ["--leaf-scale"]: leaf.scale,
                color: leaf.hue,
                opacity: leaf.opacity,
              } as React.CSSProperties
            }
          >
            <svg viewBox="0 0 512 512" width="22" height="22" fill="currentColor">
              <path d={MAPLE_PATH} />
            </svg>
          </span>
        ))}
      </div>

      {/* Scene caption — bottom-right, rotates every 18 s. Each new
          caption gets a fresh React key so the fade-in keyframe
          restarts cleanly. */}
      <div className="canada-caption">
        <span aria-hidden className="canada-caption-marker" />
        <span key={captionEpoch} className="canada-caption-text">
          {SCENE_CAPTIONS[captionIdx % SCENE_CAPTIONS.length]}
        </span>
      </div>
    </div>
  );
}
