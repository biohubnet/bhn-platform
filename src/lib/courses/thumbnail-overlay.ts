/**
 * Course-thumbnail overlay helper.
 *
 * Admins can layer a colour / gradient wash over any course thumbnail
 * from /admin/course-thumbnails — useful for unifying the look of a
 * mixed catalog without re-running SDXL on every card. The overlay
 * lives in `Course.thumbnailOverlay` as a JSON blob and is rendered
 * client-side as an absolutely-positioned div on top of the
 * underlying `<img>`.
 *
 * Stored shape, parsed/validated by `parseOverlay`:
 *   {
 *     mode: "solid" | "gradient",
 *     color1: "#1e293b",
 *     color2?: "#0f172a",      // gradient endpoint
 *     angle: 135,              // degrees, 0–359
 *     opacity: 0.4,            // 0–1
 *     blendMode?: "multiply",  // CSS mix-blend-mode
 *   }
 */

export type OverlayBlendMode =
  | "normal"
  | "multiply"
  | "overlay"
  | "soft-light"
  | "screen"
  | "darken"
  | "lighten";

export interface ThumbnailOverlay {
  mode: "solid" | "gradient";
  color1: string;
  color2?: string;
  angle: number;
  opacity: number;
  blendMode?: OverlayBlendMode;
}

export const BLEND_MODES: OverlayBlendMode[] = [
  "normal",
  "multiply",
  "overlay",
  "soft-light",
  "screen",
  "darken",
  "lighten",
];

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

/**
 * Validate + normalize an unknown blob into a `ThumbnailOverlay`, or
 * return null if the shape is wrong. Called on both ends — server
 * (before persisting from the API) and client (after reading from
 * Course.thumbnailOverlay JSON).
 */
export function parseOverlay(raw: unknown): ThumbnailOverlay | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  const mode = o.mode === "gradient" ? "gradient" : "solid";
  const color1 = typeof o.color1 === "string" && HEX_RE.test(o.color1) ? o.color1 : null;
  if (!color1) return null;

  const color2 = mode === "gradient" && typeof o.color2 === "string" && HEX_RE.test(o.color2)
    ? o.color2
    : undefined;

  const angle = typeof o.angle === "number" && o.angle >= 0 && o.angle < 360
    ? Math.round(o.angle)
    : 135;
  const opacity = typeof o.opacity === "number" && o.opacity >= 0 && o.opacity <= 1
    ? o.opacity
    : 0.4;

  const blendMode =
    typeof o.blendMode === "string" && (BLEND_MODES as string[]).includes(o.blendMode)
      ? (o.blendMode as OverlayBlendMode)
      : undefined;

  return { mode, color1, color2, angle, opacity, blendMode };
}

/**
 * Convert an overlay to the CSS properties that should be applied to
 * the overlay `<div>`. The div is positioned `absolute inset-0` by the
 * caller; this returns only the colour / opacity / blend properties.
 */
export function overlayStyle(o: ThumbnailOverlay): React.CSSProperties {
  const background =
    o.mode === "gradient" && o.color2
      ? `linear-gradient(${o.angle}deg, ${o.color1}, ${o.color2})`
      : o.color1;
  return {
    background,
    opacity: o.opacity,
    mixBlendMode: o.blendMode ?? "normal",
    pointerEvents: "none",
  };
}

export const DEFAULT_OVERLAY: ThumbnailOverlay = {
  mode: "gradient",
  color1: "#0f172a",
  color2: "#1e3a8a",
  angle: 135,
  opacity: 0.45,
  blendMode: "multiply",
};
