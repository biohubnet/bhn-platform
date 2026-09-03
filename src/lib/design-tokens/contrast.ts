/**
 * WCAG contrast, used to keep the colour dials honest.
 *
 * The editor shows a live ratio beside every ink control, because the
 * failure mode of a colour picker in the hands of someone who is not
 * looking for it is silent: text stays visible on the theme in front of
 * you and drops below AA on one of the other sixteen.
 *
 * Alpha is composited over the surface rather than ignored — --line is
 * rgba(28,28,32,0.08), and treating that as opaque would report a ratio
 * roughly twelve times what you actually see.
 */

export type RGB = readonly [number, number, number];
export type RGBA = readonly [number, number, number, number];

export function parseColor(input: string): RGBA | null {
  const v = input.trim().toLowerCase();

  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(v);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.split("").map((ch) => ch + ch).join("");
    const n = (i: number) => parseInt(h.slice(i, i + 2), 16);
    return [n(0), n(2), n(4), h.length === 8 ? n(6) / 255 : 1];
  }

  const rgb = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*([0-9.]+)\s*)?\)$/.exec(v);
  if (rgb) {
    const a = rgb[4] === undefined ? 1 : Number(rgb[4]);
    if (!Number.isFinite(a)) return null;
    return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3]), Math.min(1, Math.max(0, a))];
  }
  return null;
}

/** Flattens a translucent colour onto an opaque backdrop. */
export function composite(fg: RGBA, bg: RGB): RGB {
  const a = fg[3];
  return [
    Math.round(fg[0] * a + bg[0] * (1 - a)),
    Math.round(fg[1] * a + bg[1] * (1 - a)),
    Math.round(fg[2] * a + bg[2] * (1 - a)),
  ];
}

export function relativeLuminance([r, g, b]: RGB): number {
  const ch = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
}

/**
 * Ratio between a foreground and a background, both as CSS colour
 * strings. Returns null when either cannot be parsed, so the caller can
 * say nothing rather than print a confident wrong number.
 */
export function contrastRatio(fg: string, bg: string): number | null {
  const f = parseColor(fg);
  const b = parseColor(bg);
  if (f === null || b === null) return null;
  // The backdrop is composited onto white first: a translucent surface
  // over an unknown page still has to resolve to something.
  const bOpaque = composite(b, [255, 255, 255]);
  const fOpaque = composite(f, bOpaque);
  const l1 = relativeLuminance(fOpaque);
  const l2 = relativeLuminance(bOpaque);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}
