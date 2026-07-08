/** Shared validation between the public showcase submit route and the
 *  admin manual-add route, so both accept exactly the same photo/LinkedIn
 *  rules. */

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_PHOTO_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

export function photoExtFor(contentType: string): string {
  return contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
}

/** Normalise whatever the user typed into a canonical
 *  https://www.linkedin.com/in/<slug>/ URL. Handles:
 *   • "foo"                              → linkedin.com/in/foo
 *   • "linkedin.com/in/foo"              → https://linkedin.com/in/foo
 *   • "https://www.linkedin.com/in/foo/" → kept as-is
 *  Returns null when we can't extract a plausible slug. */
export function normaliseLinkedin(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed.match(/^https?:\/\//) ? trimmed : `https://${trimmed}`);
    if (u.hostname.endsWith("linkedin.com")) {
      const m = u.pathname.match(/^\/in\/([^/?#]+)/i);
      if (m) return `https://www.linkedin.com/in/${m[1]}/`;
      return null;
    }
  } catch { /* not a URL — fall through */ }
  const m = trimmed.match(/^[A-Za-z0-9\-._]{2,100}$/);
  if (m) return `https://www.linkedin.com/in/${trimmed}/`;
  return null;
}
