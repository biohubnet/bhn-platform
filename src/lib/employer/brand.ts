/**
 * Per-company brand tokens for the employer profile.
 *
 * Drives the hero gradient + accent strip on /employer so the page
 * reads as the company's own brand, not the platform's. The tokens
 * live on `User.companyBrand` as JSON; the discovery endpoint
 * (`POST /api/employer/profile/brand-fetch`) populates them from the
 * homepage; the Edit Profile modal lets the operator tweak.
 *
 * Shape — all optional. The renderer falls back to the platform
 * default for any field that's missing.
 *   {
 *     primary?:    "#RRGGBB"
 *     secondary?:  "#RRGGBB"
 *     accent?:     "#RRGGBB"
 *     style?:      "gradient" | "solid"
 *   }
 */

export interface CompanyBrand {
  primary?: string;
  secondary?: string;
  accent?: string;
  style?: "gradient" | "solid";
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

/** Validate a hex colour. Accepts only six-digit `#RRGGBB`. */
export function isHexColor(s: unknown): s is string {
  return typeof s === "string" && HEX_RE.test(s);
}

/** Parse + sanitise a JSON blob into a `CompanyBrand`. Unknown
 *  fields are dropped; invalid colours are dropped silently. */
export function parseCompanyBrand(raw: unknown): CompanyBrand | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const out: CompanyBrand = {};
  if (isHexColor(o.primary)) out.primary = o.primary;
  if (isHexColor(o.secondary)) out.secondary = o.secondary;
  if (isHexColor(o.accent)) out.accent = o.accent;
  if (o.style === "gradient" || o.style === "solid") out.style = o.style;
  // Empty object → return null so callers can do truthy checks for
  // "is there a brand?" without a separate isEmpty helper.
  if (Object.keys(out).length === 0) return null;
  return out;
}

/** True when the brand has at least a primary colour set — enough to
 *  do something useful at render time. */
export function isUsableBrand(b: CompanyBrand | null): b is CompanyBrand {
  return !!b && !!b.primary;
}

/**
 * CSS for the /employer cover banner when a brand is set. Returns a
 * `background-image` string (multi-stop gradient by default, solid
 * fill when style === "solid"). Caller drops it into the inline
 * style attribute on the banner's base layer.
 */
export function brandHeroBackground(brand: CompanyBrand): string {
  const p = brand.primary ?? "#1e3a8a";
  const s = brand.secondary ?? brand.primary ?? "#312e81";
  const a = brand.accent ?? brand.secondary ?? brand.primary ?? "#831843";
  if (brand.style === "solid") {
    return p;
  }
  return `linear-gradient(135deg, ${p} 0%, ${s} 50%, ${a} 100%)`;
}

/** Pure-CSS contrast-aware text colour for elements painted on top
 *  of the brand primary. Useful for chips / buttons that sit on a
 *  brand-coloured background. */
export function brandReadableOnPrimary(brand: CompanyBrand): "white" | "#0f172a" {
  if (!brand.primary) return "white";
  const m = /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/.exec(brand.primary);
  if (!m) return "white";
  const [r, g, b] = [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
  // Perceptual luminance — same formula the design-system audit uses.
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#0f172a" : "white";
}
