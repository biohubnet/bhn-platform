"use client";
/**
 * IceCreamAtmosphere — turns the Summer Ice Cream theme into a
 * playful "things falling from the freezer" scene. Mirrors the
 * Greenwood and Sakura atmosphere components: pre-randomised
 * per-falling-object properties at mount, a single shared keyframe
 * driven by CSS custom properties for per-instance variation, and
 * a fixed-position pointer-events-none aria-hidden overlay so
 * nothing interferes with interaction.
 *
 * What falls:
 *   • Ice-cream cones — three flavour mixes (strawberry pink,
 *     mint green, vanilla cream)
 *   • Popsicles — three colours (lemon yellow, raspberry, blueberry)
 *   • Snowflakes — six-armed crystal, light blue
 *   • Ice cubes — translucent cyan with a soft highlight
 *
 * Sway amplitude, scale, rotation, opacity, and drift duration are
 * randomised per element so the loop never reads as mechanical.
 *
 * Respects prefers-reduced-motion (returns null entirely). Only
 * mounts when `theme === "icecream"`; bails fast for every other
 * theme so it costs nothing while inactive.
 */
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "@/components/ui/ThemeProvider";

type Shape = "cone-strawberry" | "cone-mint" | "cone-vanilla" | "popsicle-lemon" | "popsicle-raspberry" | "popsicle-blueberry" | "snowflake" | "icecube";

interface Falling {
  id: number;
  leftPct: number;
  delaySec: number;
  durationSec: number;
  startRotation: number;
  swayPx: number;
  scale: number;
  shape: Shape;
  opacity: number;
}

/** Roughly equal mix of cones / popsicles / snowflakes / ice cubes,
 *  with a slight bias toward snowflakes + cubes since they're more
 *  visually quiet and read as "cold" rather than "treat". */
const SHAPE_POOL: Shape[] = [
  "cone-strawberry", "cone-mint", "cone-vanilla",
  "popsicle-lemon", "popsicle-raspberry", "popsicle-blueberry",
  "snowflake", "snowflake", "snowflake",
  "icecube", "icecube",
];

/** Total falling-element count. 12 is sparse enough to feel like
 *  a breeze, not a deluge — the elements are visually rich so even
 *  one is noticeable. */
const FALLING_COUNT = 12;

export function IceCreamAtmosphere() {
  const { theme } = useTheme();
  const isActive = theme === "icecream";

  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Pre-randomise once at mount. Stable for the lifetime of the
  // component so React keys don't churn and the browser keeps the
  // same composited layers across renders.
  const items = useMemo<Falling[]>(() => {
    return Array.from({ length: FALLING_COUNT }, (_, i) => {
      const shape = SHAPE_POOL[Math.floor(Math.random() * SHAPE_POOL.length)];
      // Snowflakes drift slower and rotate less (ice crystals don't
      // tumble); cones / popsicles tumble more dramatically; ice
      // cubes are heavier so they fall a bit faster.
      const isFrosty = shape === "snowflake" || shape === "icecube";
      return {
        id: i,
        leftPct: Math.random() * 100,
        delaySec: Math.random() * 22,
        durationSec: isFrosty
          ? 22 + Math.random() * 16    // 22-38 s for snowflakes / cubes
          : 16 + Math.random() * 12,   // 16-28 s for cones / popsicles
        startRotation: Math.random() * 360,
        swayPx: isFrosty
          ? 40 + Math.random() * 70    // gentle drift for ice
          : 70 + Math.random() * 90,   // wilder tumble for treats
        scale: shape === "snowflake"
          ? 0.45 + Math.random() * 0.55
          : 0.55 + Math.random() * 0.65,
        shape,
        opacity: shape === "snowflake"
          ? 0.55 + Math.random() * 0.30
          : 0.70 + Math.random() * 0.25,
      };
    });
  }, []);

  if (!isActive) return null;
  if (reducedMotion) return null;

  return (
    <div
      aria-hidden
      className="icecream-atmosphere pointer-events-none fixed inset-0 z-[1] overflow-hidden"
    >
      {items.map((it) => (
        <span
          key={it.id}
          className={`icecream-fall icecream-fall-${it.shape}`}
          style={{
            left: `${it.leftPct}%`,
            animationDelay: `${it.delaySec}s`,
            animationDuration: `${it.durationSec}s`,
            ["--ic-sway" as string]: `${it.swayPx}px`,
            ["--ic-start-rot" as string]: `${it.startRotation}deg`,
            ["--ic-scale" as string]: it.scale,
            opacity: it.opacity,
          } as React.CSSProperties}
        >
          <FallingShape shape={it.shape} />
        </span>
      ))}
    </div>
  );
}

function FallingShape({ shape }: { shape: Shape }) {
  switch (shape) {
    case "cone-strawberry":
      return <IceCreamConeSvg scoopFill="#f9b8c8" scoopHighlight="#fff0f5" coneFill="#c98a4f" />;
    case "cone-mint":
      return <IceCreamConeSvg scoopFill="#bce4d4" scoopHighlight="#f0fff8" coneFill="#c98a4f" />;
    case "cone-vanilla":
      return <IceCreamConeSvg scoopFill="#fff3d6" scoopHighlight="#fffbf0" coneFill="#c98a4f" />;
    case "popsicle-lemon":
      return <PopsicleSvg fill="#fde68a" highlight="#fff3c4" />;
    case "popsicle-raspberry":
      return <PopsicleSvg fill="#f9a8d4" highlight="#fce7f3" />;
    case "popsicle-blueberry":
      return <PopsicleSvg fill="#a7c7f9" highlight="#dce8fb" />;
    case "snowflake":
      return <SnowflakeSvg />;
    case "icecube":
      return <IceCubeSvg />;
  }
}

/** Ice-cream cone — single scoop, simple silhouette so it reads
 *  cleanly at 20-30 px and rotates well. */
function IceCreamConeSvg({
  scoopFill, scoopHighlight, coneFill,
}: { scoopFill: string; scoopHighlight: string; coneFill: string }) {
  return (
    <svg viewBox="0 0 28 32" width="26" height="30" aria-hidden>
      {/* Cone — wafer triangle with waffle cross-hatch hint */}
      <path d="M7 15 L21 15 L14 31 Z" fill={coneFill} stroke="#7a5230" strokeWidth="0.7" />
      <path d="M9 18 L19 18 M10 21 L18 21 M11 24 L17 24 M12 27 L16 27" stroke="#7a5230" strokeWidth="0.4" opacity="0.5" />
      <path d="M10 17 L18 25 M14 17 L18 21 M9 24 L13 28" stroke="#7a5230" strokeWidth="0.4" opacity="0.3" />
      {/* Scoop — rounded blob on top */}
      <ellipse cx="14" cy="12" rx="8" ry="6.5" fill={scoopFill} stroke="#a06070" strokeWidth="0.6" />
      {/* Scoop highlight */}
      <ellipse cx="11.5" cy="9.5" rx="2.8" ry="1.6" fill={scoopHighlight} opacity="0.75" />
      {/* Scoop seam at the cone — small drip lip */}
      <path d="M7.5 14 Q14 17 20.5 14" stroke="#a06070" strokeWidth="0.55" fill="none" opacity="0.6" />
    </svg>
  );
}

/** Popsicle — rectangular treat on a wooden stick. */
function PopsicleSvg({ fill, highlight }: { fill: string; highlight: string }) {
  return (
    <svg viewBox="0 0 18 32" width="18" height="32" aria-hidden>
      {/* Popsicle body */}
      <rect x="3" y="2" width="12" height="22" rx="3" fill={fill} stroke="#b66a8a" strokeWidth="0.55" />
      {/* Highlight */}
      <rect x="5" y="4" width="2.5" height="10" rx="1.2" fill={highlight} opacity="0.75" />
      {/* Stick */}
      <rect x="7.5" y="24" width="3" height="7" rx="1.2" fill="#d4a86a" stroke="#9a7340" strokeWidth="0.45" />
    </svg>
  );
}

/** Snowflake — six-armed crystal with branchlets. Pale blue with
 *  a hint of glow. */
function SnowflakeSvg() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <g stroke="#bee0ff" strokeWidth="1.1" strokeLinecap="round" fill="none" opacity="0.9">
        {/* 6 main arms */}
        <line x1="12" y1="2" x2="12" y2="22" />
        <line x1="3.34" y1="7" x2="20.66" y2="17" />
        <line x1="3.34" y1="17" x2="20.66" y2="7" />
        {/* Tip branchlets — top */}
        <line x1="12" y1="5" x2="10" y2="3" />
        <line x1="12" y1="5" x2="14" y2="3" />
        <line x1="12" y1="19" x2="10" y2="21" />
        <line x1="12" y1="19" x2="14" y2="21" />
        {/* Branchlets on the diagonals */}
        <line x1="6" y1="8.5" x2="4" y2="8" />
        <line x1="6" y1="8.5" x2="5.5" y2="6.5" />
        <line x1="18" y1="15.5" x2="20" y2="16" />
        <line x1="18" y1="15.5" x2="18.5" y2="17.5" />
        <line x1="6" y1="15.5" x2="4" y2="16" />
        <line x1="6" y1="15.5" x2="5.5" y2="17.5" />
        <line x1="18" y1="8.5" x2="20" y2="8" />
        <line x1="18" y1="8.5" x2="18.5" y2="6.5" />
      </g>
      {/* Centre dot */}
      <circle cx="12" cy="12" r="1.4" fill="#bee0ff" opacity="0.85" />
    </svg>
  );
}

/** Ice cube — translucent cyan rectangle with a soft inner
 *  highlight for the icy gleam. */
function IceCubeSvg() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <rect
        x="3" y="3" width="18" height="18" rx="3"
        fill="#cfeefe" fillOpacity="0.55"
        stroke="#7dc5e6" strokeWidth="0.8"
      />
      {/* Top-left highlight */}
      <path d="M5 8 L5 16" stroke="#ffffff" strokeWidth="1.1" strokeLinecap="round" opacity="0.85" />
      <path d="M5 6.5 L9 6.5" stroke="#ffffff" strokeWidth="1.1" strokeLinecap="round" opacity="0.85" />
      {/* Subtle inner facet line */}
      <path d="M14 8 L18 12" stroke="#7dc5e6" strokeWidth="0.45" opacity="0.7" />
    </svg>
  );
}
