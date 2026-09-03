/**
 * Runtime-editable design tokens.
 *
 * The platform is being handed to an external developer, so the values
 * most likely to need tuning are lifted out of the codebase and made
 * editable from /admin/design-system/tokens. An override is persisted in
 * PlatformSetting and injected as a `:root` block after globals.css in
 * the root layout, where it wins on cascade. No rebuild, no deploy.
 *
 * WHY THESE TOKENS FIRST
 * Corner radius and the spacing base are the two dials that change how
 * the whole platform feels while being almost impossible to make
 * illegible. Colour is deliberately not here yet: an untrained edit to a
 * foreground or surface can drop text below AA on any of seventeen
 * themes, so it needs contrast guardrails built alongside it.
 *
 * WHY THE RADIUS LADDER LOOKS LIKE THIS
 * Tailwind v4 resolves `rounded-sm` and friends to `var(--radius-sm)`,
 * so redefining these variables retargets every one of the ~3,300
 * radius utilities in the codebase at once. globals.css previously
 * defined only sm / lg / xl per theme, which left `rounded-md`,
 * `rounded-2xl` and `rounded-3xl` on Tailwind's own defaults — unthemed,
 * and out of order: md (6px) rendered SMALLER than sm (10px), and 2xl
 * (16px) smaller than lg (22px). 1,521 usages sat on those. The ladder
 * below is complete and monotonic, which is what makes the scale
 * predictable enough to hand to someone else.
 *
 * NOT included: Tailwind's bare `rounded`, which compiles to a hardcoded
 * 0.25rem and is not wired to any variable. 378 usages still sit on it
 * and cannot be reached from here — see docs/design-tokens.md.
 */

export interface TokenDef {
  /** CSS custom property, without the leading `--`. */
  readonly name: string;
  readonly label: string;
  /** Shipped value for the default (Light) theme, used as the reset target. */
  readonly fallback: number;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly unit: "px" | "rem";
  readonly hint: string;
}

export const RADIUS_TOKENS: readonly TokenDef[] = [
  { name: "radius-xs",  label: "Extra small", fallback: 3,  min: 0, max: 24, step: 1, unit: "px",
    hint: "Tags and the smallest chips." },
  { name: "radius-sm",  label: "Small",       fallback: 6,  min: 0, max: 32, step: 1, unit: "px",
    hint: "Nav links, inline badges." },
  { name: "radius-md",  label: "Medium",      fallback: 10, min: 0, max: 40, step: 1, unit: "px",
    hint: "Buttons, inputs, status pills." },
  { name: "radius-lg",  label: "Large",       fallback: 14, min: 0, max: 48, step: 1, unit: "px",
    hint: "Cards and panels. The most used step on the platform." },
  { name: "radius-xl",  label: "Extra large", fallback: 18, min: 0, max: 56, step: 1, unit: "px",
    hint: "Section boxes and dialogs." },
  { name: "radius-2xl", label: "2XL",         fallback: 24, min: 0, max: 64, step: 1, unit: "px",
    hint: "Hero surfaces and large media." },
  { name: "radius-3xl", label: "3XL",         fallback: 30, min: 0, max: 72, step: 1, unit: "px",
    hint: "The softest corners on the platform." },
] as const;

export const SPACING_TOKENS: readonly TokenDef[] = [
  // Tailwind v4 multiplies every spacing utility off this one value, so
  // p-4 is `calc(var(--spacing) * 4)`. Moving it re-paces the entire
  // platform, which is powerful and easy to overdo — hence the narrow
  // range. 0.25rem is Tailwind's own default and the current behaviour.
  { name: "spacing", label: "Spacing base", fallback: 0.25, min: 0.2, max: 0.32, step: 0.01,
    unit: "rem", hint: "Multiplier behind every padding, margin and gap. Small changes go a long way." },
] as const;

export const ALL_TOKENS: readonly TokenDef[] = [...RADIUS_TOKENS, ...SPACING_TOKENS];

const BY_NAME = new Map(ALL_TOKENS.map((t) => [t.name, t]));

/** A sparse map of token name → numeric value. Absent key = use the theme's own value. */
export type TokenOverrides = Record<string, number>;

/**
 * Drops anything that is not a known token, not finite, or outside the
 * declared range. Overrides arrive from an admin form and are written
 * into a `<style>` block, so this is the boundary that keeps a typo or a
 * hand-edited payload from emitting broken CSS into every page.
 */
export function sanitizeOverrides(input: unknown): TokenOverrides {
  if (input === null || typeof input !== "object") return {};
  const out: TokenOverrides = {};
  for (const [key, raw] of Object.entries(input as Record<string, unknown>)) {
    const def = BY_NAME.get(key);
    if (!def) continue;
    // Numbers and numeric strings only. A bare Number(raw) also accepts
    // booleans, empty strings and any object with a toString — none of
    // which a form or a JSON body should be producing here, and all of
    // which would land a value in the stylesheet that nobody chose.
    const n =
      typeof raw === "number" ? raw
      : typeof raw === "string" && raw.trim() !== "" ? Number(raw)
      : Number.NaN;
    if (!Number.isFinite(n) || n < def.min || n > def.max) continue;
    out[key] = Math.round(n * 100) / 100;
  }
  return out;
}

/**
 * Serialises overrides into a `:root` rule for the document head.
 *
 * Returns "" when there is nothing to override so the layout can skip
 * the element entirely rather than shipping an empty tag on every page.
 * Values are numbers that have already cleared sanitizeOverrides, and
 * the unit comes from the registry, so nothing user-supplied reaches the
 * stylesheet as text.
 */
export function overridesToCss(overrides: TokenOverrides): string {
  const decls = ALL_TOKENS
    .filter((t) => overrides[t.name] !== undefined)
    .map((t) => `--${t.name}:${overrides[t.name]}${t.unit}`);
  return decls.length === 0 ? "" : `:root{${decls.join(";")}}`;
}
