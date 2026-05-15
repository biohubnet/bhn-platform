/**
 * Pan + zoom transform applied to the company logo within its shape
 * mask. The transform lives on `User.companyLogoTransform` as JSON
 * and is consumed by every surface that renders the logo so the
 * cropping is consistent (admin's brand-stage hero on /employer, the
 * preview tile in the modal, the mini-cropper itself).
 *
 * Coordinate model
 *   Offsets are CSS pixels relative to the container's centre. The
 *   image is rendered at the container's size (object-cover or
 *   object-contain depending on the chosen shape); we then apply a
 *   `scale()` + `translate()` to nudge it. transform-origin sits at
 *   the container's centre so the scale grows out from the middle.
 *
 * Default
 *   `{ offsetX: 0, offsetY: 0, scale: 1 }` — image sits centred at
 *   its natural fit. Anything not matching the shape is identical
 *   to the previous behaviour.
 */
export interface LogoTransform {
  offsetX: number;
  offsetY: number;
  scale: number;
}

export const DEFAULT_LOGO_TRANSFORM: LogoTransform = {
  offsetX: 0,
  offsetY: 0,
  scale: 1,
};

/** Parse + clamp an unknown blob into a safe `LogoTransform`. */
export function parseLogoTransform(raw: unknown): LogoTransform {
  if (!raw || typeof raw !== "object") return DEFAULT_LOGO_TRANSFORM;
  const o = raw as Record<string, unknown>;
  const numOr = (v: unknown, fallback: number) =>
    typeof v === "number" && Number.isFinite(v) ? v : fallback;

  const offsetX = numOr(o.offsetX, 0);
  const offsetY = numOr(o.offsetY, 0);
  // Scale must be positive and reasonable. Clamp to [0.1, 8] so a
  // bad value can't make the image vanish or eat the page.
  const rawScale = numOr(o.scale, 1);
  const scale = Math.min(Math.max(rawScale, 0.1), 8);

  return { offsetX, offsetY, scale };
}

/** True when the transform is effectively the identity (no crop /
 *  reposition needed). Render helpers can short-circuit and skip the
 *  CSS transform property when this is true. */
export function isIdentityTransform(t: LogoTransform): boolean {
  return t.offsetX === 0 && t.offsetY === 0 && t.scale === 1;
}

/** CSS transform string. Centres the origin at the container so the
 *  scale grows symmetrically (translate before scale would shift the
 *  image based on its scaled size, which makes panning feel jittery). */
export function logoTransformCss(t: LogoTransform): string {
  return `translate(${t.offsetX}px, ${t.offsetY}px) scale(${t.scale})`;
}
