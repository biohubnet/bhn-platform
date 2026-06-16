"use client";
/**
 * Greenwood atmosphere layer — turns the Greenwood theme from a
 * static green palette into a lived-in forest scene.
 *
 * What it adds when `theme === "greenwood"`:
 *
 *   • Time-of-day detection — recomputes every 5 min and writes
 *     `data-greenwood-time="dawn|day|dusk|night"` onto <html>.
 *     globals.css uses that attribute to retint the canvas + hero
 *     gradient + colour temperature for each time slot, so opening
 *     the platform at 6 am feels different from 9 pm.
 *
 *   • Falling leaves — a small flock of SVG oak / maple / elm /
 *     birch leaves that drift across the viewport on randomised
 *     paths. Each leaf has its own duration, delay, sway amplitude,
 *     and rotation rhythm so the loop never looks mechanical.
 *
 *   • Mist overlay — soft white-green wash that drifts very slowly
 *     across the bottom of the viewport. Reads as ground fog.
 *
 *   • Dappled sunlight (day only) — four blurred bright patches
 *     that pulse and shift, mimicking sunlight broken up by an
 *     overhead canopy.
 *
 *   • Fireflies (night only) — eight small warm-yellow dots that
 *     blink out of phase. Two of them also drift on slow paths so
 *     the layer isn't pure twinkle.
 *
 *   • A scene caption (bottom-right) that rotates through forest
 *     observations matched to the current time of day — "a cardinal
 *     calls from the cedar", "fireflies hover near the brook",
 *     etc. Three-second fade transitions between captions.
 *
 * Everything is fixed-position, pointer-events-none, aria-hidden,
 * and respects prefers-reduced-motion (collapses to a single static
 * mist wash + the time-of-day tint, no animation).
 *
 * Mounted once inside <Providers> in app/providers.tsx — it gets
 * `useTheme()` context but doesn't need to wrap children.
 */
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "@/components/ui/ThemeProvider";

type TimeOfDay = "dawn" | "day" | "dusk" | "night";
type LeafShape = "oak" | "maple" | "elm" | "birch" | "eucalyptus" | "eucalyptusRound";

/** Map clock hour → time-of-day bucket. Tuned for a temperate
 *  Toronto-ish climate; not seasonal-aware (would over-complicate
 *  for a theme decoration).
 *
 *  `prefersDark` short-circuits the clock entirely. When the OS is
 *  in dark mode the whole scene snaps to "night" regardless of the
 *  hour — moonlit canvas, cool mist, fireflies — because the user
 *  asked for Greenwood to auto-adjust to dark mode and have
 *  fireflies flying around. The hour-of-day mapping only kicks in
 *  when the OS prefers light. */
function computeTimeOfDay(now: Date = new Date(), prefersDark = false): TimeOfDay {
  if (prefersDark) return "night";
  const h = now.getHours();
  if (h >= 5 && h < 8) return "dawn";
  if (h >= 8 && h < 17) return "day";
  if (h >= 17 && h < 20) return "dusk";
  return "night";
}

interface FallingLeaf {
  id: number;
  leftPct: number;
  delaySec: number;
  durationSec: number;
  startRotation: number;
  swayPx: number;
  scale: number;
  shape: LeafShape;
  hue: string;
  opacity: number;
}

interface Firefly {
  id: number;
  leftPct: number;
  topPct: number;
  blinkDelaySec: number;
  /** Some fireflies also drift — driven by the same `firefly-drift`
   *  keyframe with random duration so they don't all move in sync. */
  driftSec?: number;
}

/** SVG paths for each leaf silhouette. 24×24 viewbox. Kept simple
 *  so the leaves read at small sizes — too much detail just looks
 *  like a smudge once you scale down to 16-22 px. */
const LEAF_PATHS: Record<LeafShape, string> = {
  // Oak — wavy rounded lobes down each side, narrowing toward the base
  oak: "M12 22 C10 21 10 20 8 19.5 C5 19 6 16 8.5 15.5 C5.5 15 6 12 8.5 11.5 C6 11 6.5 8 9 7.5 C10 5 10.5 3 12 2 C13.5 3 14 5 15 7.5 C17.5 8 18 11 15.5 11.5 C18 12 18.5 15 15.5 15.5 C18 16 19 19 16 19.5 C14 20 14 21 12 22 Z",
  // Maple — single central lobe + four side lobes, sharp tips, rounded sinuses
  maple: "M12 18 C11 16.5 11 15.5 10.5 14.5 C9 14 6 14.5 4 12 C7 11 8.5 10.5 8.5 9.5 C8 8 6.5 6 5.5 5 C7.5 5.8 9 6.3 9.5 6.5 C10.3 5 11 3 12 1.5 C13 3 13.7 5 14.5 6.5 C15 6.3 16.5 5.8 18.5 5 C17.5 6 16 8 15.5 9.5 C15.5 10.5 17 11 20 12 C18 14.5 15 14 13.5 14.5 C13 15.5 13 16.5 12 18 Z",
  // Elm — narrow, simple ellipse with an oblique base
  elm: "M12 23 L12 19 M12 19 C8 18 6 14 8 8 C10 4 12 1 12 1 C12 1 14 4 16 8 C18 14 16 18 12 19 Z",
  // Birch — toothed ovate, rounded base tapering to a sharp tip
  birch: "M12 21 C9 20 6.5 18 6.5 14 L8 13 L7 11 L8.5 9.5 L8 7 C9 5 10.5 3 12 2 C13.5 3 15 5 16 7 L15.5 9.5 L17 11 L16 13 L17.5 14 C17.5 18 15 20 12 21 Z",
  // Eucalyptus — long, slender, slightly sickle-curved lanceolate blade
  eucalyptus: "M12 23 L12 19 M12 19 C8 15 9 8 12 3 C12 3 12 2 13 2 C15 6 16 14 12 19 Z",
  // Eucalyptus (silver dollar) — round blade with the apical notch (dimple) at its tip
  eucalyptusRound: "M12 22 L12 18.5 C6.5 18 3.5 14.5 4 10.5 C4.4 6.8 7.2 4.4 10.3 4.3 C11.4 4.6 12 5.4 12 6.6 C12 5.4 12.6 4.6 13.7 4.3 C16.8 4.4 19.6 6.8 20 10.5 C20.5 14.5 17.5 18 12 18.5 Z",
};

/** Rotation pool for leaves — pre-randomised at mount; same set
 *  cycles forever so React can re-key cleanly. Bigger pool = more
 *  visual variety. 7 leaves is sparse enough to feel like wind, not
 *  a leaf storm. */
const LEAF_COUNT = 7;
const FIREFLY_COUNT = 9;

/** Scene captions matched to time-of-day. Cycled randomly within
 *  the active bucket so the same evening session shows several
 *  different observations. Kept short — one short phrase, no
 *  punctuation — so the caption reads as ambient flavour. */
const SCENE_CAPTIONS: Record<TimeOfDay, string[]> = {
  dawn: [
    "first light filters through the canopy",
    "mist clings low to the ferns",
    "a chickadee calls twice and goes quiet",
    "dew beads along a spider's silk",
    "a doe steps out of the alders",
    "the brook runs cold and clear",
  ],
  day: [
    "sunlight pools on the mossy floor",
    "a cardinal calls from the cedar",
    "wind moves slowly through the pines",
    "a chipmunk darts across the path",
    "warblers turn in the high branches",
    "a butterfly settles on a stone",
    "wood thrushes trade phrases at midday",
  ],
  dusk: [
    "golden light catches the upper leaves",
    "an owl tunes up beyond the ridge",
    "shadows lean long across the moss",
    "the brook turns from silver to copper",
    "a beaver works the far bank",
    "swallows stitch the clearing",
  ],
  night: [
    "fireflies drift between the trunks",
    "a great horned owl calls once",
    "the moon catches a turn in the stream",
    "frogs trade notes by the marsh",
    "the forest exhales and settles",
    "a fox crosses the path silently",
    "starlight pools where the canopy breaks",
  ],
};

export function GreenwoodAtmosphere() {
  const { theme } = useTheme();
  const isActive = theme === "greenwood";

  // Initialise to "day" rather than computing immediately so SSR
  // and client-render agree on the first render. The client effect
  // below overwrites with the real local clock right after mount.
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>("day");
  const [reducedMotion, setReducedMotion] = useState(false);
  /** Tracks `prefers-color-scheme: dark`. When true, the scene
   *  forces itself to night (moonlit canvas + fireflies) regardless
   *  of the local hour. Hydration-safe: false on SSR, flips after
   *  mount if the OS is in dark mode. */
  const [prefersDark, setPrefersDark] = useState(false);
  const [captionIdx, setCaptionIdx] = useState(0);
  /** captionEpoch flips on every rotation; used as the React key on
   *  the caption span so the CSS fade-in keyframe restarts. */
  const [captionEpoch, setCaptionEpoch] = useState(0);

  // Detect reduced motion. Hydration-safe: defaults to false on SSR,
  // flips after mount if the user has the preference set.
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Detect prefers-color-scheme: dark. When the OS is in dark mode,
  // Greenwood snaps to the night palette + fireflies regardless of
  // the local hour. Listens for live changes so flipping the OS
  // theme retints the canvas immediately.
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setPrefersDark(mq.matches);
    const onChange = () => setPrefersDark(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Recompute time-of-day every 5 minutes so users who keep a tab
  // open for hours see the canvas slowly shift through the day. Also
  // re-runs whenever `prefersDark` flips so toggling OS dark mode
  // snaps the scene to night (or back to clock-based).
  useEffect(() => {
    if (!isActive) return;
    setTimeOfDay(computeTimeOfDay(new Date(), prefersDark));
    const id = setInterval(
      () => setTimeOfDay(computeTimeOfDay(new Date(), prefersDark)),
      5 * 60 * 1000,
    );
    return () => clearInterval(id);
  }, [isActive, prefersDark]);

  // Push time-of-day onto <html> for CSS to consume. Cleaned up
  // whenever the theme switches away so leftover attributes don't
  // tint the next theme.
  useEffect(() => {
    if (!isActive) {
      delete document.documentElement.dataset.greenwoodTime;
      return;
    }
    document.documentElement.dataset.greenwoodTime = timeOfDay;
    return () => {
      delete document.documentElement.dataset.greenwoodTime;
    };
  }, [isActive, timeOfDay]);

  // Caption rotation — every 18 s pick a new caption from the active
  // time-of-day pool. Skip the previous index so consecutive captions
  // never repeat.
  useEffect(() => {
    if (!isActive || reducedMotion) return;
    const id = setInterval(() => {
      setCaptionIdx((prev) => {
        const pool = SCENE_CAPTIONS[timeOfDay];
        if (pool.length <= 1) return 0;
        let next = Math.floor(Math.random() * pool.length);
        let guard = 0;
        while (next === prev && guard++ < 5) {
          next = Math.floor(Math.random() * pool.length);
        }
        return next;
      });
      setCaptionEpoch((e) => e + 1);
    }, 18_000);
    return () => clearInterval(id);
  }, [isActive, reducedMotion, timeOfDay]);

  // Reset caption on time-of-day change so we don't briefly show a
  // dawn observation at 5 pm.
  useEffect(() => {
    setCaptionIdx(0);
    setCaptionEpoch((e) => e + 1);
  }, [timeOfDay]);

  // Pre-randomise leaf + firefly properties at mount. Stable for the
  // lifetime of the component so React keys don't churn and the
  // browser keeps the same composited layers across renders.
  const leaves = useMemo<FallingLeaf[]>(() => {
    // One slot per species (eucalyptus shows as both a slender and a round
    // silver-dollar leaf). 7 leaves over 6 slots = every species appears,
    // oak twice — wind, not a leaf storm.
    const shapes: LeafShape[] = ["oak", "maple", "eucalyptusRound", "elm", "birch", "eucalyptus"];
    // Per-species colour — each tree turns its own way, so the falling set
    // reads true: scarlet maples, gold birch, russet oak, ochre elm, and
    // silvery-sage eucalyptus (which falls fresh, not autumn).
    const palettes: Record<LeafShape, string[]> = {
      oak:             ["#8a4b2a", "#6e3b1f", "#9c5a2e", "#7a3526"],
      maple:           ["#c0392b", "#d35400", "#b5341f", "#cf5b1e"],
      elm:             ["#b98a2e", "#caa13a", "#a8791f", "#bd9433"],
      birch:           ["#e0b32a", "#d4a521", "#ecc23d", "#c89a2a"],
      eucalyptus:      ["#9caf88", "#86a079", "#7f9e84", "#8fa99a"],
      eucalyptusRound: ["#9caf88", "#86a079", "#7f9e84", "#8fa99a"],
    };
    return Array.from({ length: LEAF_COUNT }, (_, i) => {
      const shape = shapes[i % shapes.length];
      const palette = palettes[shape];
      return {
        id: i,
        leftPct: Math.random() * 100,
        delaySec: Math.random() * 22,
        durationSec: 18 + Math.random() * 14,
        startRotation: Math.random() * 360,
        // Sway amplitude — how far the leaf wanders horizontally as it
        // falls. Larger numbers read as more wind.
        swayPx: 60 + Math.random() * 100,
        scale: 0.55 + Math.random() * 0.75,
        shape,
        hue: palette[Math.floor(Math.random() * palette.length)],
        opacity: 0.55 + Math.random() * 0.30,
      };
    });
  }, []);

  const fireflies = useMemo<Firefly[]>(() => {
    return Array.from({ length: FIREFLY_COUNT }, (_, i) => ({
      id: i,
      leftPct: 5 + Math.random() * 90,
      topPct: 12 + Math.random() * 72,
      blinkDelaySec: Math.random() * 5,
      // ~1 in 3 fireflies also drifts laterally
      driftSec: Math.random() < 0.35 ? 14 + Math.random() * 10 : undefined,
    }));
  }, []);

  if (!isActive) return null;

  // Reduced-motion users still get the time-of-day tint (via the
  // html data attribute, set above) but no animation layer.
  if (reducedMotion) return null;

  const pool = SCENE_CAPTIONS[timeOfDay];
  const caption = pool[captionIdx % pool.length];

  return (
    <div
      aria-hidden
      className="greenwood-atmosphere pointer-events-none fixed inset-0 z-[1] overflow-hidden"
    >
      {/* Ground mist — always on, drifts very slowly */}
      <div className="greenwood-mist" />

      {/* Dappled sunlight — only renders mid-day. Two layers of
          warm light patches, each on its own slow drift. */}
      {timeOfDay === "day" && (
        <div className="greenwood-dapples">
          <span className="greenwood-dapple" style={{ top: "10%", left: "16%" }} />
          <span className="greenwood-dapple" style={{ top: "34%", left: "68%" }} />
          <span className="greenwood-dapple" style={{ top: "58%", left: "32%" }} />
          <span className="greenwood-dapple" style={{ top: "78%", left: "80%" }} />
        </div>
      )}

      {/* Falling leaves — autumn drift across the viewport */}
      <div className="greenwood-leaves">
        {leaves.map((leaf) => (
          <span
            key={leaf.id}
            className={`greenwood-leaf greenwood-leaf-${leaf.shape}`}
            style={{
              left: `${leaf.leftPct}%`,
              animationDelay: `${leaf.delaySec}s`,
              animationDuration: `${leaf.durationSec}s`,
              ["--leaf-sway" as string]: `${leaf.swayPx}px`,
              ["--leaf-start-rot" as string]: `${leaf.startRotation}deg`,
              ["--leaf-scale" as string]: leaf.scale,
              color: leaf.hue,
              opacity: leaf.opacity,
            } as React.CSSProperties}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d={LEAF_PATHS[leaf.shape]} />
            </svg>
          </span>
        ))}
      </div>

      {/* Fireflies — only renders at night. Each blinks on its own
          rhythm; a third of them also drift. */}
      {timeOfDay === "night" && (
        <div className="greenwood-fireflies">
          {fireflies.map((f) => (
            <span
              key={f.id}
              className={
                "greenwood-firefly " + (f.driftSec ? "greenwood-firefly-drift" : "")
              }
              style={{
                left: `${f.leftPct}%`,
                top: `${f.topPct}%`,
                animationDelay: `${f.blinkDelaySec}s`,
                ...(f.driftSec
                  ? { ["--firefly-drift-dur" as string]: `${f.driftSec}s` }
                  : {}),
              } as React.CSSProperties}
            />
          ))}
        </div>
      )}

      {/* Scene caption — bottom-right, rotates every 18 s. Each new
          caption gets a fresh React key (via captionEpoch) so the
          CSS fade-in keyframe restarts cleanly. */}
      <div className="greenwood-caption">
        <span aria-hidden className="greenwood-caption-marker" />
        <span key={captionEpoch} className="greenwood-caption-text">
          {caption}
        </span>
      </div>
    </div>
  );
}
